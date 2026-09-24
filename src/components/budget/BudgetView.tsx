'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Expense } from '@/types/app'
import { useHousehold } from '@/context/HouseholdContext'
import {
  ChevronLeft,
  ChevronRight,
  Store,
  Trash2,
  PieChart,
  Loader2,
  Calendar,
  BarChart3,
  TrendingUp,
  Award,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Info,
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

  const memberColors = ['#007AFF', '#AF52DE', '#FF9500', '#34C759']

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

  const monthlyTotal = monthlyExpenses.reduce(
    (acc, curr) => acc + Number(curr.amount),
    0
  )

  const monthlyMemberTotals: { [userId: string]: number } = {}
  members.forEach((m) => {
    monthlyMemberTotals[m.user_id] = 0
  })
  monthlyExpenses.forEach((e) => {
    monthlyMemberTotals[e.paid_by] =
      (monthlyMemberTotals[e.paid_by] || 0) + Number(e.amount)
  })

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

  // Statistiques annuelles calculées
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

      // Top Enseignes
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

    // Moyenne mensuelle : diviser par les mois écoulés si année courante, sinon 12
    const isCurrentYear = new Date().getFullYear() === selectedYear
    const elapsedMonths = isCurrentYear ? Math.max(1, new Date().getMonth() + 1) : 12
    const averagePerMonth = total / elapsedMonths

    // Panier moyen par transaction
    const averagePerExpense = totalTransactions > 0 ? total / totalTransactions : 0

    // Mois max et min (avec au moins 1 dépense)
    const maxMonth = [...months].sort((a, b) => b.total - a.total)[0]
    const monthsWithSpend = months.filter((m) => m.total > 0)
    const minMonth =
      monthsWithSpend.length > 0
        ? [...monthsWithSpend].sort((a, b) => a.total - b.total)[0]
        : null

    const maxChartValue = Math.max(...months.map((m) => m.total), 1)

    // Top 4 enseignes
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

  // Naviguer du récap annuel directement vers le mois sélectionné
  const jumpToMonth = (monthIndex: number) => {
    setCurrentDate(new Date(selectedYear, monthIndex, 1))
    setBudgetMode('month')
  }

  return (
    <div className="space-y-4 tabbar-offset">
      {/* iOS Large Title Header */}
      <div className="pt-1 pb-1 flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1C1C1E]">
            Budget
          </h1>
          <p className="text-xs text-[#8E8E93] font-medium mt-0.5">
            {budgetMode === 'month'
              ? 'Dépenses & répartition du mois'
              : `Bilan & statistiques de l'année ${selectedYear}`}
          </p>
        </div>

        {/* Sélecteur de période */}
        {budgetMode === 'month' ? (
          <div className="flex items-center bg-white border border-[#E5E5EA] rounded-full p-0.5 shadow-2xs">
            <button
              onClick={prevMonth}
              aria-label="Mois précédent"
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] active:bg-[#F2F2F7] transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-[#1C1C1E] capitalize px-2">
              {monthYearLabel}
            </span>
            <button
              onClick={nextMonth}
              aria-label="Mois suivant"
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] active:bg-[#F2F2F7] transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center bg-white border border-[#E5E5EA] rounded-full p-0.5 shadow-2xs">
            <button
              onClick={prevYear}
              aria-label="Année précédente"
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] active:bg-[#F2F2F7] transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-[#1C1C1E] px-2.5">
              {selectedYear}
            </span>
            <button
              onClick={nextYear}
              aria-label="Année suivante"
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] active:bg-[#F2F2F7] transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Segmented Control iOS : Mois vs Année */}
      <div className="grid grid-cols-2 p-1 bg-white border border-[#E5E5EA] rounded-2xl shadow-xs">
        <button
          onClick={() => setBudgetMode('month')}
          className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition select-none ${
            budgetMode === 'month'
              ? 'bg-[#007AFF] text-white shadow-xs'
              : 'text-[#8E8E93] hover:text-[#1C1C1E]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Mois</span>
        </button>
        <button
          onClick={() => setBudgetMode('year')}
          className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition select-none ${
            budgetMode === 'year'
              ? 'bg-[#007AFF] text-white shadow-xs'
              : 'text-[#8E8E93] hover:text-[#1C1C1E]'
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
          {/* Hero Card : Total Dépensé du Mois */}
          <div className="bg-white rounded-3xl p-6 border border-[#E5E5EA] shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                Total du mois
              </span>
              <span className="text-xs font-semibold text-[#8E8E93] bg-[#F2F2F7] px-2.5 py-0.5 rounded-full">
                {monthlyExpenses.length} dépense
                {monthlyExpenses.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="text-4xl font-extrabold text-[#1C1C1E] tracking-tight mt-1">
              {formatEuro(monthlyTotal)}
            </div>
          </div>

          {/* Grouped Card : Répartition entre les membres */}
          <div className="bg-white rounded-3xl p-5 border border-[#E5E5EA] shadow-xs space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
              Répartition par membre
            </div>

            <div className="space-y-4">
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
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-2xs"
                          style={{ backgroundColor: color }}
                        >
                          {(m.user?.name || 'M').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-[#1C1C1E] text-xs">
                          {m.user?.name || 'Membre'}
                        </span>
                      </div>

                      <div className="text-right flex items-baseline gap-2">
                        <span className="font-bold text-[#1C1C1E] text-sm">
                          {formatEuro(memberTotal)}
                        </span>
                        <span className="text-xs text-[#8E8E93] font-semibold">
                          {percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Progress bar native iOS style */}
                    <div className="w-full h-2.5 bg-[#F2F2F7] rounded-full overflow-hidden">
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

          {/* Grouped Table View : Historique des achats */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] mb-2 px-1">
              Historique des achats
            </div>

            {monthlyLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-[#007AFF] animate-spin" />
              </div>
            ) : monthlyExpenses.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 border border-[#E5E5EA] shadow-xs text-center">
                <PieChart className="w-8 h-8 text-[#C7C7CC] mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-[#1C1C1E]">
                  Aucune dépense ce mois-ci
                </h3>
                <p className="text-xs text-[#8E8E93] mt-0.5">
                  Utilisez l&apos;onglet &quot;Dépense&quot; pour ajouter un
                  ticket.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-xs overflow-hidden divide-y divide-[#E5E5EA]">
                {monthlyExpenses.map((expense) => {
                  const payerName =
                    memberMap.get(expense.paid_by) || 'Membre'
                  const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                  }).format(new Date(expense.purchased_at))

                  return (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3.5 hover:bg-black/[0.01] transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#F2F2F7] flex items-center justify-center text-[#007AFF] shrink-0">
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-[#1C1C1E] leading-snug">
                            {expense.description || 'Courses'}
                          </div>
                          <div className="text-[11px] text-[#8E8E93] mt-0.5">
                            {dateFormatted} • Payé par {payerName}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-sm text-[#1C1C1E]">
                          {formatEuro(expense.amount)}
                        </span>
                        <button
                          onClick={() => deleteExpense(expense.id)}
                          aria-label="Supprimer la dépense"
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[#C7C7CC] hover:text-[#FF3B30] active:bg-black/5 transition shrink-0"
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
      {/* VUE 2 : BILAN & STATS SUR L'ANNÉE                                 */}
      {/* ================================================================= */}
      {budgetMode === 'year' && (
        <div className="space-y-4">
          {annualLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#007AFF] animate-spin" />
            </div>
          ) : (
            <>
              {/* Hero Card : Total Annuel */}
              <div className="bg-white rounded-3xl p-6 border border-[#E5E5EA] shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                    Total dépensé en {selectedYear}
                  </span>
                  <span className="text-xs font-semibold text-[#8E8E93] bg-[#F2F2F7] px-2.5 py-0.5 rounded-full">
                    {annualStats.totalTransactions} ticket
                    {annualStats.totalTransactions > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="text-4xl font-extrabold text-[#1C1C1E] tracking-tight mt-1">
                  {formatEuro(annualStats.total)}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#E5E5EA]">
                  <div>
                    <div className="text-[11px] text-[#8E8E93] font-medium">
                      Moyenne mensuelle
                    </div>
                    <div className="text-base font-bold text-[#1C1C1E] mt-0.5">
                      {formatEuro(annualStats.averagePerMonth)}
                      <span className="text-[11px] text-[#8E8E93] font-normal">
                        {' '}
                        / mois
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#8E8E93] font-medium">
                      Panier moyen
                    </div>
                    <div className="text-base font-bold text-[#1C1C1E] mt-0.5">
                      {formatEuro(annualStats.averagePerExpense)}
                      <span className="text-[11px] text-[#8E8E93] font-normal">
                        {' '}
                        / ticket
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Insights Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl p-3.5 border border-[#E5E5EA] shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[#FF9500] text-[11px] font-bold uppercase tracking-wider mb-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Mois record</span>
                  </div>
                  <div className="text-sm font-bold text-[#1C1C1E]">
                    {annualStats.maxMonth && annualStats.maxMonth.total > 0
                      ? annualStats.maxMonth.name
                      : 'Aucun'}
                  </div>
                  <div className="text-xs font-semibold text-[#8E8E93] mt-0.5">
                    {annualStats.maxMonth && annualStats.maxMonth.total > 0
                      ? formatEuro(annualStats.maxMonth.total)
                      : '0,00 €'}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-3.5 border border-[#E5E5EA] shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[#34C759] text-[11px] font-bold uppercase tracking-wider mb-1">
                    <Award className="w-3.5 h-3.5" />
                    <span>Mois le plus sobre</span>
                  </div>
                  <div className="text-sm font-bold text-[#1C1C1E]">
                    {annualStats.minMonth ? annualStats.minMonth.name : 'Aucun'}
                  </div>
                  <div className="text-xs font-semibold text-[#8E8E93] mt-0.5">
                    {annualStats.minMonth
                      ? formatEuro(annualStats.minMonth.total)
                      : '0,00 €'}
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* GRAPHIQUE INTERACTIF DES 12 MOIS                         */}
              {/* ======================================================== */}
              <div className="bg-white rounded-3xl p-5 border border-[#E5E5EA] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                    Évolution mensuelle
                  </div>
                  <div className="text-[11px] font-medium text-[#8E8E93] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#007AFF]" />
                    <span>Moyenne: {formatEuro(annualStats.averagePerMonth)}</span>
                  </div>
                </div>

                {/* Graphique à barres mobile design */}
                <div className="pt-4 pb-1">
                  <div className="h-44 flex items-end justify-between gap-1 sm:gap-2 px-1 relative">
                    {/* Ligne repère de la moyenne */}
                    {annualStats.maxChartValue > 0 &&
                      annualStats.averagePerMonth > 0 && (
                        <div
                          className="absolute left-0 right-0 border-b border-dashed border-[#007AFF]/40 pointer-events-none z-10 transition-all duration-300"
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
                          : 4 // hauteur minimale pour les mois à 0€

                      return (
                        <button
                          key={m.index}
                          type="button"
                          onClick={() => setSelectedChartMonth(m.index)}
                          className="flex-1 flex flex-col items-center h-full justify-end group focus:outline-none cursor-pointer"
                        >
                          {/* Barre verticale */}
                          <div className="w-full max-w-[24px] h-full flex items-end">
                            <div
                              className={`w-full rounded-t-lg transition-all duration-300 ${
                                isSelected
                                  ? 'bg-[#007AFF] shadow-sm'
                                  : isHighest
                                  ? 'bg-[#5856D6]/90 group-hover:bg-[#5856D6]'
                                  : m.total > 0
                                  ? 'bg-[#007AFF]/35 group-hover:bg-[#007AFF]/60'
                                  : 'bg-[#E5E5EA]/50'
                              }`}
                              style={{ height: `${heightPercent}%` }}
                            />
                          </div>

                          {/* Libellé du mois */}
                          <span
                            className={`text-[10px] mt-2 font-medium transition ${
                              isSelected
                                ? 'text-[#007AFF] font-bold scale-105'
                                : 'text-[#8E8E93]'
                            }`}
                          >
                            {m.shortName}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Callout interactif sur le mois cliqué */}
                {selectedChartMonth !== null && (
                  <div className="bg-[#F2F2F7] rounded-2xl p-3 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div>
                      <div className="text-xs font-bold text-[#1C1C1E]">
                        {annualStats.months[selectedChartMonth].name} {selectedYear}
                      </div>
                      <div className="text-[11px] text-[#8E8E93] mt-0.5">
                        {annualStats.months[selectedChartMonth].count} dépense
                        {annualStats.months[selectedChartMonth].count > 1 ? 's' : ''} •{' '}
                        {annualStats.months[selectedChartMonth].total >
                        annualStats.averagePerMonth
                          ? 'Au-dessus de la moyenne'
                          : 'En-dessous de la moyenne'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-sm font-extrabold text-[#1C1C1E]">
                          {formatEuro(annualStats.months[selectedChartMonth].total)}
                        </div>
                      </div>
                      <button
                        onClick={() => jumpToMonth(selectedChartMonth)}
                        className="px-2.5 py-1.5 rounded-xl bg-white text-[#007AFF] text-xs font-semibold hover:bg-[#007AFF] hover:text-white transition shadow-2xs flex items-center gap-1"
                      >
                        <span>Détail</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Répartition Annuelle par Membre */}
              <div className="bg-white rounded-3xl p-5 border border-[#E5E5EA] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                    Participation annuelle
                  </div>
                  <span className="text-[11px] text-[#8E8E93] font-medium">
                    Sur l&apos;année entière
                  </span>
                </div>

                <div className="space-y-4">
                  {members.map((m, idx) => {
                    const memberTotal =
                      annualStats.memberTotals[m.user_id] || 0
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
                              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-2xs"
                              style={{ backgroundColor: color }}
                            >
                              {(m.user?.name || 'M').charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-[#1C1C1E] text-xs">
                              {m.user?.name || 'Membre'}
                            </span>
                          </div>

                          <div className="text-right flex items-baseline gap-2">
                            <span className="font-bold text-[#1C1C1E] text-sm">
                              {formatEuro(memberTotal)}
                            </span>
                            <span className="text-xs text-[#8E8E93] font-semibold">
                              {percentage}%
                            </span>
                          </div>
                        </div>

                        {/* Progress bar native iOS style */}
                        <div className="w-full h-2.5 bg-[#F2F2F7] rounded-full overflow-hidden">
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
                <div className="bg-white rounded-3xl p-5 border border-[#E5E5EA] shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                      Lieux de courses fréquents
                    </div>
                    <ShoppingBag className="w-4 h-4 text-[#8E8E93]" />
                  </div>

                  <div className="divide-y divide-[#E5E5EA]">
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
                            <div className="w-6 h-6 rounded-lg bg-[#F2F2F7] text-[#1C1C1E] font-bold text-[11px] flex items-center justify-center">
                              #{i + 1}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#1C1C1E]">
                                {store.name}
                              </div>
                              <div className="text-[10px] text-[#8E8E93]">
                                {store.count} passage{store.count > 1 ? 's' : ''}{' '}
                                • {percentOfAnnual}% du budget
                              </div>
                            </div>
                          </div>

                          <div className="text-xs font-bold text-[#1C1C1E]">
                            {formatEuro(store.total)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Tableau Récapitulatif Mois par Mois */}
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] mb-2 px-1">
                  Bilan mois par mois
                </div>

                <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-xs overflow-hidden divide-y divide-[#E5E5EA]">
                  {annualStats.months.map((m) => {
                    const isRecord =
                      annualStats.maxMonth &&
                      annualStats.maxMonth.total > 0 &&
                      annualStats.maxMonth.index === m.index

                    return (
                      <div
                        key={m.index}
                        onClick={() => jumpToMonth(m.index)}
                        className="p-3.5 flex items-center justify-between hover:bg-black/[0.01] active:bg-[#F2F2F7] transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                              m.total > 0
                                ? 'bg-[#007AFF]/10 text-[#007AFF]'
                                : 'bg-[#F2F2F7] text-[#8E8E93]'
                            }`}
                          >
                            {m.shortName}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-[#1C1C1E] flex items-center gap-1.5">
                              <span>{m.name}</span>
                              {isRecord && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FF9500]/10 text-[#FF9500]">
                                  Pic
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#8E8E93] mt-0.5">
                              {m.count} dépense{m.count > 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-sm ${
                              m.total > 0 ? 'text-[#1C1C1E]' : 'text-[#8E8E93]'
                            }`}
                          >
                            {formatEuro(m.total)}
                          </span>
                          <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
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
