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
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#1C1C1E] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200">
          <Check className="w-4 h-4 text-[#34C759] stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* iOS Large Title Header */}
      <div className="pt-1 pb-1 flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1C1C1E]">
            Menus
          </h1>
          <p className="text-xs text-[#8E8E93] font-medium mt-0.5">
            Planning des repas & idées du foyer
          </p>
        </div>

        {/* Bouton Aujourd'hui si hors semaine courante */}
        {!isCurrentWeek && subTab === 'week' && (
          <button
            onClick={goToCurrentWeek}
            className="text-xs font-semibold text-[#007AFF] bg-white border border-[#E5E5EA] px-2.5 py-1 rounded-full shadow-2xs active:bg-[#F2F2F7] transition"
          >
            Aujourd&apos;hui
          </button>
        )}
      </div>

      {/* Segmented Control iOS : Semaine vs Recettes vs Idées */}
      <div className="grid grid-cols-3 p-1 bg-white border border-[#E5E5EA] rounded-2xl shadow-xs">
        <button
          onClick={() => setSubTab('week')}
          className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition select-none ${
            subTab === 'week'
              ? 'bg-[#007AFF] text-white shadow-xs'
              : 'text-[#8E8E93] hover:text-[#1C1C1E]'
          }`}
        >
          <CalendarDays className="w-4 h-4 shrink-0" />
          <span>Semaine</span>
        </button>
        <button
          onClick={() => setSubTab('recipes')}
          className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition select-none ${
            subTab === 'recipes'
              ? 'bg-[#007AFF] text-white shadow-xs'
              : 'text-[#8E8E93] hover:text-[#1C1C1E]'
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span>Recettes</span>
        </button>
        <button
          onClick={() => setSubTab('ideas')}
          className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition select-none ${
            subTab === 'ideas'
              ? 'bg-[#007AFF] text-white shadow-xs'
              : 'text-[#8E8E93] hover:text-[#1C1C1E]'
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
          <div className="flex items-center justify-between bg-white border border-[#E5E5EA] rounded-2xl p-1.5 px-3 shadow-2xs">
            <button
              onClick={prevWeek}
              className="p-1.5 rounded-xl text-[#8E8E93] hover:text-[#1C1C1E] active:bg-[#F2F2F7] transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold text-[#1C1C1E]">
              {weekRangeLabel}
            </span>
            <button
              onClick={nextWeek}
              className="p-1.5 rounded-xl text-[#8E8E93] hover:text-[#1C1C1E] active:bg-[#F2F2F7] transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#007AFF] animate-spin" />
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
                    className={`bg-white rounded-2xl border shadow-xs transition overflow-hidden ${
                      day.isToday
                        ? 'border-[#007AFF] ring-1 ring-[#007AFF]/20'
                        : 'border-[#E5E5EA]'
                    }`}
                  >
                    {/* En-tête du jour */}
                    <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#F2F2F7]/50 border-b border-[#E5E5EA]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#1C1C1E]">
                          {day.name}
                        </span>
                        <span className="text-xs text-[#8E8E93] font-medium">
                          {day.formattedLabel}
                        </span>
                      </div>
                      {day.isToday && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#007AFF] text-white">
                          Aujourd&apos;hui
                        </span>
                      )}
                    </div>

                    {/* Créneaux Midi et Soir */}
                    <div className="divide-y divide-[#E5E5EA]/70">
                      {/* MIDI */}
                      <div className="p-3 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#8E8E93] w-14 shrink-0 pt-0.5">
                          <Sun className="w-3.5 h-3.5 text-[#FF9500]" />
                          <span>Midi</span>
                        </div>

                        <div className="flex-1">
                          {lunch ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-[#1C1C1E]">
                                {lunch}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
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
                                  className="w-7 h-7 rounded-lg text-[#8E8E93] hover:text-[#1C1C1E] hover:bg-[#F2F2F7] flex items-center justify-center transition"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => saveMeal(day.iso, 'lunch', '')}
                                  className="w-7 h-7 rounded-lg text-[#8E8E93] hover:text-[#FF3B30] hover:bg-[#F2F2F7] flex items-center justify-center transition"
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
                              className="text-xs text-[#8E8E93] hover:text-[#007AFF] font-medium py-1 px-2 rounded-lg hover:bg-[#F2F2F7] transition flex items-center gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Planifier le midi</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* SOIR */}
                      <div className="p-3 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#8E8E93] w-14 shrink-0 pt-0.5">
                          <Moon className="w-3.5 h-3.5 text-[#5856D6]" />
                          <span>Soir</span>
                        </div>

                        <div className="flex-1">
                          {dinner ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-[#1C1C1E]">
                                {dinner}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
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
                                  className="w-7 h-7 rounded-lg text-[#8E8E93] hover:text-[#1C1C1E] hover:bg-[#F2F2F7] flex items-center justify-center transition"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => saveMeal(day.iso, 'dinner', '')}
                                  className="w-7 h-7 rounded-lg text-[#8E8E93] hover:text-[#FF3B30] hover:bg-[#F2F2F7] flex items-center justify-center transition"
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
                              className="text-xs text-[#8E8E93] hover:text-[#007AFF] font-medium py-1 px-2 rounded-lg hover:bg-[#F2F2F7] transition flex items-center gap-1.5"
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
            className="bg-white rounded-2xl p-2.5 border border-[#E5E5EA] shadow-xs flex items-center gap-2"
          >
            <div className="w-7 h-7 rounded-full bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center shrink-0">
              <Lightbulb className="w-4 h-4 stroke-[2.5]" />
            </div>
            <input
              type="text"
              placeholder="Une envie ? (ex: Lasagnes, Tacos, Risotto...)"
              value={newIdeaTitle}
              onChange={(e) => setNewIdeaTitle(e.target.value)}
              className="flex-1 bg-transparent text-[#1C1C1E] placeholder-[#8E8E93] text-[15px] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newIdeaTitle.trim() || isSubmittingIdea}
              className="px-3.5 py-1.5 rounded-xl bg-[#007AFF] text-white text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition shrink-0 active:scale-95 shadow-xs"
            >
              {isSubmittingIdea ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                'Ajouter'
              )}
            </button>
          </form>

          {/* Bouton roulette magique "Qu'est-ce qu'on mange ?" */}
          {ideas.length > 1 && (
            <div className="bg-gradient-to-r from-[#007AFF]/10 to-[#5856D6]/10 border border-[#007AFF]/20 rounded-2xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#007AFF] text-white flex items-center justify-center shadow-xs">
                  <Dice5 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#1C1C1E]">
                    Pas d&apos;idée ce soir ?
                  </div>
                  <div className="text-[11px] text-[#8E8E93]">
                    Piocher au hasard dans la boîte à idées
                  </div>
                </div>
              </div>
              <button
                onClick={pickRandomIdea}
                className="px-3 py-1.5 rounded-xl bg-[#007AFF] text-white text-xs font-semibold active:scale-95 transition shadow-xs shrink-0"
              >
                Tirer au sort
              </button>
            </div>
          )}

          {/* Résultat du tirage au sort */}
          {randomIdea && (
            <div className="bg-white border-2 border-[#007AFF] rounded-2xl p-4 shadow-sm space-y-2 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#007AFF] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Idée sélectionnée
                </span>
                <button
                  onClick={() => setRandomIdea(null)}
                  className="text-[#8E8E93] hover:text-[#1C1C1E]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-base font-bold text-[#1C1C1E]">
                {randomIdea.title}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setAssigningIdea(randomIdea)
                    setRandomIdea(null)
                  }}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-[#007AFF] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <span>Planifier pour cette semaine</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Liste des idées */}
          {ideas.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-[#E5E5EA] shadow-xs text-center">
              <Lightbulb className="w-8 h-8 text-[#C7C7CC] mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-[#1C1C1E]">
                Aucune idée enregistrée
              </h3>
              <p className="text-xs text-[#8E8E93] mt-0.5">
                Notez les plats que vous aimez pour les retrouver et les planifier facilement.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-xs overflow-hidden divide-y divide-[#E5E5EA]">
              {ideas.map((idea) => {
                const authorName = idea.added_by
                  ? memberMap.get(idea.added_by)
                  : null

                return (
                  <div
                    key={idea.id}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-black/[0.01] transition"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-[#1C1C1E]">
                        {idea.title}
                      </div>
                      {authorName && (
                        <div className="text-[11px] text-[#8E8E93] mt-0.5">
                          Proposé par {authorName}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setAssigningIdea(idea)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF] hover:text-white text-xs font-semibold transition"
                      >
                        Planifier
                      </button>
                      <button
                        onClick={() => handleDeleteIdea(idea.id)}
                        className="w-8 h-8 rounded-xl text-[#C7C7CC] hover:text-[#FF3B30] flex items-center justify-center transition"
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
          <div className="relative w-full max-w-md bg-white rounded-t-[28px] sm:rounded-3xl p-6 shadow-2xl z-10 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="w-9 h-1 rounded-full bg-[#C7C7CC] mx-auto -mt-2 mb-2 sm:hidden" />

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1C1C1E]">
                  Repas du {editingDay.dayLabel}
                </h3>
                <p className="text-xs text-[#8E8E93]">
                  Qu&apos;avez-vous prévu de manger ?
                </p>
              </div>
              <button
                onClick={() => setEditingDay(null)}
                className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#8E8E93]"
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
                className="w-full px-4 py-3 rounded-2xl bg-[#F2F2F7] text-[#1C1C1E] placeholder-[#8E8E93] text-sm focus:outline-none focus:ring-1 focus:ring-[#007AFF] transition"
              />

              {/* Suggestions rapides depuis la boîte à idées */}
              {ideas.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] mb-1.5">
                    Piocher dans vos idées :
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {ideas.slice(0, 8).map((idea) => (
                      <button
                        key={idea.id}
                        type="button"
                        onClick={() => setMealInputValue(idea.title)}
                        className="text-xs px-2.5 py-1 rounded-full bg-[#F2F2F7] hover:bg-[#007AFF]/10 hover:text-[#007AFF] text-[#1C1C1E] transition font-medium"
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
                  className="px-4 py-3 rounded-2xl bg-[#F2F2F7] text-[#8E8E93] hover:text-[#FF3B30] text-xs font-semibold transition"
                >
                  Effacer
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-[#007AFF] text-white text-sm font-semibold transition active:scale-[0.98] shadow-xs"
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
          <div className="relative w-full max-w-md bg-white rounded-t-[28px] sm:rounded-3xl p-6 shadow-2xl z-10 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="w-9 h-1 rounded-full bg-[#C7C7CC] mx-auto -mt-2 mb-2 sm:hidden" />

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1C1C1E]">
                  Planifier « {assigningIdea.title} »
                </h3>
                <p className="text-xs text-[#8E8E93]">
                  Choisissez le jour et le moment du repas
                </p>
              </div>
              <button
                onClick={() => setAssigningIdea(null)}
                className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#8E8E93]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pt-1">
              {weekDays.map((day) => (
                <div
                  key={day.iso}
                  className="flex items-center justify-between p-2.5 bg-[#F2F2F7] rounded-xl"
                >
                  <span className="text-xs font-bold text-[#1C1C1E]">
                    {day.name} ({day.formattedLabel})
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => assignIdeaToDay(day.iso, 'lunch')}
                      className="px-2.5 py-1 rounded-lg bg-white text-xs font-semibold text-[#FF9500] hover:bg-[#FF9500] hover:text-white transition shadow-2xs flex items-center gap-1"
                    >
                      <Sun className="w-3 h-3" />
                      Midi
                    </button>
                    <button
                      onClick={() => assignIdeaToDay(day.iso, 'dinner')}
                      className="px-2.5 py-1 rounded-lg bg-white text-xs font-semibold text-[#5856D6] hover:bg-[#5856D6] hover:text-white transition shadow-2xs flex items-center gap-1"
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
