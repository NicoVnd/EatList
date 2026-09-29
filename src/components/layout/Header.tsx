'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useHousehold } from '@/context/HouseholdContext'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import {
  Copy,
  Check,
  LogOut,
  ChevronDown,
  Users,
  X,
  Edit2,
  Home,
  User as UserIcon,
  Loader2,
  Mail,
  ArrowRight,
  Trash2,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react'

export function Header() {
  const {
    household,
    members,
    userHouseholds,
    setHousehold,
    refreshHousehold,
    deleteHousehold,
    leaveHousehold,
  } = useHousehold()
  const { user, profile, signOut, refreshProfile } = useAuth()
  const supabase = createClient()

  // État du modal actif : 'profile' | 'household' | null
  const [activeModal, setActiveModal] = useState<'profile' | 'household' | null>(
    null
  )
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Édition du prénom de profil
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)

  // Suppression du foyer (sécurité propriétaire)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Quitter le foyer (membres non-propriétaires)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  // S'assurer que le portail ne s'affiche que côté client
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (profile?.name) {
      setNameInput(profile.name)
    }
  }, [profile])

  const copyHouseholdId = () => {
    if (household) {
      navigator.clipboard.writeText(household.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !nameInput.trim()) return

    setIsSavingName(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ name: nameInput.trim() })
        .eq('id', user.id)

      if (!error) {
        await refreshProfile()
        await refreshHousehold()
        setIsEditingName(false)
      }
    } catch (err) {
      console.error('Erreur mise à jour prénom:', err)
    } finally {
      setIsSavingName(false)
    }
  }

  // Suppression du foyer par le propriétaire
  const handleDeleteHousehold = async () => {
    if (!household) return
    setIsDeleting(true)
    setDeleteError(null)

    const res = await deleteHousehold(household.id)
    setIsDeleting(false)

    if (res.success) {
      setShowDeleteConfirm(false)
      setActiveModal(null)
    } else {
      setDeleteError(res.error || 'Erreur lors de la suppression')
    }
  }

  // Quitter le foyer
  const handleLeaveHousehold = async () => {
    if (!household) return
    setIsLeaving(true)

    const res = await leaveHousehold(household.id)
    setIsLeaving(false)

    if (res.success) {
      setShowLeaveConfirm(false)
      setActiveModal(null)
    }
  }

  const userInitial = (profile?.name || user?.email || 'M').charAt(0).toUpperCase()
  const userDisplayName = profile?.name || user?.email?.split('@')[0] || 'Moi'

  // Vérifier si l'utilisateur connecté est le propriétaire du foyer
  const isOwner = Boolean(
    household?.created_by && user?.id && household.created_by === user.id
  )

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#E7E5E4] px-4 pt-safe select-none">
        {/* Fond avec flou */}
        <div className="absolute inset-0 bg-[#FFFDF9]/85 backdrop-blur-xl -z-10 pointer-events-none" />

        <div className="max-w-md w-full mx-auto h-12 flex items-center justify-between">
          {/* Sélecteur Foyer (gauche) */}
          <button
            onClick={() => setActiveModal('household')}
            className="flex items-center gap-1.5 py-1 px-2.5 -ml-1 rounded-full hover:bg-black/5 active:bg-black/10 transition"
          >
            <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
            <span className="font-semibold text-sm tracking-tight text-[#1C1917] max-w-[140px] truncate">
              {household?.name || 'Mon Foyer'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#A8A29E]" />
            <span className="text-[11px] font-semibold text-[#78716C] bg-[#F5F5F4] px-1.5 py-0.5 rounded-full">
              {members.length}
            </span>
          </button>

          {/* Profil Utilisateur (droite) */}
          <button
            onClick={() => {
              setIsEditingName(false)
              setNameInput(profile?.name || '')
              setActiveModal('profile')
            }}
            className="flex items-center gap-1.5 py-1 px-2 rounded-full hover:bg-black/5 active:bg-black/10 transition"
          >
            <div className="w-7 h-7 rounded-full bg-[#F97316] text-white flex items-center justify-center text-xs font-bold">
              {userInitial}
            </div>
            <span className="text-xs font-semibold text-[#1C1917] max-w-[85px] truncate">
              {userDisplayName}
            </span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MODALE 1 : MON PROFIL                                     */}
      {/* ======================================================== */}
      {mounted &&
        activeModal === 'profile' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop plein écran */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              onClick={() => setActiveModal(null)}
            />

            {/* Sheet Profil */}
            <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-lg z-10 space-y-5 animate-in slide-in-from-bottom duration-200">
              {/* Grabber */}
              <div className="w-9 h-1 rounded-full bg-[#D6D3D1] mx-auto -mt-2 mb-2 sm:hidden" />

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#1C1917] tracking-tight">
                    Mon Compte
                  </h3>
                  <p className="text-xs text-[#78716C]">
                    Informations personnelles & session
                  </p>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-8 h-8 rounded-full bg-[#F5F5F4] flex items-center justify-center text-[#78716C] hover:text-[#1C1917]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Carte Profil Utilisateur */}
              <div className="bg-[#FFFDF9] rounded-2xl p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#F97316] text-white flex items-center justify-center text-xl font-bold shrink-0">
                  {userInitial}
                </div>
                <div className="flex-1 min-w-0">
                  {isEditingName ? (
                    <form onSubmit={handleSaveName} className="space-y-2">
                      <input
                        type="text"
                        autoFocus
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="Votre prénom"
                        className="w-full px-3 py-1.5 rounded-xl bg-white text-[#1C1917] text-xs font-semibold focus:outline-none border border-[#E7E5E4]"
                      />
                      <div className="flex gap-1.5">
                        <button
                          type="submit"
                          disabled={isSavingName || !nameInput.trim()}
                          className="px-3 py-1 rounded-lg bg-[#F97316] text-white text-xs font-semibold disabled:opacity-40"
                        >
                          {isSavingName ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            'Sauvegarder'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingName(false)}
                          className="px-2.5 py-1 rounded-lg bg-[#F5F5F4] text-[#78716C] text-xs font-semibold"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-[#1C1917] truncate">
                          {userDisplayName}
                        </span>
                        <button
                          onClick={() => {
                            setNameInput(profile?.name || '')
                            setIsEditingName(true)
                          }}
                          className="text-[#A8A29E] hover:text-[#F97316] transition"
                          title="Modifier mon prénom"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-xs text-[#78716C] truncate mt-0.5 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          {user?.email || 'Non renseigné'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Raccourci vers les paramètres du foyer */}
              <div className="bg-white border border-[#E7E5E4] rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#F97316]/10 text-[#F97316] flex items-center justify-center shrink-0">
                    <Home className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#1C1917]">
                      {household?.name || 'Mon Foyer'}
                    </div>
                    <div className="text-[11px] text-[#78716C]">
                      {members.length} membre{members.length > 1 ? 's' : ''} actif
                      {members.length > 1 ? 's' : ''} •{' '}
                      {isOwner ? 'Propriétaire' : 'Membre'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveModal('household')}
                  className="px-3 py-1.5 rounded-xl bg-[#FFFDF9] hover:bg-[#F97316]/10 text-[#F97316] text-xs font-semibold transition flex items-center gap-1"
                >
                  <span>Gérer</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Bouton Déconnexion */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setActiveModal(null)
                    signOut()
                  }}
                  className="w-full py-3.5 rounded-2xl bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Se déconnecter</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ======================================================== */}
      {/* MODALE 2 : MON FOYER & INVITATIONS                        */}
      {/* ======================================================== */}
      {mounted &&
        activeModal === 'household' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop plein écran */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              onClick={() => setActiveModal(null)}
            />

            {/* Sheet Foyer */}
            <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-lg z-10 space-y-5 animate-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto">
              {/* Grabber */}
              <div className="w-9 h-1 rounded-full bg-[#D6D3D1] mx-auto -mt-2 mb-2 sm:hidden" />

              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#1C1917] tracking-tight">
                      {household?.name || 'Mon Foyer'}
                    </h3>
                    {isOwner && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F97316]/10 text-[#F97316]">
                        Propriétaire
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#78716C] mt-0.5">
                    {members.length} membre{members.length > 1 ? 's' : ''} dans
                    le foyer
                  </p>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-8 h-8 rounded-full bg-[#F5F5F4] flex items-center justify-center text-[#78716C] hover:text-[#1C1917]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Membres Grouped Table */}
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A8A29E] mb-2 px-1">
                  Membres du foyer
                </div>
                <div className="bg-[#FFFDF9] rounded-2xl overflow-hidden divide-y divide-[#F5F5F4]">
                  {members.map((m) => {
                    const isSelf = m.user_id === user?.id
                    const isMemberOwner = m.user_id === household?.created_by

                    return (
                      <div
                        key={m.user_id}
                        className="flex items-center justify-between p-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#F97316]/15 text-[#F97316] flex items-center justify-center font-bold text-xs">
                            {(m.user?.name || 'M').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-[#1C1917] block">
                              {m.user?.name || 'Membre'}
                            </span>
                            <span className="text-[11px] text-[#78716C]">
                              {m.user?.email}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isMemberOwner && (
                            <span className="text-[10px] font-semibold text-[#F97316] bg-[#F97316]/10 px-2 py-0.5 rounded-full">
                              Créateur
                            </span>
                          )}
                          {isSelf && (
                            <span className="text-xs font-semibold text-[#F97316] bg-[#F97316]/10 px-2.5 py-0.5 rounded-full">
                              Vous
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Partage Code Invitation */}
              <div className="pt-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A8A29E] mb-2 px-1">
                  Code pour inviter un proche
                </div>
                <button
                  onClick={copyHouseholdId}
                  className="w-full flex items-center justify-between p-3.5 bg-[#FFFDF9] active:bg-[#F5F5F4] rounded-2xl text-left transition cursor-pointer"
                >
                  <div className="truncate pr-3">
                    <div className="text-[11px] text-[#A8A29E] font-mono truncate">
                      {household?.id}
                    </div>
                    <div className="text-xs text-[#1C1917] font-medium mt-0.5">
                      {copied
                        ? 'Copié dans le presse-papier !'
                        : 'Toucher pour copier le code de partage'}
                    </div>
                  </div>
                  <div
                    className={`shrink-0 flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                      copied
                        ? 'bg-[#22C55E] text-white'
                        : 'bg-[#F97316] text-white'
                    }`}
                  >
                    {copied ? (
                      <span className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        Copié
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Copy className="w-3.5 h-3.5" />
                        Copier
                      </span>
                    )}
                  </div>
                </button>
              </div>

              {/* Si l'utilisateur appartient à plusieurs foyers */}
              {userHouseholds.length > 1 && (
                <div className="pt-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A8A29E] mb-2 px-1">
                    Changer de foyer
                  </div>
                  <div className="bg-[#FFFDF9] rounded-2xl overflow-hidden divide-y divide-[#F5F5F4]">
                    {userHouseholds.map((h) => {
                      const isCurrent = h.id === household?.id
                      return (
                        <div
                          key={h.id}
                          className="flex items-center justify-between p-3"
                        >
                          <span className="text-xs font-semibold text-[#1C1917]">
                            {h.name}
                          </span>
                          {isCurrent ? (
                            <span className="text-[11px] font-bold text-[#22C55E]">
                              Actif
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setHousehold(h)
                                setActiveModal(null)
                              }}
                              className="text-xs font-semibold text-[#F97316] hover:underline"
                            >
                              Basculer
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* ZONE DE GESTION : SUPPRIMER OU QUITTER                   */}
              {/* ======================================================== */}
              <div className="pt-3 border-t border-[#F5F5F4] space-y-2">
                {isOwner ? (
                  /* Action réservée au propriétaire */
                  <div>
                    <button
                      onClick={() => {
                        setConfirmDeleteInput('')
                        setDeleteError(null)
                        setShowDeleteConfirm(true)
                      }}
                      className="w-full py-3 rounded-2xl bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Supprimer définitivement ce foyer</span>
                    </button>
                    <p className="text-[10px] text-[#A8A29E] text-center mt-1">
                      Action réservée au créateur du foyer
                    </p>
                  </div>
                ) : (
                  /* Action pour les membres non-propriétaires */
                  <div>
                    <button
                      onClick={() => setShowLeaveConfirm(true)}
                      className="w-full py-3 rounded-2xl bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#78716C] hover:text-[#EF4444] text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Quitter ce foyer</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ======================================================== */}
      {/* MODALE 3 : CONFIRMATION SÉCURISÉE SUPPRESSION FOYER      */}
      {/* ======================================================== */}
      {mounted &&
        showDeleteConfirm &&
        createPortal(
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              onClick={() => {
                if (!isDeleting) setShowDeleteConfirm(false)
              }}
            />

            <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-lg z-10 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-[#EF4444]/10 text-[#EF4444] flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-[#1C1917]">
                  Supprimer « {household?.name} » ?
                </h3>
                <p className="text-xs text-[#78716C] leading-relaxed">
                  Cette action est <strong className="text-[#EF4444]">irréversible</strong>.
                  Toutes les données associées seront définitivement détruites pour l&apos;ensemble des membres :
                </p>
              </div>

              <div className="bg-[#FFFDF9] rounded-2xl p-3 text-xs text-[#1C1917] space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                  <span>Articles de la liste de courses</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                  <span>Toutes les dépenses et budgets</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                  <span>Planning des menus & idées</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                  <span>Toutes les recettes du foyer</span>
                </div>
              </div>

              {/* Champ de sécurité pour confirmation obligatoire */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-[#78716C]">
                  Pour confirmer, tapez le nom exact du foyer :{' '}
                  <strong className="text-[#1C1917]">{household?.name}</strong>
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder={household?.name}
                  value={confirmDeleteInput}
                  onChange={(e) => setConfirmDeleteInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF9] text-xs font-bold text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#EF4444] transition border border-[#E7E5E4]"
                />
              </div>

              {deleteError && (
                <div className="text-xs text-[#EF4444] bg-[#EF4444]/10 p-2.5 rounded-xl font-medium">
                  {deleteError}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-2xl bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-xs font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={
                    confirmDeleteInput.trim().toLowerCase() !==
                      (household?.name || '').trim().toLowerCase() ||
                    isDeleting
                  }
                  onClick={handleDeleteHousehold}
                  className="flex-1 py-3 rounded-2xl bg-[#EF4444] text-white text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition flex items-center justify-center gap-1.5"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Supprimer'
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ======================================================== */}
      {/* MODALE 4 : CONFIRMATION QUITTER LE FOYER                 */}
      {/* ======================================================== */}
      {mounted &&
        showLeaveConfirm &&
        createPortal(
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              onClick={() => {
                if (!isLeaving) setShowLeaveConfirm(false)
              }}
            />

            <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-lg z-10 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-[#F97316]/10 text-[#F97316] flex items-center justify-center mx-auto">
                <LogOut className="w-6 h-6 stroke-[2.5]" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-[#1C1917]">
                  Quitter « {household?.name} » ?
                </h3>
                <p className="text-xs text-[#78716C] leading-relaxed">
                  Vous ne ferez plus partie de ce foyer et vous ne pourrez plus accéder à ses courses, recettes et dépenses, à moins d&apos;y être réinvité(e).
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={isLeaving}
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 py-3 rounded-2xl bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-xs font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isLeaving}
                  onClick={handleLeaveHousehold}
                  className="flex-1 py-3 rounded-2xl bg-[#EF4444] text-white text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  {isLeaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Quitter le foyer'
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
