'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { Header } from '@/components/layout/Header'
import { BottomNav, TabType } from '@/components/layout/BottomNav'
import { MealsView } from '@/components/meals/MealsView'
import { ShoppingView } from '@/components/shopping/ShoppingView'
import { AddExpenseView } from '@/components/expenses/AddExpenseView'
import { BudgetView } from '@/components/budget/BudgetView'
import { HouseholdSetup } from '@/components/household/HouseholdSetup'
import { Loader2 } from 'lucide-react'

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth()
  const { household, isLoading: householdLoading } = useHousehold()
  const router = useRouter()

  // Onglet principal par défaut : Menus de la semaine
  const [currentTab, setCurrentTab] = useState<TabType>('meals')

  if (authLoading || (user && householdLoading)) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center text-[#1C1C1E]">
        <Loader2 className="w-8 h-8 text-[#007AFF] animate-spin mb-3" />
        <p className="text-[#8E8E93] text-xs font-semibold tracking-wide">
          Chargement du foyer...
        </p>
      </div>
    )
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      router.push('/login')
    }
    return null
  }

  if (!household) {
    return <HouseholdSetup />
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-[#1C1C1E] flex flex-col selection:bg-[#007AFF]/20">
      {/* Top Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-2">
        {currentTab === 'meals' && <MealsView />}
        {currentTab === 'shopping' && <ShoppingView />}
        {currentTab === 'expense' && (
          <AddExpenseView onSuccess={() => setCurrentTab('budget')} />
        )}
        {currentTab === 'budget' && <BudgetView />}
      </main>

      {/* Native iOS Bottom Tab Bar */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
      />
    </div>
  )
}
