'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Household, HouseholdMember } from '@/types/app'
import { useAuth } from './AuthContext'

interface HouseholdContextType {
  household: Household | null
  members: HouseholdMember[]
  userHouseholds: Household[]
  isLoading: boolean
  createHousehold: (name: string) => Promise<{ success: boolean; error?: string }>
  joinHousehold: (householdId: string) => Promise<{ success: boolean; error?: string }>
  deleteHousehold: (householdId: string) => Promise<{ success: boolean; error?: string }>
  leaveHousehold: (householdId: string) => Promise<{ success: boolean; error?: string }>
  refreshHousehold: () => Promise<void>
  setHousehold: (household: Household) => void
}

const HouseholdContext = createContext<HouseholdContextType>({
  household: null,
  members: [],
  userHouseholds: [],
  isLoading: true,
  createHousehold: async () => ({ success: false }),
  joinHousehold: async () => ({ success: false }),
  deleteHousehold: async () => ({ success: false }),
  leaveHousehold: async () => ({ success: false }),
  refreshHousehold: async () => {},
  setHousehold: () => {},
})

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [household, setHouseholdState] = useState<Household | null>(null)
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [userHouseholds, setUserHouseholds] = useState<Household[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  const fetchMembers = useCallback(async (householdId: string) => {
    try {
      const { data: membersData, error } = await supabase
        .from('household_members')
        .select(`
          household_id,
          user_id,
          created_at,
          user:users (
            id,
            name,
            email,
            created_at
          )
        `)
        .eq('household_id', householdId)

      if (!error && membersData) {
        // Formatter les données pour TypeScript
        const formatted = membersData.map((m: any) => ({
          household_id: m.household_id,
          user_id: m.user_id,
          created_at: m.created_at,
          user: Array.isArray(m.user) ? m.user[0] : m.user,
        }))
        setMembers(formatted)
      }
    } catch (err) {
      console.error('Error fetching members:', err)
    }
  }, [supabase])

  const fetchHouseholds = useCallback(async () => {
    if (!user) {
      setHouseholdState(null)
      setMembers([])
      setUserHouseholds([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      // Récupérer les adhésions du user
      const { data: memberships, error: memError } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)

      if (memError || !memberships || memberships.length === 0) {
        setHouseholdState(null)
        setMembers([])
        setUserHouseholds([])
        setIsLoading(false)
        return
      }

      const householdIds = memberships.map((m) => m.household_id)

      // Récupérer les foyers associés
      const { data: hhData, error: hhError } = await supabase
        .from('households')
        .select('*')
        .in('id', householdIds)

      if (!hhError && hhData && hhData.length > 0) {
        setUserHouseholds(hhData as Household[])
        
        // Sélectionner le foyer sauvegardé en localStorage ou le premier par défaut
        const savedId = typeof window !== 'undefined' ? localStorage.getItem('active_household_id') : null
        const current = hhData.find((h) => h.id === savedId) || hhData[0]
        
        setHouseholdState(current)
        await fetchMembers(current.id)
      } else {
        setHouseholdState(null)
        setMembers([])
        setUserHouseholds([])
      }
    } catch (err) {
      console.error('Error fetching households:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user, supabase, fetchMembers])

  useEffect(() => {
    fetchHouseholds()
  }, [fetchHouseholds])

  const setHousehold = (newHh: Household) => {
    setHouseholdState(newHh)
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_household_id', newHh.id)
    }
    fetchMembers(newHh.id)
  }

  const createHousehold = async (name: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Non authentifié' }
    try {
      // 1. Créer le foyer
      const { data: newHh, error: hhErr } = await supabase
        .from('households')
        .insert({
          name: name.trim(),
          created_by: user.id,
        })
        .select()
        .single()

      if (hhErr || !newHh) {
        return { success: false, error: hhErr?.message || 'Erreur lors de la création' }
      }

      // 2. Ajouter le créateur comme membre
      const { error: memErr } = await supabase
        .from('household_members')
        .insert({
          household_id: newHh.id,
          user_id: user.id,
        })

      if (memErr) {
        return { success: false, error: memErr.message }
      }

      await fetchHouseholds()
      setHousehold(newHh)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur inattendue' }
    }
  }

  const joinHousehold = async (householdId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Non authentifié' }
    try {
      const cleanId = householdId.trim()
      if (!cleanId) {
        return { success: false, error: 'Veuillez saisir un identifiant de foyer.' }
      }

      // 1. Rejoindre le foyer d'abord
      // En insérant dans household_members, PostgreSQL valide la clé étrangère (existence du foyer).
      // Dès que l'utilisateur est membre, la RLS l'autorise à lire public.households !
      const { error: joinErr } = await supabase
        .from('household_members')
        .insert({
          household_id: cleanId,
          user_id: user.id,
        })

      if (joinErr) {
        // Code 23505 = contrainte d'unicité (déjà membre)
        if (joinErr.code === '23505') {
          return { success: false, error: 'Vous êtes déjà membre de ce foyer !' }
        }
        // Code 23503 = clé étrangère invalide (foyer inexistant)
        if (joinErr.code === '23503' || joinErr.message?.includes('foreign key')) {
          return { success: false, error: 'Foyer introuvable. Vérifiez l’identifiant.' }
        }
        // Erreur format UUID invalide
        if (joinErr.code === '22P02') {
          return { success: false, error: 'Format d’identifiant invalide.' }
        }
        return { success: false, error: joinErr.message || 'Impossible de rejoindre le foyer.' }
      }

      // 2. Maintenant que l'utilisateur est membre, la politique RLS l'autorise à lire le foyer
      const { data: hh, error: findErr } = await supabase
        .from('households')
        .select('*')
        .eq('id', cleanId)
        .single()

      if (findErr || !hh) {
        return { success: false, error: 'Erreur lors du chargement des informations du foyer.' }
      }

      await fetchHouseholds()
      setHousehold(hh as Household)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur inattendue' }
    }
  }

  const deleteHousehold = async (householdId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Non authentifié' }
    try {
      const { error } = await supabase
        .from('households')
        .delete()
        .eq('id', householdId)

      if (error) {
        return { success: false, error: error.message }
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem('active_household_id')
      }

      await fetchHouseholds()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur inattendue' }
    }
  }

  const leaveHousehold = async (householdId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Non authentifié' }
    try {
      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('household_id', householdId)
        .eq('user_id', user.id)

      if (error) {
        return { success: false, error: error.message }
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem('active_household_id')
      }

      await fetchHouseholds()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur inattendue' }
    }
  }

  const refreshHousehold = async () => {
    await fetchHouseholds()
  }

  return (
    <HouseholdContext.Provider
      value={{
        household,
        members,
        userHouseholds,
        isLoading,
        createHousehold,
        joinHousehold,
        deleteHousehold,
        leaveHousehold,
        refreshHousehold,
        setHousehold,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  )
}

export function useHousehold() {
  return useContext(HouseholdContext)
}
