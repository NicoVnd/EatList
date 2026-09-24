'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShoppingBag, LogIn, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (isSignUp) {
        if (!name.trim()) {
          setError('Veuillez renseigner votre prénom.')
          setLoading(false)
          return
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              name: name.trim(),
            },
          },
        })

        if (signUpError) {
          setError(signUpError.message)
          setLoading(false)
          return
        }

        if (data.session) {
          router.push('/')
          router.refresh()
        } else {
          setMessage('Compte créé ! Vous pouvez maintenant vous connecter.')
          setIsSignUp(false)
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (signInError) {
          setError('Email ou mot de passe incorrect.')
          setLoading(false)
          return
        }

        router.push('/')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-[#1C1C1E] flex flex-col justify-center px-4 py-8 pt-safe pb-safe">
      <div className="max-w-sm w-full mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-18 h-18 mx-auto rounded-3xl overflow-hidden shadow-sm border border-[#E5E5EA]">
            <img
              src="/icon.png"
              alt="EatList"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1C1C1E] pt-1">
            EatList
          </h1>
          <p className="text-xs text-[#8E8E93]">
            Repas, courses, recettes & budget partagés
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#E5E5EA] rounded-3xl p-6 shadow-xs space-y-5">
          {/* Segmented control iOS */}
          <div className="grid grid-cols-2 p-1 bg-[#F2F2F7] rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false)
                setError(null)
                setMessage(null)
              }}
              className={`py-2 text-xs font-semibold rounded-xl transition ${
                !isSignUp
                  ? 'bg-white text-[#1C1C1E] shadow-xs'
                  : 'text-[#8E8E93] hover:text-[#1C1C1E]'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true)
                setError(null)
                setMessage(null)
              }}
              className={`py-2 text-xs font-semibold rounded-xl transition ${
                isSignUp
                  ? 'bg-white text-[#1C1C1E] shadow-xs'
                  : 'text-[#8E8E93] hover:text-[#1C1C1E]'
              }`}
            >
              Inscription
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[#FF3B30] text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#34C759]/10 border border-[#34C759]/20 text-[#34C759] text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] mb-1.5">
                  Prénom
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Nicolas, Chloé..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#F2F2F7] text-[#1C1C1E] placeholder-[#8E8E93] text-sm focus:outline-none focus:ring-1 focus:ring-[#007AFF] transition"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] mb-1.5">
                Adresse e-mail
              </label>
              <input
                type="email"
                required
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[#F2F2F7] text-[#1C1C1E] placeholder-[#8E8E93] text-sm focus:outline-none focus:ring-1 focus:ring-[#007AFF] transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] mb-1.5">
                Mot de passe
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[#F2F2F7] text-[#1C1C1E] placeholder-[#8E8E93] text-sm focus:outline-none focus:ring-1 focus:ring-[#007AFF] transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl font-bold text-white bg-[#007AFF] hover:bg-[#007AFF]/90 active:scale-[0.98] transition shadow-xs disabled:opacity-40 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                  <span>Créer mon profil</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 stroke-[2.5]" />
                  <span>Se connecter</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
