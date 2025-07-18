'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import ReCAPTCHA from "react-google-recaptcha"

export default function SignIn() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true) // Initial check for session
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (session) {
        localStorage.setItem('customSessionStart', Date.now().toString())
        window.location.href = '/events' 
      } else {
        setLoading(false) // ✅ Set to false only if not logged in
      }

      if (error) {
        console.error('Session check failed:', error.message)
      }
    }

    checkAuth()
  }, [router])

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // ✅ Fetch user and store user_id
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (user) {
        localStorage.setItem('user_id', user.id)
        localStorage.setItem('customSessionStart', Date.now().toString())
        window.location.href = '/events'
      } else {
        console.error('User fetch error:', userError?.message)
        setError('Signed in, but failed to get user info.')
        setLoading(false)
      }
    }
  }

  const redirectSignup = async () => {
    // router.push('/auth/signup')
    window.location.href = '/auth/signup'
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="min-h-[calc(100vh-69px)] flex items-center justify-center bg-gradient-to-b from-yellow-50 to-white">
      <div className="w-full max-w-md bg-white/90 rounded-2xl shadow-xl p-8 border border-gray-200">
        <h1 className="text-3xl font-bold mb-6 text-center">Sign In</h1>
        <form onSubmit={handleSignIn}>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 text-base h-12 px-4"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 text-base h-12 px-4"
          />
          <div className="mb-4 flex justify-left">
            <ReCAPTCHA
              sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
              onChange={(token) => setRecaptchaToken(token)}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-12 text-base font-semibold">
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
          {error && <p className="mt-4 text-sm text-center">{error}</p>}
        </form>
        <div className="mt-6 text-center text-base">
          Don&apos;t have an account?{' '}
          <Button variant="link" onClick={redirectSignup} className="text-blue-500 underline inline-flex p-0 align-baseline text-base">
            Sign up
          </Button>
        </div>
      </div>
    </div>
  )
}
