'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useHousehold } from '@/context/HouseholdContext'
import { useAuth } from '@/context/AuthContext'
import type { Expense } from '@/types/app'
import {
  Check,
  Loader2,
  Calendar,
  Store,
  CreditCard,
  ArrowLeft,
} from 'lucide-react'

interface AddExpenseViewProps {
  onSuccess: () => void
  expense?: Expense
  onCancel?: () => void
}

const quickStores = ['Intermarché', 'Grand Frais', 'Auchan', 'Lidl', 'Action']

export function AddExpenseView({ onSuccess, expense, onCancel }: AddExpenseViewProps) {
  const { household, members } = useHousehold()
  const { user } = useAuth()
  const supabase = createClient()

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [paidBy, setPaidBy] = useState(expense?.paid_by || user?.id || '')
  const [purchasedAt, setPurchasedAt] = useState(expense?.purchased_at || today)
  const [description, setDescription] = useState(expense?.description || '')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading || success || !amount || !household || !paidBy) return
    if (expense && expense.household_id !== household.id) {
      setError('Cette dépense appartient à un autre foyer. Revenez au budget.')
      return
    }

    setLoading(true)
    setError(null)

    const normalizedAmount = amount.trim().replace(',', '.')
    const parsedAmount = Number(normalizedAmount)
    if (!/^\d+(\.\d{1,2})?$/.test(normalizedAmount) || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 99999999.99) {
      setError('Saisissez un montant entre 0,01 et 99 999 999,99 €, avec deux décimales maximum.')
      setLoading(false)
      return
    }

    try {
      const values = {
        amount: parsedAmount,
        paid_by: paidBy,
        purchased_at: purchasedAt,
        description: description.trim() || 'Courses',
      }
      const { error: insertError } = expense
        ? await supabase.from('expenses').update(values)
            .eq('id', expense.id).eq('household_id', household.id).select('id').single()
        : await supabase.from('expenses').insert({ ...values, household_id: household.id })

      if (insertError) {
        setError(insertError.message)
      } else {
        setSuccess(true)
        setTimeout(() => {
          setAmount('')
          setDescription('')
          setSuccess(false)
          onSuccess()
        }, 900)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 tabbar-offset">
      {/* Header */}
      <div className="pt-1 pb-0.5">
        {onCancel && <button type="button" onClick={onCancel} disabled={loading || success} className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#78716C] disabled:opacity-40"><ArrowLeft className="w-4 h-4" />Retour au budget</button>}
        <h1 className="text-2xl font-bold tracking-tight text-[#1C1917]">
          {expense ? 'Modifier la dépense' : 'Nouvelle dépense'}
        </h1>
        <p className="text-sm text-[#78716C] mt-0.5">
          {expense ? 'Corrigez les informations de cet achat.' : 'Enregistrer un ticket ou un achat courses pour le foyer'}
        </p>
      </div>

      {success ? (
        <div className="bg-white rounded-2xl p-12 border border-[#E7E5E4] text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#22C55E]/15 text-[#22C55E] flex items-center justify-center">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          <h2 className="text-lg font-bold text-[#1C1917]">
            {expense ? 'Dépense modifiée !' : 'Dépense enregistrée !'}
          </h2>
          <p className="text-sm text-[#78716C]">
            Le total et la répartition du foyer ont été mis à jour.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-xs font-semibold rounded-2xl">
              {error}
            </div>
          )}

          {/* Saisie Montant en grand */}
          <div className="bg-white rounded-2xl p-6 border border-[#E7E5E4] text-center space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E] block">
              Montant payé
            </span>
            <div className="inline-flex items-center justify-center">
              <input
                type="text"
                inputMode="decimal"
                aria-label="Montant payé en euros"
                required
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-44 bg-transparent text-center text-5xl font-extrabold text-[#1C1917] placeholder-[#D6D3D1] focus:outline-none tracking-tight"
              />
              <span className="text-4xl font-extrabold text-[#F97316] -ml-2 select-none">
                €
              </span>
            </div>
            <p className="text-[11px] text-[#A8A29E]">
              Montant total du ticket de caisse
            </p>
          </div>

          {/* Payeur - Sélecteur */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E] px-1">
              Qui a payé ?
            </div>
            <div className="grid grid-cols-2 gap-2">
              {members.map((m) => {
                const isSelected = paidBy === m.user_id
                return (
                  <button
                    key={m.user_id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setPaidBy(m.user_id)}
                    className={`py-3 px-3.5 rounded-2xl border text-sm font-semibold transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-white border-[#F97316] text-[#F97316] ring-1 ring-[#F97316]'
                        : 'bg-white border-[#E7E5E4] text-[#1C1917] hover:border-[#D6D3D1]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected
                            ? 'bg-[#F97316] text-white'
                            : 'bg-[#F5F5F4] text-[#78716C]'
                        }`}
                      >
                        {(m.user?.name || 'M').charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{m.user?.name || 'Membre'}</span>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-[#F97316] stroke-[2.5] shrink-0" />
                    )}
                  </button>
                )
              })}
              {!members.some((m) => m.user_id === paidBy) && paidBy && <div className="rounded-2xl border border-[#E7E5E4] p-3 text-sm">Ancien membre (payeur actuel)</div>}
            </div>
          </div>

          {/* Détails : Magasin & Date */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E] px-1">
              Détails de l&apos;achat
            </div>
            <div className="bg-white rounded-2xl border border-[#E7E5E4] overflow-hidden divide-y divide-[#F5F5F4]">
              {/* Magasin */}
              <div className="p-3.5 flex items-center gap-3">
                <Store className="w-5 h-5 text-[#A8A29E] shrink-0" />
                <input
                  type="text"
                  aria-label="Enseigne ou magasin"
                  placeholder="Enseigne ou magasin"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-base text-[#1C1917] placeholder-[#A8A29E] focus:outline-none"
                />
              </div>

              {/* Date */}
              <div className="p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-[15px] font-medium text-[#1C1917]">
                  <Calendar className="w-5 h-5 text-[#A8A29E] shrink-0" />
                  <span>Date d&apos;achat</span>
                </div>
                <input
                  type="date"
                  aria-label="Date d’achat"
                  required
                  value={purchasedAt}
                  onChange={(e) => setPurchasedAt(e.target.value)}
                  className="bg-[#F5F5F4] text-[#1C1917] text-xs font-semibold px-2.5 py-1.5 rounded-xl border-none focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Suggestions d'enseignes fréquentes */}
            <div className="pt-1">
              <div className="flex flex-wrap gap-1.5 px-0.5">
                {quickStores.map((store) => (
                  <button
                    key={store}
                    type="button"
                    onClick={() => setDescription(store)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition font-medium ${
                      description.toLowerCase() === store.toLowerCase()
                        ? 'bg-[#F97316] text-white border-[#F97316]'
                        : 'bg-white border-[#E7E5E4] text-[#1C1917] hover:border-[#F97316] active:bg-[#FFFDF9]'
                    }`}
                  >
                    {store}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bouton de validation */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || success || !amount}
              className="w-full h-12 rounded-2xl font-bold text-white bg-[#F97316] hover:bg-[#EA580C] active:scale-[0.98] transition disabled:opacity-30 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-4 h-4 stroke-[2.2]" />
                  <span>{expense ? 'Enregistrer les modifications' : 'Enregistrer la dépense'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
