'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Expense } from '@/types/app'
import { useHousehold } from '@/context/HouseholdContext'
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  PieChart,
  Loader2,
  Calendar,
  BarChart3,
  TrendingUp,
  Award,
  ShoppingBag,
  ArrowRight,
  Scale,
  Sparkles,
  Store,
} from 'lucide-react'

const MONTH_NAMES_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
]

const MONTH_SHORT_FR = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Aoû',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
]

export function BudgetView() {
  const { household, members } = useHousehold()
  const supabase = createClient()

  // Mode d'affichage : Mois ou Année
  const [budgetMode, setBudgetMode] = useState<'month' | 'year'>('month')

  // Date sélectionnée pour le mode Mois
  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  // Année sélectionnée pour le mode Année
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  // Dépenses mensuelles (mode Mois)
  const [monthlyExpenses, setMonthlyExpenses] = useState<Expense[]>([])
  const [monthlyLoading, setMonthlyLoading] = useState<boolean>(true)

  // Dépenses annuelles (mode Année)
  const [annualExpenses, setAnnualExpenses] = useState<Expense[]>([])
  const [annualLoading, setAnnualLoading] = useState<boolean>(true)

  // Mois sélectionné dans le graphique annuel (index 0-11)
  const [selectedChartMonth, setSelectedChartMonth] = useState<number | null>(
    new Date().getFullYear() === selectedYear ? new Date().getMonth() : null
  )

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.user_id, m.user?.name || 'Membre'])),
    [members]
  )

  const memberColors = ['#F97316', '#8B5CF6', '#F59E0B', '#22C55E']

  const formatEuro = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // =========================================================================
  // GESTION MODE MOIS
  // =========================================================================
  const prevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const monthYearLabel = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  }).format(currentDate)

  const fetchMonthlyExpenses = useCallback(async () => {
    if (!household) return
    setMonthlyLoading(true)

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const startDate = new Date(year, month, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('household_id', household.id)
        .gte('purchased_at', startDate)
        .lte('purchased_at', endDate)
        .order('purchased_at', { ascending: false })

      if (!error && data) {
        setMonthlyExpenses(data as Expense[])
      }
    } catch (err) {
      console.error('Erreur chargement dépenses mois:', err)
    } finally {
      setMonthlyLoading(false)
    }
  }, [household, currentDate, supabase])

  useEffect(() => {
    fetchMonthlyExpenses()
  }, [fetchMonthlyExpenses])

  const deleteExpense = async (id: string) => {
    setMonthlyExpenses((prev) => prev.filter((e) => e.id !== id))
    setAnnualExpenses((prev) => prev.filter((e) => e.id !== id))
    try {
      await supabase.from('expenses').delete().eq('id', id)
    } catch (err) {
      console.error('Erreur suppression dépense:', err)
      fetchMonthlyExpenses()
      if (budgetMode === 'year') fetchAnnualExpenses()
    }
  }

  const monthlyTotal = useMemo(
    () => monthlyExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0),
    [monthlyExpenses]
  )

  const monthlyMemberTotals = useMemo(() => {
    const totals: { [userId: string]: number } = {}
    members.forEach((m) => {
      totals[m.user_id] = 0
    })
    monthlyExpenses.forEach((e) => {
      totals[e.paid_by] = (totals[e.paid_by] || 0) + Number(e.amount)
    })
    return totals
  }, [members, monthlyExpenses])

  // Calcul du règlement / équilibre
  const settlementInfo = useMemo(() => {
    if (members.length !== 2 || monthlyTotal === 0) return null
    const [m1, m2] = members
    const t1 = monthlyMemberTotals[m1.user_id] || 0
    const t2 = monthlyMemberTotals[m2.user_id] || 0
    const idealPerPerson = monthlyTotal / 2
    const diff = Math.abs(t1 - idealPerPerson)

    if (diff < 0.5) {
      return {
        balanced: true,
        message: 'Les dépenses sont parfaitement équilibrées (50 / 50)',
      }
    }

    const debtor = t1 < t2 ? m1 : m2
    const creditor = t1 < t2 ? m2 : m1
    return {
      balanced: false,
      debtorName: debtor.user?.name || 'Membre',
      creditorName: creditor.user?.name || 'Membre',
      amount: diff,
      message: `${debtor.user?.name || 'Membre'} doit ${formatEuro(diff)} à ${
        creditor.user?.name || 'Membre'
      }`,
    }
  }, [members, monthlyTotal, monthlyMemberTotals])

  // Top enseignes du mois
  const monthlyTopStores = useMemo(() => {
    const storeMap = new Map<string, { total: number; count: number }>()
    monthlyExpenses.forEach((exp) => {
      const amount = Number(exp.amount)
      const raw = (exp.description || 'Courses').trim()
      const name = raw.charAt(0).toUpperCase() + raw.slice(1)
      const curr = storeMap.get(name) || { total: 0, count: 0 }
      storeMap.set(name, { total: curr.total + amount, count: curr.count + 1 })
    })
    return Array.from(storeMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
  }, [monthlyExpenses])

  // Moyenne panier du mois
  const averageMonthlyExpense =
    monthlyExpenses.length > 0 ? monthlyTotal / monthlyExpenses.length : 0

  // =========================================================================
  // GESTION MODE ANNÉE
  // =========================================================================
  const prevYear = () => {
    setSelectedYear((y) => y - 1)
  }

  const nextYear = () => {
    setSelectedYear((y) => y + 1)
  }

  const fetchAnnualExpenses = useCallback(async () => {
    if (!household) return
    setAnnualLoading(true)

    const startDate = `${selectedYear}-01-01`
    const endDate = `${selectedYear}-12-31`

    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('household_id', household.id)
        .gte('purchased_at', startDate)
        .lte('purchased_at', endDate)
        .order('purchased_at', { ascending: false })

      if (!error && data) {
        setAnnualExpenses(data as Expense[])
      }
    } catch (err) {
      console.error('Erreur chargement dépenses année:', err)
    } finally {
      setAnnualLoading(false)
    }
  }, [household, selectedYear, supabase])

  useEffect(() => {
    if (budgetMode === 'year') {
      fetchAnnualExpenses()
    }
  }, [budgetMode, fetchAnnualExpenses])

  const annualStats = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      index: i,
      name: MONTH_NAMES_FR[i],
      shortName: MONTH_SHORT_FR[i],
      total: 0,
      count: 0,
    }))

    const memberTotals: { [userId: string]: number } = {}
    members.forEach((m) => {
      memberTotals[m.user_id] = 0
    })

    const storeMap = new Map<string, { total: number; count: number }>()

    annualExpenses.forEach((exp) => {
      const amount = Number(exp.amount)
      const date = new Date(exp.purchased_at)
      const mIdx = date.getMonth()

      if (mIdx >= 0 && mIdx < 12) {
        months[mIdx].total += amount
        months[mIdx].count += 1
      }

      memberTotals[exp.paid_by] = (memberTotals[exp.paid_by] || 0) + amount

      const rawStore = (exp.description || 'Courses').trim()
      const storeName = rawStore.charAt(0).toUpperCase() + rawStore.slice(1)
      const currStore = storeMap.get(storeName) || { total: 0, count: 0 }
      storeMap.set(storeName, {
        total: currStore.total + amount,
        count: currStore.count + 1,
      })
    })

    const total = months.reduce((acc, m) => acc + m.total, 0)
    const totalTransactions = annualExpenses.length

    const isCurrentYear = new Date().getFullYear() === selectedYear
    const elapsedMonths = isCurrentYear ? Math.max(1, new Date().getMonth() + 1) : 12
    const averagePerMonth = total / elapsedMonths
    const averagePerExpense = totalTransactions > 0 ? total / totalTransactions : 0

    const maxMonth = [...months].sort((a, b) => b.total - a.total)[0]
    const monthsWithSpend = months.filter((m) => m.total > 0)
    const minMonth =
      monthsWithSpend.length > 0
        ? [...monthsWithSpend].sort((a, b) => a.total - b.total)[0]
        : null

    const maxChartValue = Math.max(...months.map((m) => m.total), 1)

    const topStores = Array.from(storeMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4)

    return {
      months,
      total,
      totalTransactions,
      averagePerMonth,
      averagePerExpense,
      maxMonth,
      minMonth,
      maxChartValue,
      memberTotals,
      topStores,
    }
  }, [annualExpenses, members, selectedYear])

  const jumpToMonth = (monthIndex: number) => {
    setCurrentDate(new Date(selectedYear, monthIndex, 1))
    setBudgetMode('month')
  }

  return (
    <div className="space-y-4 tabbar-offset">
      {/* Header */}
      <div className="pt-1 pb-0.5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1C1917]">
            Budget
          </h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            {budgetMode === 'month'
              ? 'Dépenses & équilibre du foyer'
              : `Bilan & statistiques de l'année ${selectedYear}`}
          </p>
        </div>

        {/* Sélecteur de période */}
        {budgetMode === 'month' ? (
          <div className="flex items-center bg-white border border-[#E7E5E4] rounded-full p-0.5">
            <button
              onClick={prevMonth}
              aria-label="Mois précédent"
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#A8A29E] hover:text-[#1C1917] active:bg-[#F5F5F4] transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-[#1C1917] capitalize px-2.5">
              {monthYearLabel}
            </span>
            <button
              onClick={nextMonth}
              aria-label="Mois suivant"
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#A8A29E] hover:text-[#1C1917] active:bg-[#F5F5F4] transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center bg-white border border-[#E7E5E4] rounded-full p-0.5">
            <button
              onClick={prevYear}
              aria-label="Année précédente"
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#A8A29E] hover:text-[#1C1917] active:bg-[#F5F5F4] transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-[#1C1917] px-2.5">
              {selectedYear}
            </span>
            <button
              onClick={nextYear}
              aria-label="Année suivante"
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#A8A29E] hover:text-[#1C1917] active:bg-[#F5F5F4] transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Segmented Control : Mois vs Année */}
      <div className="grid grid-cols-2 p-1 bg-[#F5F5F4] border border-[#E7E5E4] rounded-2xl">
        <button
          onClick={() => setBudgetMode('month')}
          className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition select-none ${
            budgetMode === 'month'
              ? 'bg-white text-[#1C1917] shadow-sm'
              : 'text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Mois</span>
        </button>
        <button
          onClick={() => setBudgetMode('year')}
          className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition select-none ${
            budgetMode === 'year'
              ? 'bg-white text-[#1C1917] shadow-sm'
              : 'text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Année ({selectedYear})</span>
        </button>
      </div>

      {/* ================================================================= */}
      {/* VUE 1 : BUDGET MENSUEL                                            */}
      {/* ================================================================= */}
      {budgetMode === 'month' && (
        <div className="space-y-4">
          {/* Hero Card : Solde total & métriques */}
          <div className="bg-white rounded-2xl p-6 border border-[#E7E5E4] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">
                Total dépensé ce mois-ci
              </span>
              <span className="text-xs font-semibold text-[#78716C] bg-[#F5F5F4] px-2.5 py-0.5 rounded-full">
                {monthlyExpenses.length} achat{monthlyExpenses.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="text-4xl font-extrabold text-[#1C1917] tracking-tight">
              {formatEuro(monthlyTotal)}
            </div>

            {/* Micro métriques */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#F5F5F4]">
              <div>
                <div className="text-[11px] text-[#A8A29E]">Panier moyen</div>
                <div className="text-sm font-bold text-[#1C1917]">
                  {formatEuro(averageMonthlyExpense)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#A8A29E]">Rythme moyen</div>
                <div className="text-sm font-bold text-[#1C1917]">
                  {formatEuro(monthlyTotal / 4)}{' '}
                  <span className="text-[10px] text-[#A8A29E] font-normal">/ sem.</span>
                </div>
              </div>
            </div>
          </div>

          {/* ÉQUILIBRE DU FOYER & RÈGLEMENT */}
          {members.length > 1 && (
            <div className="bg-white rounded-2xl p-5 border border-[#E7E5E4] space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">
                  <Scale className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>Équilibre du foyer</span>
                </div>
                {settlementInfo?.balanced && (
                  <span className="text-[10px] font-bold text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded-full">
                    50 / 50
                  </span>
                )}
              </div>

              {/* Callout de règlement */}
              {settlementInfo && (
                <div
                  className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold border ${
                    settlementInfo.balanced
                      ? 'bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]'
                      : 'bg-[#F97316]/10 border-[#F97316]/20 text-[#F97316]'
                  }`}
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>{settlementInfo.message}</span>
                </div>
              )}

              {/* Barres de répartition individuelles */}
              <div className="space-y-3 pt-1">
                {members.map((m, idx) => {
                  const memberTotal = monthlyMemberTotals[m.user_id] || 0
                  const percentage =
                    monthlyTotal > 0
                      ? Math.round((memberTotal / monthlyTotal) * 100)
                      : 0
                  const color = memberColors[idx % memberColors.length]

                  return (
                    <div key={m.user_id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ backgroundColor: color }}
                          >
                            {(m.user?.name || 'M').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-[#1C1917] text-xs">
                            {m.user?.name || 'Membre'}
                          </span>
                        </div>

                        <div className="text-right flex items-baseline gap-2">
                          <span className="font-bold text-[#1C1917] text-sm">
                            {formatEuro(memberTotal)}
                          </span>
                          <span className="text-xs text-[#A8A29E] font-semibold">
                            {percentage}%
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-2 bg-[#F5F5F4] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TOP ENSEIGNES (si plusieurs magasins) */}
          {monthlyTopStores.length > 1 && (
            <div className="bg-white rounded-2xl p-4 border border-[#E7E5E4] space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E] px-1">
                Top enseignes du mois
              </div>
              <div className="space-y-1">
                {monthlyTopStores.map((store) => {
                  const percent =
                    monthlyTotal > 0
                      ? Math.round((store.total / monthlyTotal) * 100)
                      : 0
                  return (
                    <div
                      key={store.name}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-[#FFFDF9] transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#F97316]/10 text-[#F97316] flex items-center justify-center shrink-0">
                          <Store className="w-4 h-4 stroke-[2]" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#1C1917]">
                            {store.name}
                          </div>
                          <div className="text-[10px] text-[#A8A29E]">
                            {store.count} achat{store.count > 1 ? 's' : ''} • {percent}%
                          </div>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-[#1C1917]">
                        {formatEuro(store.total)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TRANSACTION FEED */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E] px-1">
              Historique des dépenses
            </div>

            {monthlyLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-[#F97316] animate-spin" />
              </div>
            ) : monthlyExpenses.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <PieChart className="w-8 h-8 text-[#D6D3D1] mx-auto mb-1" />
                <h3 className="text-sm font-bold text-[#1C1917]">
                  Aucune dépense ce mois-ci
                </h3>
                <p className="text-sm text-[#78716C] max-w-xs mx-auto">
                  Enregistrez un ticket via l&apos;onglet &quot;Dépense&quot; pour
                  suivre votre budget en direct.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E7E5E4] overflow-hidden divide-y divide-[#F5F5F4]">
                {monthlyExpenses.map((expense) => {
                  const payerName = memberMap.get(expense.paid_by) || 'Membre'
                  const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                  }).format(new Date(expense.purchased_at))

                  return (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3.5 hover:bg-[#FFFDF9] transition"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-2xl bg-[#F97316]/10 text-[#F97316] flex items-center justify-center shrink-0">
                          <Store className="w-5 h-5 stroke-[2]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-sm text-[#1C1917] leading-snug truncate">
                            {expense.description || 'Courses'}
                          </div>
                          <div className="text-[11px] text-[#A8A29E] mt-0.5 flex items-center gap-1.5 truncate">
                            <span>{dateFormatted}</span>
                            <span>•</span>
                            <span>Payé par {payerName}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="font-extrabold text-sm text-[#1C1917]">
                          - {formatEuro(expense.amount)}
                        </span>
                        <button
                          onClick={() => deleteExpense(expense.id)}
                          aria-label="Supprimer la dépense"
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[#D6D3D1] hover:text-[#EF4444] active:bg-black/5 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* VUE 2 : BILAN & STATS ANNUELLES                                   */}
      {/* ================================================================= */}
      {budgetMode === 'year' && (
        <div className="space-y-4">
          {annualLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-7 h-7 text-[#F97316] animate-spin" />
            </div>
          ) : (
            <>
              {/* Hero Card : Total Annuel */}
              <div className="bg-white rounded-2xl p-6 border border-[#E7E5E4] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">
                    Total dépensé en {selectedYear}
                  </span>
                  <span className="text-xs font-semibold text-[#78716C] bg-[#F5F5F4] px-2.5 py-0.5 rounded-full">
                    {annualStats.totalTransactions} ticket
                    {annualStats.totalTransactions > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="text-4xl font-extrabold text-[#1C1917] tracking-tight">
                  {formatEuro(annualStats.total)}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#F5F5F4]">
                  <div>
                    <div className="text-[11px] text-[#A8A29E] font-medium">
                      Moyenne mensuelle
                    </div>
                    <div className="text-base font-bold text-[#1C1917] mt-0.5">
                      {formatEuro(annualStats.averagePerMonth)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#A8A29E] font-medium">
                      Panier moyen
                    </div>
                    <div className="text-base font-bold text-[#1C1917] mt-0.5">
                      {formatEuro(annualStats.averagePerExpense)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Record Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl p-3.5 border border-[#E7E5E4]">
                  <div className="flex items-center gap-1.5 text-[#F97316] text-[11px] font-bold uppercase tracking-wider mb-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Mois record</span>
                  </div>
                  <div className="text-sm font-bold text-[#1C1917]">
                    {annualStats.maxMonth && annualStats.maxMonth.total > 0
                      ? annualStats.maxMonth.name
                      : 'Aucun'}
                  </div>
                  <div className="text-xs font-semibold text-[#78716C] mt-0.5">
                    {annualStats.maxMonth && annualStats.maxMonth.total > 0
                      ? formatEuro(annualStats.maxMonth.total)
                      : '0,00 €'}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-3.5 border border-[#E7E5E4]">
                  <div className="flex items-center gap-1.5 text-[#22C55E] text-[11px] font-bold uppercase tracking-wider mb-1">
                    <Award className="w-3.5 h-3.5" />
                    <span>Mois le plus sobre</span>
                  </div>
                  <div className="text-sm font-bold text-[#1C1917]">
                    {annualStats.minMonth ? annualStats.minMonth.name : 'Aucun'}
                  </div>
                  <div className="text-xs font-semibold text-[#78716C] mt-0.5">
                    {annualStats.minMonth
                      ? formatEuro(annualStats.minMonth.total)
                      : '0,00 €'}
                  </div>
                </div>
              </div>

              {/* Graphique interactif des 12 mois */}
              <div className="bg-white rounded-2xl p-5 border border-[#E7E5E4] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">
                    Évolution mensuelle
                  </div>
                  <div className="text-[11px] font-medium text-[#A8A29E] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#F97316]" />
                    <span>Moyenne: {formatEuro(annualStats.averagePerMonth)}</span>
                  </div>
                </div>

                <div className="pt-4 pb-1">
                  <div className="h-44 flex items-end justify-between gap-1 px-1 relative">
                    {annualStats.maxChartValue > 0 &&
                      annualStats.averagePerMonth > 0 && (
                        <div
                          className="absolute left-0 right-0 border-b border-dashed border-[#F97316]/40 pointer-events-none z-10 transition-all duration-300"
                          style={{
                            bottom: `${Math.min(
                              92,
                              (annualStats.averagePerMonth /
                                annualStats.maxChartValue) *
                                100
                            )}%`,
                          }}
                        />
                      )}

                    {annualStats.months.map((m) => {
                      const isSelected = selectedChartMonth === m.index
                      const isHighest =
                        annualStats.maxMonth &&
                        annualStats.maxMonth.total > 0 &&
                        annualStats.maxMonth.index === m.index

                      const heightPercent =
                        annualStats.maxChartValue > 0 && m.total > 0
                          ? Math.max(10, (m.total / annualStats.maxChartValue) * 100)
                          : 4

                      return (
                        <button
                          key={m.index}
                          type="button"
                          onClick={() => setSelectedChartMonth(m.index)}
                          className="flex-1 flex flex-col items-center h-full justify-end group focus:outline-none cursor-pointer"
                        >
                          <div className="w-full max-w-[22px] h-full flex items-end">
                            <div
                              className={`w-full rounded-t-lg transition-all duration-300 ${
                                isSelected
                                  ? 'bg-[#F97316]'
                                  : isHighest
                                  ? 'bg-[#F97316]/70 group-hover:bg-[#F97316]'
                                  : m.total > 0
                                  ? 'bg-[#F97316]/25 group-hover:bg-[#F97316]/50'
                                  : 'bg-[#E7E5E4]/50'
                              }`}
                              style={{ height: `${heightPercent}%` }}
                            />
                          </div>

                          <span
                            className={`text-[10px] mt-2 font-medium transition ${
                              isSelected
                                ? 'text-[#F97316] font-bold scale-105'
                                : 'text-[#A8A29E]'
                            }`}
                          >
                            {m.shortName}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {selectedChartMonth !== null && (
                  <div className="bg-[#FFFDF9] rounded-2xl p-3 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div>
                      <div className="text-xs font-bold text-[#1C1917]">
                        {annualStats.months[selectedChartMonth].name} {selectedYear}
                      </div>
                      <div className="text-[11px] text-[#78716C] mt-0.5">
                        {annualStats.months[selectedChartMonth].count} dépense
                        {annualStats.months[selectedChartMonth].count > 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-sm font-extrabold text-[#1C1917]">
                        {formatEuro(annualStats.months[selectedChartMonth].total)}
                      </div>
                      <button
                        onClick={() => jumpToMonth(selectedChartMonth)}
                        className="px-2.5 py-1.5 rounded-xl bg-white text-[#F97316] text-xs font-bold hover:bg-[#F97316] hover:text-white transition flex items-center gap-1 border border-[#E7E5E4]"
                      >
                        <span>Voir</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Répartition Annuelle par Membre */}
              <div className="bg-white rounded-2xl p-5 border border-[#E7E5E4] space-y-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">
                  Participation annuelle
                </div>

                <div className="space-y-4">
                  {members.map((m, idx) => {
                    const memberTotal = annualStats.memberTotals[m.user_id] || 0
                    const percentage =
                      annualStats.total > 0
                        ? Math.round((memberTotal / annualStats.total) * 100)
                        : 0
                    const color = memberColors[idx % memberColors.length]

                    return (
                      <div key={m.user_id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ backgroundColor: color }}
                            >
                              {(m.user?.name || 'M').charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-[#1C1917] text-xs">
                              {m.user?.name || 'Membre'}
                            </span>
                          </div>

                          <div className="text-right flex items-baseline gap-2">
                            <span className="font-bold text-[#1C1917] text-sm">
                              {formatEuro(memberTotal)}
                            </span>
                            <span className="text-xs text-[#A8A29E] font-semibold">
                              {percentage}%
                            </span>
                          </div>
                        </div>

                        <div className="w-full h-2 bg-[#F5F5F4] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Top Enseignes de l'année */}
              {annualStats.topStores.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-[#E7E5E4] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">
                      Lieux de courses fréquents
                    </div>
                    <ShoppingBag className="w-4 h-4 text-[#A8A29E]" />
                  </div>

                  <div className="divide-y divide-[#F5F5F4]">
                    {annualStats.topStores.map((store, i) => {
                      const percentOfAnnual =
                        annualStats.total > 0
                          ? Math.round((store.total / annualStats.total) * 100)
                          : 0

                      return (
                        <div
                          key={store.name}
                          className="py-2.5 flex items-center justify-between first:pt-1 last:pb-1"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-[#F97316]/10 text-[#F97316] flex items-center justify-center shrink-0">
                              <Store className="w-4 h-4 stroke-[2]" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#1C1917]">
                                {store.name}
                              </div>
                              <div className="text-[10px] text-[#A8A29E]">
                                {store.count} passage{store.count > 1 ? 's' : ''}{' '}
                                • {percentOfAnnual}% du budget
                              </div>
                            </div>
                          </div>

                          <div className="text-xs font-bold text-[#1C1917]">
                            {formatEuro(store.total)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Tableau Récapitulatif Mois par Mois */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E] px-1">
                  Bilan mois par mois
                </div>

                <div className="bg-white rounded-2xl border border-[#E7E5E4] overflow-hidden divide-y divide-[#F5F5F4]">
                  {annualStats.months.map((m) => {
                    const isRecord =
                      annualStats.maxMonth &&
                      annualStats.maxMonth.total > 0 &&
                      annualStats.maxMonth.index === m.index

                    return (
                      <div
                        key={m.index}
                        onClick={() => jumpToMonth(m.index)}
                        className="p-3.5 flex items-center justify-between hover:bg-[#FFFDF9] active:bg-[#F5F5F4] transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                              m.total > 0
                                ? 'bg-[#F97316]/10 text-[#F97316]'
                                : 'bg-[#F5F5F4] text-[#A8A29E]'
                            }`}
                          >
                            {m.shortName}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-[#1C1917] flex items-center gap-1.5">
                              <span>{m.name}</span>
                              {isRecord && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#F97316]/10 text-[#F97316]">
                                  Pic
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#A8A29E] mt-0.5">
                              {m.count} dépense{m.count > 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-sm ${
                              m.total > 0 ? 'text-[#1C1917]' : 'text-[#A8A29E]'
                            }`}
                          >
                            {formatEuro(m.total)}
                          </span>
                          <ChevronRight className="w-4 h-4 text-[#D6D3D1]" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
