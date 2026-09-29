'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MealPlan, MealIdea } from '@/types/app'
import { useHousehold } from '@/context/HouseholdContext'
import { useAuth } from '@/context/AuthContext'
import {
  CalendarDays,
  Lightbulb,
  BookOpen,
  Plus,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Sparkles,
  Dice5,
  Loader2,
  X,
  Edit2,
  ArrowRight,
  ShoppingBag,
} from 'lucide-react'
import { RecipesView } from '@/components/recipes/RecipesView'

// Obtenir le lundi d'une date donnée
function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(date.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

// Formater une date en YYYY-MM-DD
function formatDateISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const DAYS_NAMES = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
]

export function MealsView() {
  const { household, members } = useHousehold()
  const { user } = useAuth()
  const supabase = createClient()

  // Onglet sous-navigation : 'week' | 'recipes' | 'ideas'
  const [subTab, setSubTab] = useState<'week' | 'recipes' | 'ideas'>('week')

  // Semaine sélectionnée (commence le lundi)
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))

  // Données
  const [mealPlans, setMealPlans] = useState<{ [dateKey: string]: MealPlan }>({})
  const [ideas, setIdeas] = useState<MealIdea[]>([])
  const [loading, setLoading] = useState(true)

  // Modale d'édition d'un repas
  const [editingDay, setEditingDay] = useState<{
    date: string
    dayLabel: string
    mealType: 'lunch' | 'dinner'
    currentValue: string
  } | null>(null)
  const [mealInputValue, setMealInputValue] = useState('')

  // Modale d'assignation d'une idée à un jour
  const [assigningIdea, setAssigningIdea] = useState<MealIdea | null>(null)

  // Nouvelle idée
  const [newIdeaTitle, setNewIdeaTitle] = useState('')
  const [isSubmittingIdea, setIsSubmittingIdea] = useState(false)

  // Notification d'ajout aux courses
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Roulette / Idée aléatoire
  const [randomIdea, setRandomIdea] = useState<MealIdea | null>(null)

  const memberMap = new Map(members.map((m) => [m.user_id, m.user?.name || 'Membre']))
  const todayISO = formatDateISO(new Date())

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2500)
  }

  const addMealToShopping = async (mealTitle: string) => {
    if (!household || !user || !mealTitle.trim()) return
    try {
      await supabase.from('shopping_items').insert({
        household_id: household.id,
        name: mealTitle.trim(),
        quantity: null,
        checked: false,
        added_by: user.id,
      })
      showToast(`« ${mealTitle} » ajouté aux courses !`)
    } catch (err) {
      console.error('Erreur ajout repas aux courses:', err)
    }
  }

  // Calcul des 7 jours de la semaine affichée
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const dayDate = new Date(weekStart)
    dayDate.setDate(weekStart.getDate() + i)
    return {
      name: DAYS_NAMES[i],
      date: dayDate,
      iso: formatDateISO(dayDate),
      isToday: formatDateISO(dayDate) === todayISO,
      formattedLabel: new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
      }).format(dayDate),
    }
  })

  // Navigation semaines
  const prevWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
  }

  const nextWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })
  }

  const goToCurrentWeek = () => {
    setWeekStart(getMonday(new Date()))
  }

  const isCurrentWeek =
    formatDateISO(weekStart) === formatDateISO(getMonday(new Date()))

  // Titre de la semaine
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekRangeLabel = `${new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  }).format(weekStart)} – ${new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(weekEnd)}`

  // Charger les repas de la semaine
  const fetchWeekMeals = useCallback(async () => {
    if (!household) return
    const startStr = formatDateISO(weekStart)
    const endStr = formatDateISO(weekEnd)

    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('household_id', household.id)
        .gte('date', startStr)
        .lte('date', endStr)

      if (!error && data) {
        const map: { [key: string]: MealPlan } = {}
        data.forEach((p: MealPlan) => {
          map[p.date] = p
        })
        setMealPlans(map)
      }
    } catch (err) {
      console.error('Erreur chargement repas:', err)
    }
  }, [household, weekStart, supabase])

  // Charger les idées de repas
  const fetchIdeas = useCallback(async () => {
    if (!household) return
    try {
      const { data, error } = await supabase
        .from('meal_ideas')
        .select('*')
        .eq('household_id', household.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setIdeas(data as MealIdea[])
      }
    } catch (err) {
      console.error('Erreur chargement idées:', err)
    }
  }, [household, supabase])

  // Chargement global initial
  useEffect(() => {
    if (!household) return
    setLoading(true)
    Promise.all([fetchWeekMeals(), fetchIdeas()]).finally(() => {
      setLoading(false)
    })
  }, [household, fetchWeekMeals, fetchIdeas])

  // Realtime Supabase
  useEffect(() => {
    if (!household) return

    const channel = supabase
      .channel(`meals_${household.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meal_plans',
          filter: `household_id=eq.${household.id}`,
        },
        () => {
          fetchWeekMeals()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meal_ideas',
          filter: `household_id=eq.${household.id}`,
        },
        () => {
          fetchIdeas()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [household, supabase, fetchWeekMeals, fetchIdeas])

  // Sauvegarder un repas (midi ou soir)
  const saveMeal = async (date: string, type: 'lunch' | 'dinner', value: string) => {
    if (!household) return
    const cleanVal = value.trim() || null

    const existing = mealPlans[date]

    try {
      if (existing) {
        const updatePayload: any = {
          [type]: cleanVal,
          updated_at: new Date().toISOString(),
        }

        setMealPlans((prev) => ({
          ...prev,
          [date]: { ...prev[date], [type]: cleanVal },
        }))

        await supabase
          .from('meal_plans')
          .update(updatePayload)
          .eq('id', existing.id)
      } else {
        const insertPayload: any = {
          household_id: household.id,
          date,
          lunch: type === 'lunch' ? cleanVal : null,
          dinner: type === 'dinner' ? cleanVal : null,
        }

        const { data } = await supabase
          .from('meal_plans')
          .insert(insertPayload)
          .select()
          .single()

        if (data) {
          setMealPlans((prev) => ({ ...prev, [date]: data as MealPlan }))
        }
      }
    } catch (err) {
      console.error('Erreur sauvegarde repas:', err)
      fetchWeekMeals()
    }
  }

  // Ajouter une idée de repas
  const handleAddIdea = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newIdeaTitle.trim() || !household || !user) return

    setIsSubmittingIdea(true)
    const title = newIdeaTitle.trim()

    try {
      const { data, error } = await supabase
        .from('meal_ideas')
        .insert({
          household_id: household.id,
          title,
          added_by: user.id,
        })
        .select()
        .single()

      if (!error && data) {
        setIdeas((prev) => [data as MealIdea, ...prev])
        setNewIdeaTitle('')
      }
    } catch (err) {
      console.error('Erreur ajout idée:', err)
    } finally {
      setIsSubmittingIdea(false)
    }
  }

  // Supprimer une idée
  const handleDeleteIdea = async (id: string) => {
    setIdeas((prev) => prev.filter((i) => i.id !== id))
    try {
      await supabase.from('meal_ideas').delete().eq('id', id)
    } catch (err) {
      console.error('Erreur suppression idée:', err)
      fetchIdeas()
    }
  }

  // Assigner une idée ou recette à un jour
  const assignIdeaToDay = async (date: string, type: 'lunch' | 'dinner') => {
    if (!assigningIdea) return
    await saveMeal(date, type, assigningIdea.title)
    setAssigningIdea(null)
    setSubTab('week')
    showToast(`Repas planifié pour le ${type === 'lunch' ? 'midi' : 'soir'} !`)
  }

  // Tirer une idée au sort
  const pickRandomIdea = () => {
    if (ideas.length === 0) return
    const random = ideas[Math.floor(Math.random() * ideas.length)]
    setRandomIdea(random)
  }

  return (
    <div className="space-y-4 tabbar-offset">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#1C1917] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200">
          <Check className="w-4 h-4 text-[#22C55E] stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="pt-1 pb-1 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1C1917]">
            Menus
          </h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            Planning des repas & idées du foyer
          </p>
        </div>

        {/* Bouton Aujourd'hui si hors semaine courante */}
        {!isCurrentWeek && subTab === 'week' && (
          <button
            onClick={goToCurrentWeek}
            className="text-xs font-semibold text-[#F97316] bg-white border border-[#E7E5E4] px-2.5 py-1 rounded-full active:bg-[#FFFDF9] transition"
          >
            Aujourd&apos;hui
          </button>
        )}
      </div>

      {/* Segmented Control : Semaine vs Recettes vs Idées */}
      <div className="grid grid-cols-3 p-1 bg-[#F5F5F4] border border-[#E7E5E4] rounded-2xl">
        <button
          onClick={() => setSubTab('week')}
          className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition select-none ${
            subTab === 'week'
              ? 'bg-white text-[#1C1917] shadow-sm'
              : 'text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          <CalendarDays className="w-4 h-4 shrink-0" />
          <span>Semaine</span>
        </button>
        <button
          onClick={() => setSubTab('recipes')}
          className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition select-none ${
            subTab === 'recipes'
              ? 'bg-white text-[#1C1917] shadow-sm'
              : 'text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span>Recettes</span>
        </button>
        <button
          onClick={() => setSubTab('ideas')}
          className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition select-none ${
            subTab === 'ideas'
              ? 'bg-white text-[#1C1917] shadow-sm'
              : 'text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          <Lightbulb className="w-4 h-4 shrink-0" />
          <span>Idées ({ideas.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* VUE 1 : PLANNING DE LA SEMAINE (LUNDI AU DIMANCHE)       */}
      {/* ======================================================== */}
      {subTab === 'week' && (
        <div className="space-y-4">
          {/* Navigateur de semaine */}
          <div className="flex items-center justify-between bg-white border border-[#E7E5E4] rounded-2xl p-1.5 px-3">
            <button
              onClick={prevWeek}
              className="p-1.5 rounded-xl text-[#A8A29E] hover:text-[#1C1917] active:bg-[#F5F5F4] transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold text-[#1C1917]">
              {weekRangeLabel}
            </span>
            <button
              onClick={nextWeek}
              className="p-1.5 rounded-xl text-[#A8A29E] hover:text-[#1C1917] active:bg-[#F5F5F4] transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-7 h-7 text-[#F97316] animate-spin" />
            </div>
          ) : (
            /* Liste des 7 jours */
            <div className="space-y-3">
              {weekDays.map((day) => {
                const plan = mealPlans[day.iso]
                const lunch = plan?.lunch
                const dinner = plan?.dinner

                return (
                  <div
                    key={day.iso}
                    className={`bg-white rounded-2xl border transition overflow-hidden ${
                      day.isToday
                        ? 'border-[#F97316] ring-1 ring-[#F97316]/20'
                        : 'border-[#E7E5E4]'
                    }`}
                  >
                    {/* En-tête du jour */}
                    <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#FFFDF9] border-b border-[#F5F5F4]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#1C1917]">
                          {day.name}
                        </span>
                        <span className="text-xs text-[#A8A29E] font-medium">
                          {day.formattedLabel}
                        </span>
                      </div>
                      {day.isToday && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F97316] text-white">
                          Aujourd&apos;hui
                        </span>
                      )}
                    </div>

                    {/* Créneaux Midi et Soir */}
                    <div className="divide-y divide-[#F5F5F4]">
                      {/* MIDI */}
                      <div className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#F97316]/10 text-[#F97316] text-xs font-bold w-16 shrink-0 justify-center">
                          <Sun className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Midi</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          {lunch ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-[#1C1917] truncate">
                                {lunch}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => addMealToShopping(lunch)}
                                  title="Ajouter aux courses"
                                  className="w-7 h-7 rounded-lg text-[#A8A29E] hover:text-[#F97316] hover:bg-[#F97316]/10 flex items-center justify-center transition"
                                >
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingDay({
                                      date: day.iso,
                                      dayLabel: `${day.name} midi`,
                                      mealType: 'lunch',
                                      currentValue: lunch,
                                    })
                                    setMealInputValue(lunch)
                                  }}
                                  title="Modifier"
                                  className="w-7 h-7 rounded-lg text-[#A8A29E] hover:text-[#1C1917] hover:bg-[#F5F5F4] flex items-center justify-center transition"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => saveMeal(day.iso, 'lunch', '')}
                                  title="Supprimer"
                                  className="w-7 h-7 rounded-lg text-[#A8A29E] hover:text-[#EF4444] hover:bg-[#F5F5F4] flex items-center justify-center transition"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingDay({
                                  date: day.iso,
                                  dayLabel: `${day.name} midi`,
                                  mealType: 'lunch',
                                  currentValue: '',
                                })
                                setMealInputValue('')
                              }}
                              className="w-full text-xs text-[#A8A29E] hover:text-[#F97316] font-medium py-1.5 px-3 rounded-xl border border-dashed border-[#E7E5E4] hover:border-[#F97316]/40 hover:bg-[#F97316]/5 transition flex items-center gap-1.5 justify-center"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Planifier le midi</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* SOIR */}
                      <div className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#8B5CF6]/10 text-[#8B5CF6] text-xs font-bold w-16 shrink-0 justify-center">
                          <Moon className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Soir</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          {dinner ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-[#1C1917] truncate">
                                {dinner}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => addMealToShopping(dinner)}
                                  title="Ajouter aux courses"
                                  className="w-7 h-7 rounded-lg text-[#A8A29E] hover:text-[#F97316] hover:bg-[#F97316]/10 flex items-center justify-center transition"
                                >
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingDay({
                                      date: day.iso,
                                      dayLabel: `${day.name} soir`,
                                      mealType: 'dinner',
                                      currentValue: dinner,
                                    })
                                    setMealInputValue(dinner)
                                  }}
                                  title="Modifier"
                                  className="w-7 h-7 rounded-lg text-[#A8A29E] hover:text-[#1C1917] hover:bg-[#F5F5F4] flex items-center justify-center transition"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => saveMeal(day.iso, 'dinner', '')}
                                  title="Supprimer"
                                  className="w-7 h-7 rounded-lg text-[#A8A29E] hover:text-[#EF4444] hover:bg-[#F5F5F4] flex items-center justify-center transition"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingDay({
                                  date: day.iso,
                                  dayLabel: `${day.name} soir`,
                                  mealType: 'dinner',
                                  currentValue: '',
                                })
                                setMealInputValue('')
                              }}
                              className="w-full text-xs text-[#A8A29E] hover:text-[#8B5CF6] font-medium py-1.5 px-3 rounded-xl border border-dashed border-[#E7E5E4] hover:border-[#8B5CF6]/40 hover:bg-[#8B5CF6]/5 transition flex items-center gap-1.5 justify-center"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Planifier le soir</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VUE 2 : MES RECETTES SAUVEGARDÉES                        */}
      {/* ======================================================== */}
      {subTab === 'recipes' && (
        <RecipesView
          onPlanRecipe={(title) => {
            setAssigningIdea({
              id: 'recipe-' + Date.now(),
              household_id: household?.id || '',
              title,
              description: null,
              added_by: null,
              created_at: new Date().toISOString(),
            })
          }}
        />
      )}

      {/* ======================================================== */}
      {/* VUE 3 : BOÎTE À IDÉES DE REPAS                           */}
      {/* ======================================================== */}
      {subTab === 'ideas' && (
        <div className="space-y-4">
          {/* Formulaire d'ajout d'une idée */}
          <form
            onSubmit={handleAddIdea}
            className="bg-white rounded-2xl p-2.5 border border-[#E7E5E4] flex items-center gap-2"
          >
            <div className="w-7 h-7 rounded-full bg-[#F97316]/10 text-[#F97316] flex items-center justify-center shrink-0">
              <Lightbulb className="w-4 h-4 stroke-[2.5]" />
            </div>
            <input
              type="text"
              placeholder="Une envie ? (ex: Lasagnes, Tacos, Risotto...)"
              value={newIdeaTitle}
              onChange={(e) => setNewIdeaTitle(e.target.value)}
              className="flex-1 bg-transparent text-[#1C1917] placeholder-[#A8A29E] text-[15px] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newIdeaTitle.trim() || isSubmittingIdea}
              className="px-3.5 py-1.5 rounded-xl bg-[#F97316] text-white text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition shrink-0 active:scale-95"
            >
              {isSubmittingIdea ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                'Ajouter'
              )}
            </button>
          </form>

          {/* Bouton roulette magique */}
          {ideas.length > 1 && (
            <div className="bg-[#F97316]/5 border border-[#F97316]/15 rounded-2xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#F97316] text-white flex items-center justify-center">
                  <Dice5 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#1C1917]">
                    Pas d&apos;idée ce soir ?
                  </div>
                  <div className="text-[11px] text-[#78716C]">
                    Piocher au hasard dans la boîte à idées
                  </div>
                </div>
              </div>
              <button
                onClick={pickRandomIdea}
                className="px-3 py-1.5 rounded-xl bg-[#F97316] text-white text-xs font-semibold active:scale-95 transition shrink-0"
              >
                Tirer au sort
              </button>
            </div>
          )}

          {/* Résultat du tirage au sort */}
          {randomIdea && (
            <div className="bg-white border-2 border-[#F97316] rounded-2xl p-4 space-y-2 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#F97316] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Idée sélectionnée
                </span>
                <button
                  onClick={() => setRandomIdea(null)}
                  className="text-[#A8A29E] hover:text-[#1C1917]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-base font-bold text-[#1C1917]">
                {randomIdea.title}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setAssigningIdea(randomIdea)
                    setRandomIdea(null)
                  }}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-[#F97316] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <span>Planifier pour cette semaine</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Liste des idées */}
          {ideas.length === 0 ? (
            <div className="py-10 text-center">
              <Lightbulb className="w-8 h-8 text-[#D6D3D1] mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-[#1C1917]">
                Aucune idée enregistrée
              </h3>
              <p className="text-sm text-[#78716C] mt-0.5">
                Notez les plats que vous aimez pour les retrouver et les planifier facilement.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E7E5E4] overflow-hidden divide-y divide-[#F5F5F4]">
              {ideas.map((idea) => {
                const authorName = idea.added_by
                  ? memberMap.get(idea.added_by)
                  : null

                return (
                  <div
                    key={idea.id}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#FFFDF9] transition"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-[#1C1917]">
                        {idea.title}
                      </div>
                      {authorName && (
                        <div className="text-[11px] text-[#A8A29E] mt-0.5">
                          Proposé par {authorName}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setAssigningIdea(idea)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#F97316]/10 text-[#F97316] hover:bg-[#F97316] hover:text-white text-xs font-semibold transition"
                      >
                        Planifier
                      </button>
                      <button
                        onClick={() => handleDeleteIdea(idea.id)}
                        className="w-8 h-8 rounded-xl text-[#D6D3D1] hover:text-[#EF4444] flex items-center justify-center transition"
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
      )}

      {/* ======================================================== */}
      {/* MODALE D'ÉDITION D'UN REPAS (MIDI OU SOIR)               */}
      {/* ======================================================== */}
      {editingDay && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setEditingDay(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-lg z-10 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="w-9 h-1 rounded-full bg-[#D6D3D1] mx-auto -mt-2 mb-2 sm:hidden" />

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1C1917]">
                  Repas du {editingDay.dayLabel}
                </h3>
                <p className="text-xs text-[#78716C]">
                  Qu&apos;avez-vous prévu de manger ?
                </p>
              </div>
              <button
                onClick={() => setEditingDay(null)}
                className="w-8 h-8 rounded-full bg-[#F5F5F4] flex items-center justify-center text-[#78716C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                saveMeal(editingDay.date, editingDay.mealType, mealInputValue)
                setEditingDay(null)
              }}
              className="space-y-4"
            >
              <input
                type="text"
                autoFocus
                placeholder="ex: Gratin dauphinois, Salade composée..."
                value={mealInputValue}
                onChange={(e) => setMealInputValue(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[#FFFDF9] text-[#1C1917] placeholder-[#A8A29E] text-sm focus:outline-none focus:ring-1 focus:ring-[#F97316] transition border border-[#E7E5E4]"
              />

              {/* Suggestions rapides depuis la boîte à idées */}
              {ideas.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A8A29E] mb-1.5">
                    Piocher dans vos idées :
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {ideas.slice(0, 8).map((idea) => (
                      <button
                        key={idea.id}
                        type="button"
                        onClick={() => setMealInputValue(idea.title)}
                        className="text-xs px-2.5 py-1 rounded-full bg-[#F5F5F4] hover:bg-[#F97316]/10 hover:text-[#F97316] text-[#1C1917] transition font-medium"
                      >
                        {idea.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    saveMeal(editingDay.date, editingDay.mealType, '')
                    setEditingDay(null)
                  }}
                  className="px-4 py-3 rounded-2xl bg-[#F5F5F4] text-[#78716C] hover:text-[#EF4444] text-xs font-semibold transition"
                >
                  Effacer
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-[#F97316] text-white text-sm font-semibold transition active:scale-[0.98]"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE D'ASSIGNATION D'UNE IDÉE À UN JOUR                */}
      {/* ======================================================== */}
      {assigningIdea && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setAssigningIdea(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-lg z-10 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="w-9 h-1 rounded-full bg-[#D6D3D1] mx-auto -mt-2 mb-2 sm:hidden" />

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1C1917]">
                  Planifier « {assigningIdea.title} »
                </h3>
                <p className="text-xs text-[#78716C]">
                  Choisissez le jour et le moment du repas
                </p>
              </div>
              <button
                onClick={() => setAssigningIdea(null)}
                className="w-8 h-8 rounded-full bg-[#F5F5F4] flex items-center justify-center text-[#78716C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pt-1">
              {weekDays.map((day) => (
                <div
                  key={day.iso}
                  className="flex items-center justify-between p-2.5 bg-[#FFFDF9] rounded-xl"
                >
                  <span className="text-xs font-bold text-[#1C1917]">
                    {day.name} ({day.formattedLabel})
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => assignIdeaToDay(day.iso, 'lunch')}
                      className="px-2.5 py-1 rounded-lg bg-white text-xs font-semibold text-[#F97316] hover:bg-[#F97316] hover:text-white transition border border-[#E7E5E4] flex items-center gap-1"
                    >
                      <Sun className="w-3 h-3" />
                      Midi
                    </button>
                    <button
                      onClick={() => assignIdeaToDay(day.iso, 'dinner')}
                      className="px-2.5 py-1 rounded-lg bg-white text-xs font-semibold text-[#8B5CF6] hover:bg-[#8B5CF6] hover:text-white transition border border-[#E7E5E4] flex items-center gap-1"
                    >
                      <Moon className="w-3 h-3" />
                      Soir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
