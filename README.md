# 🍽️ EatList

**EatList** est une application web & mobile (PWA) moderne et collaborative pensée en priorité pour iOS, conçue pour simplifier la vie quotidienne du foyer : gestion des courses, planning des repas, boîte à idées, carnet de recettes et suivi du budget annuel.

---

## ✨ Fonctionnalités principales

* 🛒 **Liste de courses collaborative en temps réel** :
  * Synchronisation instantanée entre tous les membres du foyer via **Supabase Realtime**.
  * Ajout rapide avec suggestion d'articles et quantités.
  * Coche/décochage avec micro-animations et filtre articles achetés.

* 📅 **Menus de la semaine (Lundi au Dimanche)** :
  * Organisation claire des repas du midi et du soir.
  * Boîte à idées pour noter les envies culinaires.
  * Roulette aléatoire pour choisir un repas au hasard.

* 📖 **Carnet de recettes partagé** :
  * Sauvegarde des recettes maison (portions, temps de préparation, cuisson, ingrédients, étapes).
  * Catégorisation personnalisable avec masquage automatique des catégories vides.
  * Bouton en 1 clic pour planifier directement une recette dans la semaine.

* 💶 **Budget & Dépenses (Mois & Année)** :
  * Saisie rapide des tickets avec sélection des enseignes fréquentes.
  * Répartition individuelle par membre avec pourcentages et barres de participation.
  * Bilan annuel interactif avec graphique sur 12 mois, moyenne mensuelle, mois record et top enseignes.

* 👥 **Gestion sécurisée du foyer** :
  * Création ou adhésion par code d'invitation unique.
  * Étanchéité totale garantie par **PostgreSQL Row Level Security (RLS)** : aucune donnée n'est accessible hors du foyer.
  * Suppression sécurisée réservée au propriétaire avec confirmation obligatoire par saisie du nom du foyer.

---

## 🛠️ Stack Technique

* **Framework** : [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
* **Design & Styling** : Tailwind CSS v4, Vanilla CSS tokens (Apple iOS Native design system)
* **Backend & Base de données** : [Supabase](https://supabase.com/) (PostgreSQL, Auth, Realtime, RLS)
* **Icônes** : [Lucide React](https://lucide.dev/)
* **Langage** : TypeScript

---

## 🚀 Installation & Démarrage

1. **Cloner le projet** :
   ```bash
   git clone https://github.com/NicoVnd/EatList.git
   cd EatList
   ```

2. **Installer les dépendances** :
   ```bash
   npm install
   ```

3. **Variables d'environnement** :
   Créer un fichier `.env.local` à la racine :
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anonyme
   ```

4. **Base de données Supabase** :
   Exécuter les scripts de migration présents dans le dossier `supabase/migrations/` dans l'éditeur SQL de votre tableau de bord Supabase.

5. **Lancer le serveur de développement** :
   ```bash
   npm run dev
   ```
   L'application sera accessible sur `http://localhost:3000`.
