'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'


const SESSION_DURATION = 30 * 60 * 1000 // 30 mins
const WARNING_THRESHOLD = 5 * 60 * 1000 // 5 mins

// const SESSION_DURATION = 1 * 60 * 1000 // 1 minute
// const WARNING_THRESHOLD = 30 * 1000 // 30 seconds

export const useCustomSessionTimer = () => {
    const router = useRouter()

    useEffect(() => {
        const startStr = localStorage.getItem('customSessionStart')
        // console.log('SessionTimerWrapper mounted, startStr:', startStr)

        if (!startStr) return

        const start = parseInt(startStr, 10)
        if (isNaN(start)) {
            localStorage.removeItem('customSessionStart')
            return
        }

        let warned = false // flag to ensure alert fires once

        const interval = setInterval(() => {
            const now = Date.now()
            const elapsed = now - start
            const remaining = SESSION_DURATION - elapsed

            // console.log('Time remaining (ms):', remaining)

            if (remaining <= WARNING_THRESHOLD && remaining > 0 && !warned) {
                toast.warning('Your session will expire in 5 minutes!')
                warned = true
              }

            if (remaining <= 0) {
                console.log('Session expired, logging out')
                clearInterval(interval)
                supabase.auth.signOut()
                localStorage.removeItem('user_id');
                localStorage.removeItem('customSessionStart')
                localStorage.removeItem('hasReloadedAfterSignup')
                router.push('/auth/login')
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [router])
}

