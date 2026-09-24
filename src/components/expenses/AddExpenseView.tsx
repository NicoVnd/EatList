'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useHousehold } from '@/context/HouseholdContext'
import { useAuth } from '@/context/AuthContext'
import { Check, Loader2, Calendar, Store, User } from 'lucide-react'

interface AddExpenseViewProps {
  onSuccess: () => void
}

export function AddExpenseView({ onSuccess }: AddExpenseViewProps) {
  const { household, members } = useHousehold()
  const { user } = useAuth()
  const supabase = createClient()

  const today = new Date().toISOString().split('T')[0]

  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(user?.id || '')
  const [purchasedAt, setPurchasedAt] = useState(today)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const quickStores = ['Intermaché', 'Grand Frais', 'Auchan', 'Lidl', 'Action']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !household || !paidBy) return

    setLoading(true)
    setError(null)

    const parsedAmount = parseFloat(amount.replace(',', '.'))
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Veuillez saisir un montant supérieur à 0.')
      setLoading(false)
      return
    }

    try {
      const { error: insertError } = await supabase.from('expenses').insert({
        household_id: household.id,
        amount: parsedAmount,
        paid_by: paidBy,
        purchased_at: purchasedAt,
        description: description.trim() || null,
      })

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
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 tabbar-offset">
      {/* iOS Large Title */}
      <div className="pt-1 pb-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#1C1C1E]">
          Dépense
        </h1>
        <p className="text-xs text-[#8E8E93] font-medium mt-0.5">
          Enregistrer un achat courses pour le foyer
        </p>
      </div>

      {success ? (
        <div className="bg-white rounded-3xl p-12 border border-[#E5E5EA] shadow-xs text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#34C759]/15 text-[#34C759] flex items-center justify-center">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          <h2 className="text-lg font-bold text-[#1C1C1E]">
            Dépense enregistrée !
          </h2>
          <p className="text-xs text-[#8E8E93]">
            Le total mensuel a été mis à jour.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[#FF3B30] text-xs font-medium rounded-2xl">
              {error}
            </div>
          )}

          {/* Saisie Montant en grand - Hero Input Apple Pay Style */}
          <div className="bg-white rounded-3xl p-6 border border-[#E5E5EA] shadow-xs text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] block mb-2">
              Montant payé
            </span>
            <div className="inline-flex items-center justify-center">
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                required
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-44 bg-transparent text-center text-5xl font-extrabold text-[#1C1C1E] placeholder-[#C7C7CC] focus:outline-none tracking-tight"
              />
              <span className="text-4xl font-extrabold text-[#007AFF] -ml-2">
                €
              </span>
            </div>
          </div>

          {/* Payeur - Segmented iOS Picker */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] mb-2 px-1">
              Qui a payé ?
            </div>
            <div className="grid grid-cols-2 gap-2">
              {members.map((m) => {
                const isSelected = paidBy === m.user_id
                return (
                  <button
                    key={m.user_id}
                    type="button"
                    onClick={() => setPaidBy(m.user_id)}
                    className={`py-3 px-3.5 rounded-2xl border text-sm font-semibold transition flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-white border-[#007AFF] text-[#007AFF] shadow-xs ring-1 ring-[#007AFF]'
                        : 'bg-white border-[#E5E5EA] text-[#1C1C1E] hover:border-[#C7C7CC]'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        isSelected
                          ? 'bg-[#007AFF] text-white'
                          : 'bg-[#F2F2F7] text-[#8E8E93]'
                      }`}
                    >
                      {(m.user?.name || 'M').charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{m.user?.name || 'Membre'}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Grouped Table View : Magasin & Date */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] mb-2 px-1">
              Détails
            </div>
            <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-xs overflow-hidden divide-y divide-[#E5E5EA]">
              {/* Magasin */}
              <div className="p-3.5 flex items-center gap-3">
                <Store className="w-5 h-5 text-[#8E8E93] shrink-0" />
                <input
                  type="text"
                  placeholder="Magasin (ex: Carrefour, Lidl...)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex-1 bg-transparent text-[15px] text-[#1C1C1E] placeholder-[#8E8E93] focus:outline-none"
                />
              </div>

              {/* Date */}
              <div className="p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-[15px] font-medium text-[#1C1C1E]">
                  <Calendar className="w-5 h-5 text-[#8E8E93] shrink-0" />
                  <span>Date d&apos;achat</span>
                </div>
                <input
                  type="date"
                  required
                  value={purchasedAt}
                  onChange={(e) => setPurchasedAt(e.target.value)}
                  className="bg-[#F2F2F7] text-[#1C1C1E] text-xs font-semibold px-2.5 py-1.5 rounded-xl border-none focus:outline-none"
                />
              </div>
            </div>

            {/* Suggestions de magasins en pilules rapides */}
            <div className="flex flex-wrap gap-1.5 mt-2.5 px-1">
              {quickStores.map((store) => (
                <button
                  key={store}
                  type="button"
                  onClick={() => setDescription(store)}
                  className="text-xs px-3 py-1 rounded-full bg-white border border-[#E5E5EA] text-[#1C1C1E] hover:border-[#007AFF] active:bg-[#F2F2F7] transition font-medium shadow-2xs"
                >
                  {store}
                </button>
              ))}
            </div>
          </div>

          {/* Bouton de validation iOS */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !amount}
              className="w-full h-13 rounded-2xl font-bold text-white bg-[#007AFF] hover:bg-[#007AFF]/90 active:scale-[0.98] transition shadow-xs disabled:opacity-30 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>Enregistrer la dépense</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
