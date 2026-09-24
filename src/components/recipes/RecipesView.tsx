'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Recipe } from '@/types/app'
import { useHousehold } from '@/context/HouseholdContext'
import { useAuth } from '@/context/AuthContext'
import {
  BookOpen,
  Plus,
  Search,
  Clock,
  Users,
  Trash2,
  Calendar,
  X,
  Loader2,
  ChefHat,
  ChevronRight,
  Tag,
  Check,
  FolderPlus,
} from 'lucide-react'

interface RecipesViewProps {
  onPlanRecipe?: (title: string) => void
}

const DEFAULT_PRESET_CATEGORIES = [
  'Plat',
  'Entrée',
  'Dessert',
  'Pâtes',
  'Végé',
  'Express',
  'Apéro',
  'Petit-déj',
]

export function RecipesView({ onPlanRecipe }: RecipesViewProps) {
  const { household } = useHousehold()
  const { user } = useAuth()
  const supabase = createClient()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Tous')

  // Catégories personnalisées mémorisées pour le foyer
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [isAddingCategoryInline, setIsAddingCategoryInline] = useState(false)
  const [newCategoryNameInput, setNewCategoryNameInput] = useState('')

  // Modale création recette
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('Plat')
  const [newPrepTime, setNewPrepTime] = useState('')
  const [newCookTime, setNewCookTime] = useState('')
  const [newServings, setNewServings] = useState('4')
  const [newIngredients, setNewIngredients] = useState('')
  const [newInstructions, setNewInstructions] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modale création rapide d'une catégorie
  const [isCreatingCategoryModal, setIsCreatingCategoryModal] = useState(false)
  const [quickCatInput, setQuickCatInput] = useState('')

  // Modale vue détaillée d'une recette
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null)
  const [isChangingCategory, setIsChangingCategory] = useState(false)

  // Charger les catégories personnalisées depuis le localStorage
  useEffect(() => {
    if (!household) return
    try {
      const stored = localStorage.getItem(`gestion_foyer_${household.id}_custom_categories`)
      if (stored) {
        setCustomCategories(JSON.parse(stored))
      }
    } catch {
      // Ignorer
    }
  }, [household])

  // Sauvegarder une nouvelle catégorie personnalisée
  const persistCustomCategory = useCallback(
    (catName: string) => {
      const trimmed = catName.trim()
      if (!trimmed || !household) return trimmed
      const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)

      setCustomCategories((prev) => {
        if (prev.includes(formatted)) return prev
        const updated = [...prev, formatted]
        try {
          localStorage.setItem(
            `gestion_foyer_${household.id}_custom_categories`,
            JSON.stringify(updated)
          )
        } catch {
          // Ignorer
        }
        return updated
      })

      return formatted
    },
    [household]
  )

  const fetchRecipes = useCallback(async () => {
    if (!household) return
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('household_id', household.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setRecipes(data as Recipe[])
      }
    } catch (err) {
      console.error('Erreur chargement recettes:', err)
    } finally {
      setLoading(false)
    }
  }, [household, supabase])

  useEffect(() => {
    fetchRecipes()
  }, [fetchRecipes])

  // Souscription Realtime Supabase
  useEffect(() => {
    if (!household) return

    const channel = supabase
      .channel(`recipes_${household.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recipes',
          filter: `household_id=eq.${household.id}`,
        },
        () => {
          fetchRecipes()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [household, supabase, fetchRecipes])

  // =========================================================================
  // CALCUL DES CATÉGORIES ET MASQUAGE DES CATÉGORIES VIDES
  // =========================================================================

  // Compte de recettes par catégorie
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    recipes.forEach((r) => {
      const cat = (r.category || 'Plat').trim()
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1
      }
    })
    return counts
  }, [recipes])

  // Catégories ACTIVES (ayant au moins 1 recette) -> masque les catégories vides !
  const activeCategories = useMemo(() => {
    return Object.keys(categoryCounts)
      .filter((cat) => categoryCounts[cat] > 0)
      .sort((a, b) => a.localeCompare(b, 'fr'))
  }, [categoryCounts])

  // Toutes les catégories disponibles pour le sélecteur d'ajout (presets + personnalisées + existantes)
  const availableCategoriesForCreation = useMemo(() => {
    const set = new Set<string>([
      ...DEFAULT_PRESET_CATEGORIES,
      ...customCategories,
      ...Object.keys(categoryCounts),
    ])
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'))
  }, [customCategories, categoryCounts])

  // Si la catégorie sélectionnée n'a plus de recettes, revenir sur 'Tous'
  useEffect(() => {
    if (selectedCategory !== 'Tous' && !activeCategories.includes(selectedCategory)) {
      setSelectedCategory('Tous')
    }
  }, [activeCategories, selectedCategory])

  // Création d'une nouvelle catégorie depuis la modale rapide
  const handleCreateCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickCatInput.trim()) return

    const formatted = persistCustomCategory(quickCatInput)
    setQuickCatInput('')
    setIsCreatingCategoryModal(false)

    // Ouvre directement la modale de création d'une recette avec cette catégorie
    setNewCategory(formatted)
    setIsCreating(true)
  }

  // Ajout d'une catégorie inline dans le formulaire de recette
  const handleAddInlineCategory = () => {
    if (!newCategoryNameInput.trim()) return
    const formatted = persistCustomCategory(newCategoryNameInput)
    setNewCategory(formatted)
    setNewCategoryNameInput('')
    setIsAddingCategoryInline(false)
  }

  // Création de recette
  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !household || !user) return

    setIsSubmitting(true)

    // Formater les ingrédients en tableau
    const ingArray = newIngredients
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)

    const finalCategory = (newCategory || 'Plat').trim()
    persistCustomCategory(finalCategory)

    try {
      const { data, error } = await supabase
        .from('recipes')
        .insert({
          household_id: household.id,
          title: newTitle.trim(),
          category: finalCategory,
          prep_time: newPrepTime.trim() || null,
          cook_time: newCookTime.trim() || null,
          servings: parseInt(newServings) || 4,
          ingredients: ingArray,
          instructions: newInstructions.trim() || null,
          created_by: user.id,
        })
        .select()
        .single()

      if (!error && data) {
        setRecipes((prev) => [data as Recipe, ...prev])
        // Réinitialisation
        setNewTitle('')
        setNewPrepTime('')
        setNewCookTime('')
        setNewIngredients('')
        setNewInstructions('')
        setIsCreating(false)
        setIsAddingCategoryInline(false)
      }
    } catch (err) {
      console.error('Erreur ajout recette:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Changement rapide de la catégorie d'une recette existante
  const handleUpdateRecipeCategory = async (recipeId: string, newCat: string) => {
    const formatted = persistCustomCategory(newCat)
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, category: formatted } : r))
    )
    if (activeRecipe && activeRecipe.id === recipeId) {
      setActiveRecipe({ ...activeRecipe, category: formatted })
    }
    setIsChangingCategory(false)

    try {
      await supabase
        .from('recipes')
        .update({ category: formatted, updated_at: new Date().toISOString() })
        .eq('id', recipeId)
    } catch (err) {
      console.error('Erreur mise à jour catégorie:', err)
      fetchRecipes()
    }
  }

  // Suppression d'une recette
  const handleDeleteRecipe = async (id: string) => {
    setRecipes((prev) => prev.filter((r) => r.id !== id))
    if (activeRecipe?.id === id) setActiveRecipe(null)

    try {
      await supabase.from('recipes').delete().eq('id', id)
    } catch (err) {
      console.error('Erreur suppression recette:', err)
      fetchRecipes()
    }
  }

  // Filtrage des recettes
  const filteredRecipes = recipes.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.instructions &&
        r.instructions.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCat =
      selectedCategory === 'Tous' ||
      (r.category && r.category.toLowerCase() === selectedCategory.toLowerCase())
    return matchesSearch && matchesCat
  })

  return (
    <div className="space-y-4">
      {/* Barre de recherche & boutons d'actions */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-white border border-[#E5E5EA] rounded-2xl p-2 px-3 flex items-center gap-2 shadow-2xs">
          <Search className="w-4 h-4 text-[#8E8E93]" />
          <input
            type="text"
            placeholder="Rechercher une recette..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[#1C1C1E] placeholder-[#8E8E93] focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[#8E8E93] hover:text-[#1C1C1E]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Bouton Ajouter Catégorie */}
        <button
          onClick={() => setIsCreatingCategoryModal(true)}
          title="Ajouter une catégorie"
          className="h-10 px-3 rounded-2xl bg-white border border-[#E5E5EA] text-[#1C1C1E] hover:border-[#007AFF]/40 text-xs font-semibold flex items-center gap-1.5 shadow-2xs active:bg-[#F2F2F7] transition shrink-0"
        >
          <FolderPlus className="w-4 h-4 text-[#007AFF]" />
          <span className="hidden xs:inline">Catégorie</span>
        </button>

        {/* Bouton Nouvelle Recette */}
        <button
          onClick={() => {
            setIsAddingCategoryInline(false)
            setIsCreating(true)
          }}
          className="h-10 px-3.5 rounded-2xl bg-[#007AFF] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs active:scale-95 transition shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nouvelle</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* FILTRES PAR CATÉGORIES (MASQUE LES CATÉGORIES VIDES)     */}
      {/* ======================================================== */}
      {recipes.length > 0 && activeCategories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {/* Pastille 'Tous' */}
          <button
            onClick={() => setSelectedCategory('Tous')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              selectedCategory === 'Tous'
                ? 'bg-[#1C1C1E] text-white shadow-xs'
                : 'bg-white border border-[#E5E5EA] text-[#8E8E93] hover:text-[#1C1C1E]'
            }`}
          >
            <span>Tous</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedCategory === 'Tous'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#F2F2F7] text-[#8E8E93]'
              }`}
            >
              {recipes.length}
            </span>
          </button>

          {/* Uniquement les catégories qui ont au moins 1 recette */}
          {activeCategories.map((cat) => {
            const count = categoryCounts[cat] || 0
            const isSelected = selectedCategory === cat

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#007AFF] text-white shadow-xs'
                    : 'bg-white border border-[#E5E5EA] text-[#8E8E93] hover:text-[#1C1C1E]'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-white/25 text-white'
                      : 'bg-[#F2F2F7] text-[#8E8E93]'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* LISTE DES RECETTES                                       */}
      {/* ======================================================== */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#007AFF] animate-spin" />
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-[#E5E5EA] shadow-xs text-center">
          <ChefHat className="w-8 h-8 text-[#C7C7CC] mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-[#1C1C1E]">
            {searchQuery
              ? 'Aucune recette trouvée'
              : selectedCategory !== 'Tous'
              ? `Aucune recette dans « ${selectedCategory} »`
              : 'Votre carnet de recettes est vide'}
          </h3>
          <p className="text-xs text-[#8E8E93] mt-0.5 max-w-xs mx-auto">
            {searchQuery
              ? 'Essayez une autre recherche.'
              : selectedCategory !== 'Tous'
              ? 'Sélectionnez une autre catégorie ou ajoutez une recette.'
              : 'Enregistrez vos plats préférés, ingrédients et temps de cuisson pour les planifier en un clic.'}
          </p>

          {!searchQuery && recipes.length === 0 && (
            <button
              onClick={() => setIsCreating(true)}
              className="mt-4 px-4 py-2 rounded-2xl bg-[#007AFF] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Créer ma première recette</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {filteredRecipes.map((recipe) => {
            const ingList = Array.isArray(recipe.ingredients)
              ? recipe.ingredients
              : typeof recipe.ingredients === 'string'
              ? [recipe.ingredients]
              : []

            return (
              <div
                key={recipe.id}
                onClick={() => {
                  setActiveRecipe(recipe)
                  setIsChangingCategory(false)
                }}
                className="bg-white rounded-2xl border border-[#E5E5EA] p-3.5 shadow-xs hover:border-[#007AFF]/40 active:scale-[0.99] transition cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-[#1C1C1E] truncate">
                      {recipe.title}
                    </span>
                    {recipe.category && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#007AFF]/10 text-[#007AFF] shrink-0">
                        {recipe.category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#8E8E93]">
                    {(recipe.prep_time || recipe.cook_time) && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {recipe.prep_time || recipe.cook_time}
                      </span>
                    )}
                    {recipe.servings && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {recipe.servings} pers.
                      </span>
                    )}
                    {ingList.length > 0 && (
                      <span>
                        {ingList.length} ingrédient{ingList.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-[#C7C7CC] shrink-0" />
              </div>
            )
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE : CRÉATION RAPIDE D'UNE CATÉGORIE                 */}
      {/* ======================================================== */}
      {isCreatingCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsCreatingCategoryModal(false)}
          />
          <div className="relative w-full max-w-sm bg-white rounded-t-[28px] sm:rounded-3xl p-6 shadow-2xl z-10 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="w-9 h-1 rounded-full bg-[#C7C7CC] mx-auto -mt-2 mb-2 sm:hidden" />

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1C1C1E]">
                  Nouvelle catégorie
                </h3>
                <p className="text-xs text-[#8E8E93]">
                  Créez une catégorie pour classer vos recettes
                </p>
              </div>
              <button
                onClick={() => setIsCreatingCategoryModal(false)}
                className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#8E8E93]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] mb-1.5">
                  Nom de la catégorie *
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="ex: Soupes, Tartes, Asiatique, Brunch..."
                  value={quickCatInput}
                  onChange={(e) => setQuickCatInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#F2F2F7] text-[#1C1C1E] text-sm focus:outline-none focus:ring-1 focus:ring-[#007AFF] transition"
                />
              </div>

              <div className="text-[11px] text-[#8E8E93]">
                💡 La catégorie apparaîtra automatiquement dans les filtres dès qu&apos;elle comportera au moins une recette.
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingCategoryModal(false)}
                  className="px-4 py-3 rounded-2xl bg-[#F2F2F7] text-[#8E8E93] text-xs font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!quickCatInput.trim()}
                  className="flex-1 py-3 rounded-2xl bg-[#007AFF] text-white text-xs font-semibold transition active:scale-[0.98] shadow-xs disabled:opacity-40"
                >
                  Créer & Ajouter une recette
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE : CRÉER UNE NOUVELLE RECETTE                      */}
      {/* ======================================================== */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsCreating(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-[28px] sm:rounded-3xl p-6 shadow-2xl z-10 space-y-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="w-9 h-1 rounded-full bg-[#C7C7CC] mx-auto -mt-2 mb-2 sm:hidden" />

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1C1C1E]">
                  Nouvelle recette
                </h3>
                <p className="text-xs text-[#8E8E93]">
                  Enregistrez la recette pour tout le foyer
                </p>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#8E8E93]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRecipe} className="space-y-4">
              {/* Titre */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] mb-1.5">
                  Nom du plat *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="ex: Risotto crémeux aux champignons"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#F2F2F7] text-[#1C1C1E] text-sm focus:outline-none focus:ring-1 focus:ring-[#007AFF] transition"
                />
              </div>

              {/* Sélecteur de Catégorie & Ajout personnalisé */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                    Catégorie
                  </label>
                  {!isAddingCategoryInline && (
                    <button
                      type="button"
                      onClick={() => setIsAddingCategoryInline(true)}
                      className="text-xs text-[#007AFF] font-semibold flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nouvelle catégorie</span>
                    </button>
                  )}
                </div>

                {/* Champ d'ajout rapide d'une nouvelle catégorie */}
                {isAddingCategoryInline ? (
                  <div className="flex items-center gap-2 p-1.5 bg-[#F2F2F7] rounded-2xl">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Nom (ex: Soupes, Asiatique...)"
                      value={newCategoryNameInput}
                      onChange={(e) => setNewCategoryNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddInlineCategory()
                        }
                      }}
                      className="flex-1 px-3 py-1.5 bg-white rounded-xl text-xs font-semibold text-[#1C1C1E] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddInlineCategory}
                      disabled={!newCategoryNameInput.trim()}
                      className="px-3 py-1.5 bg-[#007AFF] text-white rounded-xl text-xs font-semibold disabled:opacity-40"
                    >
                      Ajouter
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCategoryInline(false)
                        setNewCategoryNameInput('')
                      }}
                      className="p-1.5 text-[#8E8E93]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  /* Pastilles de sélection des catégories */
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-[#F2F2F7] rounded-2xl">
                    {availableCategoriesForCreation.map((cat) => {
                      const isSelected = newCategory === cat
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewCategory(cat)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                            isSelected
                              ? 'bg-[#007AFF] text-white shadow-2xs'
                              : 'bg-white text-[#1C1C1E] hover:bg-white/80'
                          }`}
                        >
                          {cat}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Portions & Temps */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] mb-1.5">
                    Personnes
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    placeholder="4"
                    value={newServings}
                    onChange={(e) => setNewServings(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#F2F2F7] text-[#1C1C1E] text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] mb-1.5">
                    Prépa
                  </label>
                  <input
                    type="text"
                    placeholder="ex: 15 min"
                    value={newPrepTime}
                    onChange={(e) => setNewPrepTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#F2F2F7] text-[#1C1C1E] text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] mb-1.5">
                    Cuisson
                  </label>
                  <input
                    type="text"
                    placeholder="ex: 25 min"
                    value={newCookTime}
                    onChange={(e) => setNewCookTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#F2F2F7] text-[#1C1C1E] text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Ingrédients */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] mb-1.5">
                  Ingrédients (un par ligne)
                </label>
                <textarea
                  rows={3}
                  placeholder="300g riz arborio&#10;200g champignons&#10;1 oignon&#10;parmesan râpé"
                  value={newIngredients}
                  onChange={(e) => setNewIngredients(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#F2F2F7] text-[#1C1C1E] text-xs focus:outline-none leading-relaxed"
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] mb-1.5">
                  Préparation / Étapes
                </label>
                <textarea
                  rows={4}
                  placeholder="Faire revenir l'oignon et les champignons. Ajouter le riz..."
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#F2F2F7] text-[#1C1C1E] text-xs focus:outline-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !newTitle.trim()}
                className="w-full py-3.5 rounded-2xl bg-[#007AFF] text-white text-sm font-semibold transition active:scale-[0.98] shadow-xs disabled:opacity-40"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Enregistrer la recette'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE : DÉTAIL D'UNE RECETTE                            */}
      {/* ======================================================== */}
      {activeRecipe && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setActiveRecipe(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-[28px] sm:rounded-3xl p-6 shadow-2xl z-10 space-y-5 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="w-9 h-1 rounded-full bg-[#C7C7CC] mx-auto -mt-2 mb-2 sm:hidden" />

            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                {/* Catégorie avec possibilité de changer */}
                <div className="flex items-center gap-2 mb-1.5">
                  {isChangingCategory ? (
                    <div className="flex flex-wrap gap-1 items-center p-1 bg-[#F2F2F7] rounded-xl max-h-24 overflow-y-auto">
                      {availableCategoriesForCreation.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleUpdateRecipeCategory(activeRecipe.id, cat)}
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg transition ${
                            activeRecipe.category === cat
                              ? 'bg-[#007AFF] text-white'
                              : 'bg-white text-[#1C1C1E]'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setIsChangingCategory(false)}
                        className="text-[11px] px-1.5 py-0.5 text-[#8E8E93]"
                      >
                        Fermer
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsChangingCategory(true)}
                      title="Modifier la catégorie"
                      className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF]/20 transition flex items-center gap-1"
                    >
                      <Tag className="w-3 h-3" />
                      <span>{activeRecipe.category || 'Plat'}</span>
                    </button>
                  )}

                  {activeRecipe.servings && (
                    <span className="text-xs text-[#8E8E93]">
                      {activeRecipe.servings} personnes
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-extrabold text-[#1C1C1E] tracking-tight">
                  {activeRecipe.title}
                </h2>
              </div>

              <button
                onClick={() => setActiveRecipe(null)}
                className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#8E8E93] shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Badges de temps */}
            {(activeRecipe.prep_time || activeRecipe.cook_time) && (
              <div className="flex items-center gap-4 bg-[#F2F2F7] p-3 rounded-2xl text-xs text-[#1C1C1E] font-medium">
                {activeRecipe.prep_time && (
                  <div>
                    <span className="text-[#8E8E93] block text-[10px] uppercase font-semibold">
                      Préparation
                    </span>
                    <span>{activeRecipe.prep_time}</span>
                  </div>
                )}
                {activeRecipe.cook_time && (
                  <div>
                    <span className="text-[#8E8E93] block text-[10px] uppercase font-semibold">
                      Cuisson
                    </span>
                    <span>{activeRecipe.cook_time}</span>
                  </div>
                )}
              </div>
            )}

            {/* Ingrédients */}
            {activeRecipe.ingredients && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93] mb-2">
                  Ingrédients
                </h4>
                <div className="bg-[#F2F2F7] rounded-2xl p-3.5 space-y-1.5 text-xs text-[#1C1C1E]">
                  {(Array.isArray(activeRecipe.ingredients)
                    ? activeRecipe.ingredients
                    : [activeRecipe.ingredients]
                  ).map((ing: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF] shrink-0" />
                      <span>{String(ing)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            {activeRecipe.instructions && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93] mb-2">
                  Préparation
                </h4>
                <div className="text-xs text-[#1C1C1E] leading-relaxed whitespace-pre-line bg-[#F2F2F7] p-3.5 rounded-2xl">
                  {activeRecipe.instructions}
                </div>
              </div>
            )}

            {/* Actions : Planifier ou Supprimer */}
            <div className="pt-2 flex items-center gap-2 border-t border-[#E5E5EA]">
              {onPlanRecipe && (
                <button
                  onClick={() => {
                    onPlanRecipe(activeRecipe.title)
                    setActiveRecipe(null)
                  }}
                  className="flex-1 py-3 rounded-2xl bg-[#007AFF] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Planifier dans la semaine</span>
                </button>
              )}
              <button
                onClick={() => handleDeleteRecipe(activeRecipe.id)}
                className="p-3 rounded-2xl bg-[#FF3B30]/10 text-[#FF3B30] text-xs font-semibold hover:bg-[#FF3B30]/20 transition shrink-0"
                title="Supprimer la recette"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
