# 🛒 Application de gestion des courses du foyer

## 1. Objectif du projet

Créer une petite application privée, utilisée principalement sur iPhone par les membres d'un même foyer, permettant de :

- gérer une **liste de courses collaborative** ;
- voir les modifications de chaque membre en temps réel ;
- enregistrer les **dépenses de courses** ;
- indiquer **qui a payé chaque dépense** ;
- connaître le **total dépensé en courses chaque mois** ;
- voir combien **chaque membre a personnellement dépensé** chaque mois.

> **Important :** l'application ne cherche pas à calculer « qui doit combien à qui ». Elle sert uniquement à suivre le budget courses et la répartition des dépenses entre les membres.

---

# 2. Stack technique retenue

## Frontend

- **Next.js**
- **TypeScript**
- **Tailwind CSS**

Pourquoi :
- très adapté à une application web moderne ;
- excellent responsive/mobile ;
- permet de rester dans l'écosystème web ;
- pas besoin d'apprendre Flutter uniquement pour ce projet.

## Backend / données

- **Supabase**
  - PostgreSQL
  - Authentification
  - Realtime
  - Row Level Security (RLS)

Pourquoi :
- pas de serveur backend à maintenir ;
- base PostgreSQL solide ;
- authentification intégrée ;
- synchronisation temps réel entre les téléphones ;
- très bien adapté à une petite application collaborative.

## Déploiement

- **Vercel** pour Next.js
- **Supabase** pour le backend et la base de données

## Installation sur iPhone

L'application sera une **PWA (Progressive Web App)**.

Depuis Safari :

> Partager → Sur l'écran d'accueil

L'application pourra alors être lancée depuis une icône comme une application classique, sans passer par l'App Store.

---

# 3. Architecture générale

```text
┌──────────────────────┐
│      iPhone 1        │
│      Membre A        │
└──────────┬───────────┘
           │
           │
      Next.js / PWA
           │
           ▼
┌──────────────────────┐
│       Supabase       │
│                      │
│ PostgreSQL           │
│ Auth                 │
│ Realtime             │
│ Row Level Security   │
└──────────────────────┘
           ▲
           │
      Next.js / PWA
           │
┌──────────┴───────────┐
│      iPhone 2        │
│      Membre B        │
└──────────────────────┘
```

Les données sont centralisées dans Supabase afin que tous les membres du foyer travaillent sur les mêmes listes et dépenses.

---

# 4. Concept de foyer

L'application est organisée autour d'un **foyer**.

Exemple :

```text
🏠 Notre foyer

Membres :
- Nicolas
- Chloé
```

Un utilisateur peut :

- créer un foyer ;
- rejoindre un foyer ;
- consulter les membres du foyer ;
- participer à la liste de courses ;
- enregistrer des dépenses pour le foyer.

Toutes les données principales sont liées à un `household_id`.

---

# 5. Fonctionnalité 1 — Liste de courses

Une liste de courses commune est accessible à tous les membres du foyer.

Exemple :

```text
🛒 Courses

☐ Lait
☐ Poulet
☑ Pâtes
☐ Lessive
☑ Beurre
```

Chaque membre peut :

- ajouter un article ;
- modifier un article ;
- supprimer un article ;
- marquer un article comme acheté ;
- éventuellement indiquer une quantité.

Chaque article peut conserver son auteur :

```text
Lait
Ajouté par : Nicolas
```

## Synchronisation temps réel

Les changements doivent être visibles rapidement par tous les membres.

Exemple :

1. Nicolas ajoute « Lait ».
2. Chloé voit « Lait » apparaître sur son téléphone.
3. Chloé coche « Lait ».
4. Nicolas voit immédiatement l'article comme acheté.

Supabase Realtime sera utilisé pour cette synchronisation.

---

# 6. Fonctionnalité 2 — Dépenses de courses

Une dépense représente un montant réellement payé pour les courses.

Exemple :

```text
🛒 Carrefour

Montant : 67,42 €
Payé par : Nicolas
Date : 23/09/2026
```

Une dépense contient au minimum :

- montant ;
- personne ayant payé ;
- date ;
- description facultative ;
- foyer concerné.

Exemples :

```text
23/09 — Carrefour — 67,42 € — Nicolas
20/09 — Lidl      — 42,18 € — Chloé
17/09 — Carrefour — 83,25 € — Nicolas
```

---

# 7. Suivi mensuel

L'application doit permettre de consulter les dépenses par mois.

Exemple :

```text
Septembre 2026

TOTAL COURSES
347,82 €

Nicolas
212,47 €

Chloé
135,35 €
```

Le total mensuel doit être calculé à partir des dépenses enregistrées.

## Historique

Il doit également être possible de naviguer entre les mois :

```text
Juin 2026       301,15 €
Juillet 2026    326,72 €
Août 2026       289,40 €
Septembre 2026  347,82 €
```

L'objectif est de pouvoir suivre l'évolution du budget courses au fil du temps.

---

# 8. Écrans de la V1

La première version doit rester volontairement simple.

## 🛒 Écran Courses

```text
Courses

[ + Ajouter ]

☐ Lait
☐ Poulet
☑ Pâtes
☐ Lessive
```

Objectif : gérer rapidement les courses pendant les achats.

---

## 💳 Écran Ajouter une dépense

```text
Nouvelle dépense

Montant
[ 67,42 € ]

Payé par
[ Nicolas ▼ ]

Date
[ 23/09/2026 ]

Description
[ Carrefour ]

[ Ajouter ]
```

---

## 📊 Écran Budget

