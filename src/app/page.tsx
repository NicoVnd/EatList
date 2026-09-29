'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { createClient } from '@/lib/supabase/client'
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
  const supabase = createClient()

  // Onglet principal par défaut : Menus de la semaine
  const [currentTab, setCurrentTab] = useState<TabType>('meals')
  const [shoppingCount, setShoppingCount] = useState<number>(0)

  // Écouteur en direct du nombre d'articles de courses à acheter pour le badge du BottomNav
  useEffect(() => {
    if (!household) return

    const fetchCount = async () => {
      try {
        const { count, error } = await supabase
          .from('shopping_items')
          .select('*', { count: 'exact', head: true })
          .eq('household_id', household.id)
          .eq('checked', false)

        if (!error && count !== null) {
          setShoppingCount(count)
        }
      } catch {
        // Ignorer
      }
    }

    fetchCount()

    const channel = supabase
      .channel(`shopping_counter_${household.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_items',
          filter: `household_id=eq.${household.id}`,
        },
        () => {
          fetchCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [household, supabase])

  if (authLoading || (user && householdLoading)) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-7 h-7 text-[#F97316] animate-spin mb-3" />
        <p className="text-[#78716C] text-sm font-medium">
          Chargement...
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
    <div className="min-h-screen bg-[#FFFDF9] text-[#1C1917] flex flex-col selection:bg-[#F97316]/20">
      {/* Top Header */}
      <Header />

      {/* Zone de contenu principale */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-2">
        {currentTab === 'meals' && <MealsView />}
        {currentTab === 'shopping' && <ShoppingView />}
        {currentTab === 'expense' && (
          <AddExpenseView onSuccess={() => setCurrentTab('budget')} />
        )}
        {currentTab === 'budget' && <BudgetView />}
      </main>

      {/* Barre de navigation */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        shoppingItemsCount={shoppingCount}
      />
    </div>
  )
}
