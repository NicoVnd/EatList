'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
  Layers,
  List,
} from 'lucide-react'
import {
  GROCERY_CATEGORIES,
  detectGroceryCategory,
} from '@/lib/groceryCategories'

export function ShoppingView() {
  const { household, members } = useHousehold()
  const { user } = useAuth()
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newItemName, setNewItemName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showChecked, setShowChecked] = useState(true)
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('all')
  const [groupByCategory, setGroupByCategory] = useState(true)

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.user_id, m.user?.name || 'Membre'])),
    [members]
  )

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

    const loadData = async () => {
      await fetchItems()
    }
    void loadData()

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

    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .insert({
          household_id: household.id,
          name,
          quantity: null,
          checked: false,
          added_by: user.id,
        })
        .select()
        .single()

      if (!error && data) {
        setNewItemName('')
        inputRef.current?.focus()
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

  // Catégorisation intelligente de chaque article
  const categorizedUncheckedItems = useMemo(() => {
    const unchecked = items.filter((i) => !i.checked)

    // Associer chaque article à sa catégorie
    const itemsWithCategory = unchecked.map((item) => ({
      ...item,
      categoryInfo: detectGroceryCategory(item.name),
    }))

    // Regrouper par catégorie ordonnée
    const groups: {
      category: typeof GROCERY_CATEGORIES[0]
      items: typeof itemsWithCategory
    }[] = []

    GROCERY_CATEGORIES.forEach((cat) => {
      const catItems = itemsWithCategory.filter((i) => i.categoryInfo.id === cat.id)
      if (catItems.length > 0) {
        groups.push({
          category: cat,
          items: catItems,
        })
      }
    })

    return {
      all: itemsWithCategory,
      groups,
    }
  }, [items])

  const uncheckedItems = items.filter((i) => !i.checked)
  const checkedItems = items.filter((i) => i.checked)

  // Filtrage selon la sélection en haut
  const displayedGroups = useMemo(() => {
    if (selectedFilterCategory === 'all') {
      return categorizedUncheckedItems.groups
    }
    return categorizedUncheckedItems.groups.filter(
      (g) => g.category.id === selectedFilterCategory
    )
  }, [categorizedUncheckedItems, selectedFilterCategory])

  const displayedFlatItems = useMemo(() => {
    if (selectedFilterCategory === 'all') {
      return categorizedUncheckedItems.all
    }
    return categorizedUncheckedItems.all.filter(
      (i) => i.categoryInfo.id === selectedFilterCategory
    )
  }, [categorizedUncheckedItems, selectedFilterCategory])

  // Détection en direct pour l'input
  const previewCategory = useMemo(() => {
    if (!newItemName.trim()) return null
    return detectGroceryCategory(newItemName)
  }, [newItemName])

  return (
    <div className="space-y-4 tabbar-offset">
      {/* Header */}
      <div className="flex items-center justify-between pt-1 pb-0.5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1C1917]">
            Courses
          </h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            {uncheckedItems.length === 0
              ? 'Aucun article à acheter'
              : `${uncheckedItems.length} article${
                  uncheckedItems.length > 1 ? 's' : ''
                } à acheter`}
          </p>
        </div>

        {/* Bouton bascule affichage Groupé / Liste */}
        <div className="flex items-center gap-1.5">
          {uncheckedItems.length > 0 && (
            <button
              onClick={() => setGroupByCategory(!groupByCategory)}
              className="flex items-center gap-1 text-xs font-semibold text-[#78716C] hover:text-[#1C1917] bg-white border border-[#E7E5E4] px-2.5 py-1.5 rounded-xl transition"
              title={groupByCategory ? 'Vue liste simple' : 'Grouper par rayon'}
            >
              {groupByCategory ? (
                <>
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Liste</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Rayons</span>
                </>
              )}
            </button>
          )}

          {checkedItems.length > 0 && (
            <button
              onClick={clearCheckedItems}
              className="text-xs font-semibold text-[#EF4444] hover:bg-[#EF4444]/10 transition py-1.5 px-3 rounded-xl bg-white border border-[#E7E5E4]"
            >
              Vider ({checkedItems.length})
            </button>
          )}
        </div>
      </div>

      {/* Barre d'ajout rapide */}
      <form
        onSubmit={handleAddItem}
        className="bg-white rounded-2xl p-2 pl-3 border border-[#E7E5E4] flex items-center gap-2.5 transition focus-within:ring-2 focus-within:ring-[#F97316]/25 focus-within:border-[#F97316]"
      >
        <div className="w-7 h-7 rounded-full bg-[#F97316]/10 text-[#F97316] flex items-center justify-center shrink-0">
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </div>

        <input
          ref={inputRef}
          type="text"
          placeholder="Ajouter un article..."
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          className="flex-1 bg-transparent text-[#1C1917] placeholder-[#A8A29E] text-sm focus:outline-none min-w-0"
        />

        {/* Badge de catégorie détectée en temps réel */}
        {previewCategory && previewCategory.id !== 'other' && (
          <span className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-[#78716C] bg-[#F5F5F4] px-2 py-0.5 rounded-full">
            <span>{previewCategory.emoji}</span>
            <span className="hidden xs:inline">{previewCategory.name}</span>
          </span>
        )}

        <button
          type="submit"
          disabled={!newItemName.trim() || isSubmitting}
          className="px-4 py-2 rounded-xl bg-[#F97316] text-white text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition shrink-0 active:scale-95"
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            'Ajouter'
          )}
        </button>
      </form>

      {/* Filtres de catégories (si articles présents) */}
      {categorizedUncheckedItems.groups.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
          <button
            onClick={() => setSelectedFilterCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              selectedFilterCategory === 'all'
                ? 'bg-[#1C1917] text-white'
                : 'bg-white border border-[#E7E5E4] text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            Tous ({uncheckedItems.length})
          </button>
          {categorizedUncheckedItems.groups.map(({ category, items: catItems }) => (
            <button
              key={category.id}
              onClick={() => setSelectedFilterCategory(category.id)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                selectedFilterCategory === category.id
                  ? 'bg-[#F97316] text-white'
                  : 'bg-white border border-[#E7E5E4] text-[#1C1917] hover:border-[#F97316]'
              }`}
            >
              <span>{category.emoji}</span>
              <span>{category.name}</span>
              <span className="text-[10px] opacity-75">({catItems.length})</span>
            </button>
          ))}
        </div>
      )}

      {/* État de chargement */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-7 h-7 text-[#F97316] animate-spin" />
        </div>
      ) : uncheckedItems.length === 0 && checkedItems.length === 0 ? (
        /* État vide */
        <div className="py-16 px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#F5F5F4] flex items-center justify-center mx-auto mb-3 text-[#A8A29E]">
            <ShoppingBag className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h2 className="text-base font-bold text-[#1C1917]">
            Votre liste est vide
          </h2>
          <p className="text-sm text-[#78716C] max-w-[240px] mx-auto mt-1">
            Ajoutez les articles nécessaires ci-dessus. Tout le foyer les verra en temps réel.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* AFFICHAGE GROUPÉ PAR RAYONS */}
          {groupByCategory && displayedGroups.length > 0 && (
            <div className="space-y-4">
              {displayedGroups.map(({ category, items: catItems }) => (
                <div key={category.id} className="space-y-1.5">
                  {/* Titre de rayon */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#1C1917]">
                      <span className="text-sm">{category.emoji}</span>
                      <span>{category.name}</span>
                      <span className="text-[10px] font-semibold text-[#A8A29E] bg-[#F5F5F4] px-1.5 py-0.5 rounded-full">
                        {catItems.length}
                      </span>
                    </div>
                  </div>

                  {/* Liste d'articles groupés */}
                  <div className="bg-white rounded-2xl border border-[#E7E5E4] overflow-hidden divide-y divide-[#F5F5F4]">
                    {catItems.map((item) => {
                      const authorName = item.added_by
                        ? memberMap.get(item.added_by)
                        : null

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between px-3.5 py-3 hover:bg-[#FFFDF9] transition"
                        >
                          <div
                            onClick={() => toggleItem(item)}
                            className="flex items-center gap-3.5 flex-1 cursor-pointer select-none min-w-0"
                          >
                            {/* Checkbox ronde */}
                            <button
                              type="button"
                              aria-label="Cocher l'article"
                              className="w-[22px] h-[22px] rounded-full border-[1.8px] border-[#D6D3D1] hover:border-[#F97316] active:scale-90 flex items-center justify-center transition shrink-0 bg-white"
                            />

                            <div className="min-w-0 flex-1">
                              <span className="text-[15px] font-semibold text-[#1C1917] leading-snug truncate block">
                                {item.name}
                              </span>
                              {authorName && (
                                <span className="text-[11px] text-[#A8A29E] block mt-0.5 truncate">
                                  Ajouté par {authorName}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => deleteItem(item.id)}
                            aria-label="Supprimer l'article"
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[#D6D3D1] hover:text-[#EF4444] active:bg-black/5 transition shrink-0 ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AFFICHAGE LISTE SIMPLE (NON GROUPÉE) */}
          {!groupByCategory && displayedFlatItems.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E7E5E4] overflow-hidden divide-y divide-[#F5F5F4]">
              {displayedFlatItems.map((item) => {
                const authorName = item.added_by
                  ? memberMap.get(item.added_by)
                  : null

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3.5 py-3 hover:bg-[#FFFDF9] transition"
                  >
                    <div
                      onClick={() => toggleItem(item)}
                      className="flex items-center gap-3.5 flex-1 cursor-pointer select-none min-w-0"
                    >
                      {/* Checkbox ronde */}
                      <button
                        type="button"
                        aria-label="Cocher l'article"
                        className="w-[22px] h-[22px] rounded-full border-[1.8px] border-[#D6D3D1] hover:border-[#F97316] active:scale-90 flex items-center justify-center transition shrink-0 bg-white"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-semibold text-[#1C1917] leading-snug">
                            {item.name}
                          </span>
                          <span className="text-xs">{item.categoryInfo.emoji}</span>
                        </div>
                        {authorName && (
                          <span className="text-[11px] text-[#A8A29E] block mt-0.5 truncate">
                            Ajouté par {authorName}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => deleteItem(item.id)}
                      aria-label="Supprimer l'article"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#D6D3D1] hover:text-[#EF4444] active:bg-black/5 transition shrink-0 ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Section Panier / Articles achetés */}
          {checkedItems.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setShowChecked(!showChecked)}
                className="flex items-center justify-between w-full px-2 py-2 text-xs font-bold uppercase tracking-wider text-[#A8A29E] hover:text-[#1C1917] transition"
              >
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#22C55E] stroke-[3]" />
                  <span>Dans le panier ({checkedItems.length})</span>
                </div>
                {showChecked ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showChecked && (
                <div className="mt-1 bg-white/70 rounded-2xl border border-[#E7E5E4] overflow-hidden divide-y divide-[#F5F5F4]">
                  {checkedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-3.5 py-3 opacity-60 hover:opacity-100 transition"
                    >
                      <div
                        onClick={() => toggleItem(item)}
                        className="flex items-center gap-3.5 flex-1 cursor-pointer select-none min-w-0"
                      >
                        {/* Checkbox verte remplie */}
                        <div className="w-[22px] h-[22px] rounded-full bg-[#22C55E] text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>

                        <span className="line-through text-sm text-[#A8A29E] font-medium truncate">
                          {item.name}
                        </span>
                      </div>

                      <button
                        onClick={() => deleteItem(item.id)}
                        aria-label="Supprimer l'article acheté"
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[#D6D3D1] hover:text-[#EF4444] transition shrink-0 ml-2"
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
