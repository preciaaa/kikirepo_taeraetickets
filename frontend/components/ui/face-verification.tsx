'use client'

import React, { useEffect, useRef, useState } from 'react'
import Webcam from 'react-webcam'
import { Button } from '@/components/ui/button'
import { createClient } from '@supabase/supabase-js'
import { apiRoutes } from '@/lib/apiRoutes';

type FaceVerificationProps = {
  userId?: string
  onSuccess?: () => void
  onFailure?: () => void
  compareEndpoint?: string
}

export default function FaceVerification({
  userId,
  onSuccess,
  onFailure,
  compareEndpoint = apiRoutes.compareFacesCustom(),
}: FaceVerificationProps) {
  const webcamRef = useRef<Webcam>(null)
  const [match, setMatch] = useState<boolean | null>(null)
  const [startVerification, setStartVerification] = useState(true)
  const [timer, setTimer] = useState(0)
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)
  const [loading, setLoading] = useState(true)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

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

        let uid = userId

        if (!uid) {
          const { data, error } = await supabase.auth.getUser()
          if (error || !data?.user) return
          uid = data.user.id
        }

        if (!uid) {
            console.error('User ID not found, cannot continue.')
            setStartVerification(false)
            setShowTimeoutWarning(true)
            onFailure?.()
            return
          }
          
        formData.append('user_id', uid)

        const res = await fetch(compareEndpoint, {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) return

        const result = await res.json()

        if (result.match) {
          setMatch(true)
          setStartVerification(false)
          clearInterval(interval)
          clearTimeout(timeout)
          setTimeout(() => {
            onSuccess?.()
          }, 2000)
        }
      } catch (err) {
        console.error('Face verification failed:', err)
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
        setTimeout(() => {
            onFailure?.()
          }, 2000)
      }, 10000)
    }

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [startVerification])

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <div className="relative aspect-video rounded-md overflow-hidden border">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          className="w-full h-full object-cover"
        />
        {match && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="bg-background/80 backdrop-blur-sm border border-green-500 rounded-xl p-6">
              <span className="text-green-600 text-4xl">✅ Verified</span>
            </div>
          </div>
        )}
      </div>

      {!match && showTimeoutWarning && (
        <div className="text-red-600 text-center">
          ❌ Could not verify in time. Please try again.
          <Button
            onClick={() => {
              setStartVerification(true)
              setShowTimeoutWarning(false)
              setTimer(0)
              setMatch(null)
            }}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  )
}
