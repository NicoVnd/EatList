'use client'

import React from 'react'
import { Utensils, ShoppingBag, PlusCircle, PieChart } from 'lucide-react'

export type TabType = 'meals' | 'shopping' | 'expense' | 'budget'

interface BottomNavProps {
  currentTab: TabType
  onTabChange: (tab: TabType) => void
  shoppingItemsCount?: number
}

interface NavItem {
  id: TabType
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  badgeCount?: number
}

export function BottomNav({
  currentTab,
  onTabChange,
  shoppingItemsCount = 0,
}: BottomNavProps) {
  const navItems: NavItem[] = [
    {
      id: 'meals',
      label: 'Menus',
      icon: Utensils,
    },
    {
      id: 'shopping',
      label: 'Courses',
      icon: ShoppingBag,
      badgeCount: shoppingItemsCount,
    },
    {
      id: 'expense',
      label: 'Dépense',
      icon: PlusCircle,
    },
    {
      id: 'budget',
      label: 'Budget',
      icon: PieChart,
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[#E7E5E4]">
      <div className="max-w-md w-full mx-auto h-[52px] grid grid-cols-4 items-center">
        {navItems.map((item) => {
          const isActive = currentTab === item.id
          const Icon = item.icon

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`h-full flex flex-col items-center justify-center transition-colors select-none group focus:outline-none ${
                isActive
                  ? 'text-[#F97316]'
                  : 'text-[#A8A29E] hover:text-[#1C1917]'
              }`}
            >
              <div className="w-5 h-5 flex items-center justify-center relative">
                <Icon
                  className="w-5 h-5 transition-transform group-active:scale-90"
                  strokeWidth={isActive ? 2.4 : 1.7}
                />

                {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-[#F97316] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center leading-none pointer-events-none">
                    {item.badgeCount}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] tracking-tight leading-none mt-1 transition-all ${
                  isActive ? 'font-bold' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
