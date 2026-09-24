'use client'

import React from 'react'
import { AuthProvider } from '@/context/AuthContext'
import { HouseholdProvider } from '@/context/HouseholdContext'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <HouseholdProvider>{children}</HouseholdProvider>
    </AuthProvider>
  )
}
