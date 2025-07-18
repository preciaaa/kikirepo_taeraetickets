'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import  FaceVerification from '@/components/ui/face-verification'
import Webcam from 'react-webcam'
import { cn } from '@/lib/utils'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { apiRoutes } from '@/lib/apiRoutes';

export default function VerificationPage() {
  const webcamRef = useRef<Webcam>(null)
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [next, setNext] = useState<boolean>(false)
  const [match, setMatch] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [startVerification, setStartVerification] = useState(false)
  const [timer, setTimer] = useState(0)
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user) setUserId(data.user.id)
    }
    fetchUser()
  }, [])

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      setMatch(null)
      setError(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    multiple: false,
    maxFiles: 1,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png']
    }
  })

  const handleNext = async () => {
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data?.user) throw new Error("Failed to get user.")
      const userId = data.user.id

      const formData = new FormData()
      formData.append('file', file)
      formData.append('user_id', userId)

      const response = await fetch(apiRoutes.extractEmbedding, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Failed to extract embedding.')

      const responseData = await response.json()
      setNext(true)
      setStartVerification(true) // <- Start webcam verification loop
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  // Live face verification loop
  useEffect(() => {
    let interval: NodeJS.Timeout
    let timeout: NodeJS.Timeout

    const runVerification = async () => {
      const screenshot = webcamRef.current?.getScreenshot()
      if (!screenshot) return

      try {
        const blob = await fetch(screenshot).then(res => res.blob())
        const file = new File([blob], 'live.jpg', { type: 'image/jpeg' })
        const formData = new FormData()
        formData.append('file', file)

        const { data, error } = await supabase.auth.getUser()
        if (error || !data?.user) return
        const userId = data.user.id
        formData.append('user_id', userId)
        console.log('Screenshot length:', screenshot?.length)


        // Compare faces
        const compareRes = await fetch(apiRoutes.compareFaces, {
          method: 'POST',
          body: formData,
        })

        if (!compareRes.ok) return
        const result = await compareRes.json()

        if (result.match) {
          setMatch(true)
          setStartVerification(false)
          clearInterval(interval)
          clearTimeout(timeout)
        }
      } catch (err) {
        console.error(err)
      }
    }

    if (startVerification) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1)
        runVerification()
      }, 1000)

      timeout = setTimeout(() => {
        clearInterval(interval)
        setStartVerification(false)
        setMatch(false)
        setShowTimeoutWarning(true)
      }, 15000)
    }

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [startVerification])

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-4xl font-bold mb-4">Verification</h1>
      {next ? (
        <div className="space-y-4">
        <FaceVerification
          userId={userId ?? undefined} 
          onSuccess={() => router.push('/profile')}
          onFailure={() => {
            setStartVerification(false)
            setNext(false)
            setMatch(null)
            setShowTimeoutWarning(true)
          }}
        />
      </div>
      ) : (
        <div>
          <h2 className="text-3xl font-semibold mb-4">Upload an identification picture</h2>
          <Card className="w-full max-w-md p-6">
            <CardContent>
              <div
                {...getRootProps()}
                className={cn(
                  'border border-dashed border-gray-400 rounded-md p-6 text-center cursor-pointer',
                  isDragActive ? 'bg-accent' : 'bg-background'
                )}
              >
                <input {...getInputProps()} />
                <p className="text-muted-foreground">
                  {isDragActive ? 'Drop the file here...' : 'Drag and drop a file here, or click to select one'}
                </p>
              </div>

              {file && (
                <div className="mt-4">
                  <p className="text-sm font-medium">Selected file:</p>
                  <p className="text-muted-foreground">{file.name}</p>
                </div>
              )}

              {fileRejections.length > 0 && (
                <p className="text-red-500 mt-2 text-sm">Only one file is allowed.</p>
              )}

              {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
              {loading && <p className="text-sm text-muted-foreground mt-2">Processing image...</p>}

              <Button className="mt-4 w-full" disabled={!file || loading} onClick={handleNext}>
                Next
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