```text
Septembre 2026

347,82 €
Total courses

Nicolas
212,47 €

Chloé
135,35 €

-------------------

23/09  Carrefour   67,42 €   Nicolas
20/09  Lidl        42,18 €   Chloé
17/09  Carrefour   83,25 €   Nicolas
```

---

# 9. Modèle de données initial

## users

```text
id
name
email
created_at
```

## households

```text
id
name
created_by
created_at
```

## household_members

```text
household_id
user_id
created_at
```

## shopping_items

```text
id
household_id
name
quantity
checked
added_by
created_at
updated_at
```

## expenses

```text
id
household_id
amount
paid_by
description
purchased_at
created_at
```

---

# 10. Sécurité

Chaque utilisateur ne doit pouvoir accéder qu'aux données de son ou ses foyers.

Supabase **Row Level Security (RLS)** devra donc être utilisé.

Principe :

```text
Utilisateur
    ↓
Membre du foyer ?
    ↓
Oui → accès aux données du foyer
Non → accès refusé
```

Il ne faut pas se contenter de cacher les données dans l'interface : les règles d'accès doivent être appliquées au niveau de la base de données.

---

# 11. PWA

L'application devra être pensée mobile-first.

Objectif :

```text
Safari
   ↓
Partager
   ↓
Sur l'écran d'accueil
   ↓
🛒 Courses
```

La PWA devra notamment prévoir :

- manifest ;
- icône ;
- nom de l'application ;
- affichage adapté à l'écran mobile ;
- interface sans éléments inutiles de desktop ;
- éventuellement un service worker pour certaines fonctionnalités hors ligne.

### Attention

Le fonctionnement hors ligne complet n'est **pas une priorité de la V1**.

La priorité est d'avoir une application fiable lorsqu'une connexion Internet est disponible.

---

# 12. Roadmap

## Phase 1 — Base du projet

- [ ] Créer le projet Next.js
- [ ] Ajouter TypeScript
- [ ] Configurer Tailwind
- [ ] Créer le projet Supabase
- [ ] Configurer les variables d'environnement
- [ ] Mettre en place l'authentification
- [ ] Créer les tables PostgreSQL
- [ ] Configurer les politiques RLS

## Phase 2 — Foyers

- [ ] Créer un foyer
- [ ] Rejoindre un foyer
- [ ] Afficher les membres
- [ ] Gérer l'appartenance au foyer

## Phase 3 — Liste de courses

- [ ] Ajouter un article
- [ ] Modifier un article
- [ ] Supprimer un article
- [ ] Cocher/décocher un article
- [ ] Afficher l'auteur
- [ ] Synchronisation temps réel

## Phase 4 — Dépenses

- [ ] Ajouter une dépense
- [ ] Choisir le membre ayant payé
- [ ] Ajouter une date
- [ ] Ajouter une description
- [ ] Afficher l'historique
- [ ] Modifier/supprimer une dépense

## Phase 5 — Budget mensuel

- [ ] Calculer le total mensuel
- [ ] Calculer le total par membre
- [ ] Navigation entre les mois
- [ ] Afficher l'historique mensuel

## Phase 6 — PWA

- [ ] Manifest
- [ ] Icône
- [ ] Installation sur iPhone
- [ ] Tester sur les deux appareils
- [ ] Vérifier le comportement mobile

## Phase 7 — Déploiement

- [ ] Déployer Next.js sur Vercel
- [ ] Configurer le domaine si nécessaire
- [ ] Configurer les variables d'environnement
- [ ] Tester l'authentification en production
- [ ] Tester les règles RLS
- [ ] Installer la PWA sur les iPhone

---

# 13. Fonctionnalités possibles plus tard

Ne pas les développer dans la V1.

### Budget

- budget mensuel cible ;
- comparaison budget prévu / réel ;
- graphiques ;
- moyenne mensuelle ;
- comparaison avec les mois précédents.

### Courses

- catégories ;
- quantités ;
- produits favoris ;
- produits récurrents ;
- suggestions ;
- plusieurs listes ;
- historique des achats.

### Dépenses

- magasin ;
- ticket de caisse ;
- photo du ticket ;
- OCR pour récupérer automatiquement le montant ;
- filtres par magasin/personne/période.

### PWA

- notifications ;
- meilleur support hors ligne ;
- synchronisation différée.

---

# 14. Principe directeur

> **Construire d'abord une application simple que le foyer utilise réellement, puis ajouter les fonctionnalités uniquement lorsqu'un besoin apparaît.**

La V1 doit répondre parfaitement à ces trois questions :

1. **Qu'est-ce qu'on doit acheter ?**
2. **Combien avons-nous dépensé ce mois-ci ?**
3. **Combien chaque membre a-t-il dépensé ?**

Tout ce qui ne sert pas directement ces trois objectifs peut attendre.

---

# 15. Stack finale

```text
Frontend       → Next.js + TypeScript
UI             → Tailwind CSS
Backend        → Supabase
Base de données→ PostgreSQL
Auth           → Supabase Auth
Temps réel     → Supabase Realtime
Sécurité       → Supabase RLS
PWA            → Next.js PWA
Hébergement    → Vercel
```

## Choix final

**Next.js + TypeScript + Tailwind + Supabase + PostgreSQL + PWA**

Cette architecture évite :

- le développement d'une application native ;
- Flutter ;
- l'App Store ;
- un backend Laravel à maintenir ;
- un serveur personnel ;
- une infrastructure inutilement complexe.

Elle permet de conserver une application web moderne, mobile, collaborative et installable directement sur les iPhone du foyer.
