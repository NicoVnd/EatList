'use client'

import React, { useState } from 'react'
import { useHousehold } from '@/context/HouseholdContext'
import { useAuth } from '@/context/AuthContext'
import { Home, Users, Plus, ArrowRight, LogOut } from 'lucide-react'

export function HouseholdSetup() {
  const { createHousehold, joinHousehold } = useHousehold()
  const { profile, signOut } = useAuth()

  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [householdName, setHouseholdName] = useState('')
  const [inviteId, setInviteId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'create') {
      if (!householdName.trim()) {
        setError('Veuillez entrer un nom pour votre foyer.')
        setLoading(false)
        return
      }
      const res = await createHousehold(householdName)
      if (!res.success) {
        setError(res.error || 'Erreur lors de la création.')
      }
    } else {
      if (!inviteId.trim()) {
        setError("Veuillez renseigner l'identifiant du foyer.")
        setLoading(false)
        return
      }
      const res = await joinHousehold(inviteId)
      if (!res.success) {
        setError(res.error || 'Erreur lors de la jonction.')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#1C1917] flex flex-col justify-center px-4 py-8 pt-safe pb-safe">
      <div className="max-w-sm w-full mx-auto space-y-6">
        {/* Header profil */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-sm">👋</span>
            <span className="text-[#1C1917] text-xs font-semibold">
              Bonjour, {profile?.name || 'Bienvenue'}
            </span>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 text-xs font-medium text-[#78716C] hover:text-[#1C1917] transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>

        {/* Titre */}
        <div className="text-center space-y-1.5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#F97316] mb-3">
            <Home className="w-8 h-8 stroke-[1.8]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1C1917]">
            Votre foyer
          </h1>
          <p className="text-[#78716C] text-xs max-w-xs mx-auto">
            Créez ou rejoignez un foyer pour partager vos courses et dépenses au quotidien.
          </p>
        </div>

        {/* Card Onboarding */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-5">
          {/* Segmented Switcher */}
          <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode('create')
                setError(null)
              }}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                mode === 'create'
                  ? 'bg-white text-[#1C1917] shadow-xs'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Créer</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('join')
                setError(null)
              }}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                mode === 'join'
                  ? 'bg-white text-[#1C1917] shadow-xs'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Rejoindre</span>
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-[#EF4444] text-xs font-medium rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'create' ? (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#78716C] mb-1.5">
                  Nom du foyer
                </label>
                <input
                  type="text"
                  placeholder="ex: Chez nous, Appartement..."
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 text-[#1C1917] placeholder-stone-400 text-sm focus:outline-none focus:ring-1 focus:ring-[#F97316] focus:border-[#F97316] transition"
                />
                <p className="text-[11px] text-[#78716C] mt-2">
                  Vous pourrez facilement inviter l&apos;autre membre ensuite.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#78716C] mb-1.5">
                  Identifiant du foyer
                </label>
                <input
                  type="text"
                  placeholder="Collez le code partagé par votre conjoint"
                  value={inviteId}
                  onChange={(e) => setInviteId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 text-[#1C1917] placeholder-stone-400 text-sm focus:outline-none focus:ring-1 focus:ring-[#F97316] focus:border-[#F97316] transition font-mono text-xs"
                />
                <p className="text-[11px] text-[#78716C] mt-2">
                  Demandez à l&apos;autre membre de copier l&apos;ID depuis le haut de son écran.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-bold text-white bg-[#F97316] hover:bg-[#EA580C] active:scale-[0.98] transition shadow-xs disabled:opacity-40 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'create' ? 'Créer le foyer' : 'Rejoindre le foyer'}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
