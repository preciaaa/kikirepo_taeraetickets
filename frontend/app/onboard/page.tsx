'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { apiRoutes } from '@/lib/apiRoutes';

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/auth/login') // redirect if not logged in
        return
      }
      setUserId(session.user.id)
    }
    fetchUser()
  }, [router])

  const handleCreateStripeAccount = async () => {
    if (!userId) return
    setLoading(true)
    setError(null)

    try {
      // Adjust this URL if your backend runs elsewhere
      const response = await fetch(apiRoutes.createStripeAccount, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (response.ok && data.url) {
        window.location.href = data.url // Redirect to Stripe onboarding
      } else {
        setError(data.error || 'Failed to create Stripe account')
      }
    } catch (err: any) {
      setError('Unexpected error: ' + err.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-[calc(100vh-69px)] flex flex-col items-center justify-center bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-6">Connect Your Stripe Account</h1>
      <p className="mb-6 max-w-md text-center">
        To sell tickets and receive payouts, you need to connect your Stripe account.
      </p>
      {error && <p className="mb-4 text-red-600">{error}</p>}
      <Button
        onClick={handleCreateStripeAccount}
        disabled={loading || !userId}
        className="px-8 py-3 text-lg"
      >
        {loading ? 'Creating Account...' : 'Create Stripe Account'}
      </Button>
    </div>
  )
}
