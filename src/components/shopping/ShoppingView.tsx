'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShoppingItem } from '@/types/app'
import { useHousehold } from '@/context/HouseholdContext'
import { useAuth } from '@/context/AuthContext'
import {
  Plus,
  Check,
  Trash2,
  ShoppingBag,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

export function ShoppingView() {
  const { household, members } = useHousehold()
  const { user } = useAuth()
  const supabase = createClient()

  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showChecked, setShowChecked] = useState(true)

  const memberMap = new Map(members.map((m) => [m.user_id, m.user?.name || 'Membre']))

  const fetchItems = useCallback(async () => {
    if (!household) return
    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('household_id', household.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setItems(data as ShoppingItem[])
      }
    } catch (err) {
      console.error('Erreur chargement articles:', err)
    } finally {
      setLoading(false)
    }
  }, [household, supabase])

  useEffect(() => {
    if (!household) return

    fetchItems()

    const channel = supabase
      .channel(`shopping_${household.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_items',
          filter: `household_id=eq.${household.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as ShoppingItem
            setItems((prev) => {
              if (prev.some((item) => item.id === newItem.id)) return prev
              return [newItem, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as ShoppingItem
            setItems((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item))
            )
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id
            setItems((prev) => prev.filter((item) => item.id !== deletedId))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [household, supabase, fetchItems])

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim() || !household || !user) return

    setIsSubmitting(true)
    const name = newItemName.trim()
    const quantity = newItemQuantity.trim() || null

    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .insert({
          household_id: household.id,
          name,
          quantity,
          checked: false,
          added_by: user.id,
        })
        .select()
        .single()

      if (!error && data) {
        setNewItemName('')
        setNewItemQuantity('')
      }
    } catch (err) {
      console.error('Erreur ajout article:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleItem = async (item: ShoppingItem) => {
    const updatedChecked = !item.checked
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: updatedChecked } : i))
    )

    try {
      await supabase
        .from('shopping_items')
        .update({
          checked: updatedChecked,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)
    } catch (err) {
      console.error('Erreur modification état:', err)
      fetchItems()
    }
  }

  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    try {
      await supabase.from('shopping_items').delete().eq('id', id)
    } catch (err) {
      console.error('Erreur suppression article:', err)
      fetchItems()
    }
  }

  const clearCheckedItems = async () => {
    const checkedIds = items.filter((i) => i.checked).map((i) => i.id)
    if (checkedIds.length === 0) return

    setItems((prev) => prev.filter((i) => !i.checked))
    try {
      await supabase.from('shopping_items').delete().in('id', checkedIds)
    } catch (err) {
      console.error('Erreur nettoyage articles cochés:', err)
      fetchItems()
    }
  }

  const uncheckedItems = items.filter((i) => !i.checked)
  const checkedItems = items.filter((i) => i.checked)

  return (
    <div className="space-y-4 tabbar-offset">
      {/* iOS Large Title Header */}
      <div className="flex items-baseline justify-between pt-1 pb-1">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1C1C1E]">
            Courses
          </h1>
          <p className="text-xs text-[#8E8E93] font-medium mt-0.5">
            {uncheckedItems.length} article{uncheckedItems.length > 1 ? 's' : ''} à acheter
          </p>
        </div>

        {checkedItems.length > 0 && (
          <button
            onClick={clearCheckedItems}
            className="text-xs font-semibold text-[#FF3B30] hover:opacity-80 transition py-1 px-2.5 rounded-full bg-white border border-[#E5E5EA] shadow-2xs"
          >
            Vider panier ({checkedItems.length})
          </button>
        )}
      </div>

      {/* Barre d'ajout rapide style Apple Reminders */}
      <form
        onSubmit={handleAddItem}
        className="bg-white rounded-2xl p-2.5 border border-[#E5E5EA] shadow-xs flex items-center gap-2"
      >
        <div className="w-7 h-7 rounded-full bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center shrink-0">
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </div>
        <input
          type="text"
          placeholder="Ajouter un article..."
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          className="flex-1 bg-transparent text-[#1C1C1E] placeholder-[#8E8E93] text-[15px] focus:outline-none"
        />
        <button
          type="submit"
          disabled={!newItemName.trim() || isSubmitting}
          className="px-3.5 py-1.5 rounded-xl bg-[#007AFF] text-white text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition shrink-0 active:scale-95 shadow-xs"
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            'Ajouter'
          )}
        </button>
      </form>

      {/* État de chargement */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#007AFF] animate-spin" />
        </div>
      ) : uncheckedItems.length === 0 && checkedItems.length === 0 ? (
        /* État vide soigné */
        <div className="py-20 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-white border border-[#E5E5EA] flex items-center justify-center mx-auto mb-3 shadow-xs">
            <ShoppingBag className="w-7 h-7 text-[#8E8E93] stroke-[1.7]" />
          </div>
          <h2 className="text-base font-bold text-[#1C1C1E]">
            Votre liste est vide
          </h2>
          <p className="text-xs text-[#8E8E93] max-w-[240px] mx-auto mt-1">
            Ajoutez les articles dont vous avez besoin ci-dessus. Tout le foyer les verra en temps réel.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Grouped Table View : Articles à acheter */}
          {uncheckedItems.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-xs divide-y divide-[#E5E5EA]">
              {uncheckedItems.map((item) => {
                const authorName = item.added_by
                  ? memberMap.get(item.added_by)
                  : null

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3.5 py-3.5 hover:bg-black/[0.01] transition"
                  >
                    <div
                      onClick={() => toggleItem(item)}
                      className="flex items-center gap-3.5 flex-1 cursor-pointer select-none"
                    >
                      {/* Checkbox Apple Reminders style */}
                      <div className="w-[22px] h-[22px] rounded-full border-[1.8px] border-[#C7C7CC] hover:border-[#007AFF] active:scale-90 flex items-center justify-center transition shrink-0" />

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-semibold text-[#1C1C1E] leading-snug">
                            {item.name}
                          </span>
                          {item.quantity && (
                            <span className="text-[11px] font-semibold text-[#8E8E93] bg-[#F2F2F7] px-2 py-0.5 rounded-md">
                              {item.quantity}
                            </span>
                          )}
                        </div>
                        {authorName && (
                          <span className="text-[11px] text-[#8E8E93] block mt-0.5">
                            Ajouté par {authorName}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => deleteItem(item.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#C7C7CC] hover:text-[#FF3B30] active:bg-black/5 transition shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Grouped Table View : Panier / Articles cochés */}
          {checkedItems.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setShowChecked(!showChecked)}
                className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#8E8E93]"
              >
                <span>Dans le panier ({checkedItems.length})</span>
                {showChecked ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showChecked && (
                <div className="mt-1 bg-white/70 rounded-2xl border border-[#E5E5EA] overflow-hidden divide-y divide-[#E5E5EA]">
                  {checkedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-3.5 py-3 opacity-60 hover:opacity-100 transition"
                    >
                      <div
                        onClick={() => toggleItem(item)}
                        className="flex items-center gap-3.5 flex-1 cursor-pointer select-none"
                      >
                        {/* Checked circle filled */}
                        <div className="w-[22px] h-[22px] rounded-full bg-[#34C759] text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="line-through text-sm text-[#8E8E93] font-medium">
                            {item.name}
                          </span>
                          {item.quantity && (
                            <span className="text-[10px] text-[#8E8E93]">
                              ({item.quantity})
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => deleteItem(item.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[#C7C7CC] hover:text-[#FF3B30] transition shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
