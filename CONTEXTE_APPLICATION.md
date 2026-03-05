# 📋 CONTEXTE DE L'APPLICATION — GEM SAAS (PROQUELEC)

> **Niveau de maturité** : Plateforme institutionnelle SaaS nationale  
> **Public cible** : Développeurs, auditeurs techniques, investisseurs, appels d'offre (bailleurs, État)  
> **Dernière mise à jour** : 2026-03-04  

---

## 1. 🎯 Objectif du Projet

**GEM** (Gestion Électrification de Masse) est une application développée par **PROQUELEC** pour piloter des projets d'électrification nationale à grande échelle.

- **Suivre l'avancement terrain** ménage par ménage.
- **Planifier et simuler** l'allocation des ressources.
- **Visualiser géographiquement** les zones d'intervention.
- **Générer des rapports** institutionnels (KPIs, bordereaux, financiers).
- **Synchronisation Offline-first** pour les zones à faible connectivité.

---

## 2. 🏗️ Architecture Globale

L'application utilise une architecture moderne hybride pour assurer la transition entre le mode local (Electron) et le mode cloud (SaaS).

### Couches Applicatives
- **Frontend SaaS** : React 19 + TypeScript + TailwindCSS 4 + Leaflet.
- **Backend API** : Node.js + Express + Prisma 6 + PostgreSQL 16.
- **Logiciel Bureau** : Electron (wrapper pour exécution Windows offline).
- **Logic Métier (src/)** : DDD (Domain Driven Design) partagé entre les environnements.

### Isolation Multi-tenant & Sécurité
- **Multi-tenancy** : Isolation logique stricte via `organizationId` injecté par JWT.
- **Sécurité** : JWT (Access + Refresh tokens), Bcrypt, Helmet, Rate-limiting, validation Joi.
- **Accès** : Authentification centralisée, credentials provisionnés pour déploiement institutionnel.

---

## 3. 📦 Stack Technique & DevOps

### Infrastructure & Déploiement
- **Docker & Docker Compose** : Stack complète implémentée (Nginx, App, Postgres).
- **Reverse Proxy** : Nginx avec configuration SSL Let's Encrypt et compression Gzip.
- **CI/CD** : GitHub Actions prêt pour déploiement automatisé sur **Wanekoo**.
- **Lancement Dev** : `npm run dev:saas` (lance simultanément frontend et backend).

### Base de Données
- **Serveur** : PostgreSQL 16 (modèle relationnel complexe avec indexation avancée).
- **Local** : IndexedDB (via Dexie.js) pour support offline intégral.
- **ORM/Accès** : **100% Prisma 6** — architecture DDD unifiée. Aucun appel SQL brut en production.

---

## 4. 🔄 Workflow & Métier

### Workflow des Ménages
```
Non débuté → Murs (En cours/Terminé) → Réseau (En cours/Terminé) → Intérieur (En cours/Terminé) → Réception: Validée ✅
```
*Note : Statuts spéciaux "Problème" (blocage technique) et "Inéligible" (exclusion programme).*

### Modèle de Synchronisation
- **Offline-first** : Saisie locale immédiate, synchronisation asynchrone.
- **Conflits** : Modèle de versionnage optimiste. En cas de conflit, le serveur est maître (*Server-wins*).
- **Tracking** : Chaque opération est logguée avec `userId` et `deviceId`.

---

## 5. 👥 Gouvernance & Contrôle d'Accès

### Rôles du Système (Mappage)
| Rôle Frontend | Rôle Backend (SQL) | Description |
|---|---|---|
| `ADMIN_PROQUELEC` | `ADMIN` | Administrateur total |
| `DG_PROQUELEC` | `SUPERVISEUR` | Direction & Analyse financière |
| `CHEF_EQUIPE` | `TECHNICIEN` | Gestion terrain & Supervision |
| `CLIENT_LSE` | `LECTEUR` | Consultation & Rapports d'avancement |

---

## 6. 📊 État d'Avancement (Done / Todo)

### ✅ FAIT (100% Fonctionnel)
- **Authentification** : Gestion complète des sessions, rôles (RBAC) et rafraîchissement des tokens.
- **Dashboard** : KPIs temps réel, score **IGPP** et graphiques animés (Framer Motion).
- **Le Hub & Command Palette** : Portail central thématique et navigation ultra-rapide (Ctrl+K).
- **Terrain** : Cartographie Leaflet, clustering K-Means, filtrage dynamique et routage.
- **Bordereau** : Nouveau module de gestion des affectations d'équipes et registre des ménages (Migré de HTML legacy).
- **Missions & OM** : Génération automatisée d'Ordres de Mission (calcul structuré des perdiems Zones 1-3).
- **Cahier des Charges** : Moteur de spécifications techniques avec export Word (.docx).
- **Simulation & IA** : Moteur d'optimisation (Hivernage, Logistique, Trésorerie) pour anticiper les aléas.
- **Exportation & Rapports** : Moteur PDF multi-pages (Acme/Institutional standards) et exports CSV/Excel.
- **UI/UX Premium** : Identité visuelle PROQUELEC intégrale (Glassmorphism maîtrisé, multi-thème clair/sombre).
- **Backend API (SaaS)** : Implémentation complète et unification technique (Prisma 6) avec suppression de l'ancien moteur SQL raw.
- **WebSockets & Temps Réel** : Notifications Push (Socket.io) pour alerter les équipes lors des synchronisations terrains.
- **Map Performance (Vector Tiles)** : Migration MapLibre GL JS — fond vectoriel OpenFreeMap + clustering natif GeoJSON (10x plus rapide à grande échelle).
- **Infrastructure** : Stack Docker orchestrée, configuration Nginx SSL et scripts CI/CD.
- **Supports Mobiles** : Adaptateurs KoboToolbox pour la collecte Offline et synchronisation différentielle.

### � PROCHAINES ÉTAPES (Scalabilité Future)
- **Map 50k+** : Passage à un serveur de tuiles MVT dédié (`pg_tileserv`) si le volume dépasse 50k ménages.

---

## 7. ⚡ Performance & Scalabilité

- **Pagination** sur tous les endpoints de listes massives.
- **Cache KPI** de 300s pour soulager le PostgreSQL en charge.
- **Indexation composite** sur les couples (organizationId, status) et (project_id, date).
- **Lazy loading** des composants UI pour un chargement frontend < 2s.

---

## 8. 🏛️ Vision Produit & Roadmap

GEM vise à devenir la **plateforme nationale de référence** pour le pilotage des programmes d'électrification en Afrique.

- **Phase 1** : Stabilisation SaaS/Offline (Actuel).
- **Phase 2** : Module Énergie (Suivi consommation panneaux solaires).
- **Phase 3** : SIG National (Intégration QGIS pour planification territoriale).
- **Phase 4** : API Ouverte pour partenaires institutionnels (Banque Mondiale, États).

---
*Ce document constitue la source de vérité pour le contexte technique et métier du projet GEM SAAS.*
