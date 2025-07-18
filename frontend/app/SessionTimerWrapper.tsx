'use client'

import { useCustomSessionTimer } from './useCustomSessionTimer'

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  useCustomSessionTimer()
  return <>{children}</>
}
