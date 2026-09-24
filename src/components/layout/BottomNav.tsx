'use client'

import React from 'react'
import { Utensils, ShoppingBag, PlusCircle, PieChart } from 'lucide-react'

export type TabType = 'meals' | 'shopping' | 'expense' | 'budget'

interface BottomNavProps {
  currentTab: TabType
  onTabChange: (tab: TabType) => void
  shoppingItemsCount?: number
}

export function BottomNav({
  currentTab,
  onTabChange,
  shoppingItemsCount = 0,
}: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF]/90 backdrop-blur-2xl border-t border-[#E5E5EA] pb-safe">
      <div className="max-w-md mx-auto h-[50px] px-4 flex items-center justify-around">
        {/* Onglet Menus (Planning & Idées) */}
        <button
          onClick={() => onTabChange('meals')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 transition-colors select-none ${
            currentTab === 'meals'
              ? 'text-[#007AFF]'
              : 'text-[#8E8E93] hover:text-[#1C1C1E]'
          }`}
        >
          <Utensils
            className="w-[21px] h-[21px]"
            strokeWidth={currentTab === 'meals' ? 2.4 : 1.8}
          />
          <span className="text-[10px] font-medium tracking-tight">Menus</span>
        </button>

        {/* Onglet Courses */}
        <button
          onClick={() => onTabChange('shopping')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 transition-colors select-none ${
            currentTab === 'shopping'
              ? 'text-[#007AFF]'
              : 'text-[#8E8E93] hover:text-[#1C1C1E]'
          }`}
        >
          <div className="relative">
            <ShoppingBag
              className="w-[21px] h-[21px]"
              strokeWidth={currentTab === 'shopping' ? 2.4 : 1.8}
            />
            {shoppingItemsCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#FF3B30] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-3.5 text-center leading-tight shadow-xs">
                {shoppingItemsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium tracking-tight">Courses</span>
        </button>

        {/* Onglet Dépense */}
        <button
          onClick={() => onTabChange('expense')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 transition-colors select-none ${
            currentTab === 'expense'
              ? 'text-[#007AFF]'
              : 'text-[#8E8E93] hover:text-[#1C1C1E]'
          }`}
        >
          <PlusCircle
            className="w-[22px] h-[22px]"
            strokeWidth={currentTab === 'expense' ? 2.4 : 1.8}
          />
          <span className="text-[10px] font-medium tracking-tight">Dépense</span>
        </button>

        {/* Onglet Budget */}
        <button
          onClick={() => onTabChange('budget')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 transition-colors select-none ${
            currentTab === 'budget'
              ? 'text-[#007AFF]'
              : 'text-[#8E8E93] hover:text-[#1C1C1E]'
          }`}
        >
          <PieChart
            className="w-[21px] h-[21px]"
            strokeWidth={currentTab === 'budget' ? 2.4 : 1.8}
          />
          <span className="text-[10px] font-medium tracking-tight">Budget</span>
        </button>
      </div>
    </nav>
  )
}
