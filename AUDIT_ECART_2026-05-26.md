# AUDIT D'ÉCART — Outil d'optimisation découpe ISULA
Date : 2026-05-26
Auditeur : Claude Code

## 1. Synthèse exécutive

**État global : ~35% de l'architecture cible.**
Le code actuel est un **prototype fonctionnel** couvrant import Excel, optimisation 2D basique, étiquettes PDF et WE. Suffisant pour des petites commandes (<500 pièces).

**Top 3 forces :**
1. Import Excel SI-AL robuste (scan auto des en-têtes, détection flexible colonnes)
2. Suivi commandes complet (statuts, semaines fab/livraison, traçabilité lots CEKAL)
3. Multi-commande en lot de coupe (sélection + optimisation groupée)

**Top 3 manques :**
1. Aucune des 9 contraintes métier verre n'est pleinement implémentée (marges, kerf 0, rotation FE, etc.)
2. Pas de backend Python/FastAPI — tout tourne côté client (pas de machine export Bottero/LISEC)
3. Pas de ZPL/QR pour étiquettes Zebra — PDF uniquement

**Recommandation principale :** Implémenter un backend FastAPI avec rectpack/OR-Tools. Le moteur d'optimisation front-end actuel ne peut pas gérer les contraintes métier verre ni communiquer avec les machines.

## 2. Inventaire de l'existant

### Stack réel
| Couche | Technologie |
|--------|-------------|
| Frontend | React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4 |
| DB | Supabase PostgreSQL (managé) |
| PDF | pdf-lib |
| Excel | xlsx (SheetJS) |
| Backend | Aucun pour vitrage (Supabase direct) |
| Queue | Aucune |

### Arborescence vitrage
```
src/vitrage/
├── types.ts           (160 LOC) — Modèles de données
├── optimize2D.ts      (255 LOC) — Moteur guillotine 2D
├── optimizeWE.ts       (87 LOC) — Optimisation Warm Edge 1D
├── parseExcel.ts      (220 LOC) — Import Excel/CSV
├── parseVitrageSpec.ts (45 LOC) — Parser composition vitrage
├── generateLabels.ts  (222 LOC) — Étiquettes PDF (3 variantes)
├── generateFicheWE.ts (149 LOC) — Fiche WE PDF
├── store.ts           (124 LOC) — CRUD Supabase
├── supabase.ts         (11 LOC) — Client Supabase
src/pages/
├── VitrageApp.tsx     (750 LOC) — UI complète
TOTAL                 ~2021 LOC
```

### Tables DB existantes (Supabase)
| Table | Colonnes clés | Type |
|-------|---------------|------|
| `commandes` | id, reference, client, date_creation, semaine_fabrication, semaine_livraison, statut, vitrages (JSONB), lot_fabrication (JSONB), notes | Données commandes |
| `settings` | avery (JSONB), we (JSONB), glass (JSONB) | Paramètres app (1 ligne) |

### Tables absentes vs cible
- `glass_product` — catalogue verres, FE, couches, ΔT max
- `stock_plate` — plaques neuves avec quantités
- `stock_remnant` — chutes réutilisables
- `cut_order_item` — pièces liées au châssis destination
- `optimization_run` — historique des runs de calcul
- `cutting_plan` — plan par plaque
- `placed_piece` — pièce positionnée (normalisé)
- `production_event` — événements traçabilité

## 3. Mapping fonctionnel

| Brique cible | Statut | Fichiers | Manques | Effort |
|---|---|---|---|---|
| 1. Référentiel verres + stock | 🟡 Partiel | optimize2D.ts (groupement matériau), types.ts (GlassSettings) | Catalogue produits, stock quantités, chutes réutilisables, specs fournisseur | 5j |
| 2. Import liste de découpe | ✅ Implémenté | parseExcel.ts, parseVitrageSpec.ts | Validation vs catalogue, import DXF/CAD, hook Odoo | 2j |
| 3. Moteur optimisation 2D | 🟡 Partiel | optimize2D.ts (255 LOC, guillotine BSSF) | 7/9 contraintes absentes (voir §4), pas de rectpack/OR-Tools | 10j |
| 4. Routing & export machines | 🔴 Absent | Aucun | Bottero OPT/DXF, LISEC XCS2, sélection machine, kerf profiles | 8j |
| 5. Étiquettes | 🟡 Partiel | generateLabels.ts (3 variantes PDF Avery) | QR codes, format ZPL Zebra, barcode Code128 | 3j |
| 6. Suivi & traçabilité | 🟡 Partiel | store.ts, TabLots (lots CEKAL), statuts commande | Event log production, KPI yield, serial numbers, audit trail | 5j |

## 4. Contraintes métier

| # | Contrainte | Présente ? | Localisation | Commentaire |
|---|---|---|---|---|
| 1 | Rives dégrossissage 10-20mm 4 côtés | 🔴 Absente | — | optimize2D.ts place les pièces dès (0,0). Aucune marge périmétrique. |
| 2 | Kerf = 0mm (scorage verre) | 🟡 Partielle | optimize2D.ts L128 `cuttingGap` | Le gap de 5mm est appliqué comme kerf — devrait être 0 pour le verre (scoring). WE kerf=5mm est correct. |
| 3 | Sens face couchée FE (pas de rotation si asymétrie) | 🔴 Absente | — | types.ts Vitrage n'a pas de champ asymétrie. optimize2D essaie les 2 rotations sans restriction. |
| 4 | Symétrie feuilleté (ΔT 42°C vs 35°C) | 🔴 Absente | — | Aucun modèle thermique. Aucune propriété feuilleté dans les types. |
| 5 | Largeur min bande détachable 20mm | 🔴 Absente | — | Pas de validation post-découpe sur la géométrie des bandes résiduelles. |
| 6 | Taille mini chute conservée 300×300mm | 🔴 Absente | — | Aucun filtrage des chutes. Pas de table stock_remnant. |
| 7 | Interdiction chutes 50-250mm | 🔴 Absente | — | Aucune règle de zonage des chutes. |
| 8 | Regroupement traitement aval | 🔴 Absente | — | Groupement uniquement par matériau (string). Pas de champ traitement (trempage, etc.). |
| 9 | Multi-formats stock | 🟡 Partielle | types.ts L141 DEFAULT_GLASS | Un seul format configurable (3210×2550). Pas de liste de formats par matériau. |

**Score contraintes : 0/9 complètes, 2/9 partielles, 7/9 absentes.**

## 5. Écarts stack

| Couche | Cible | Actuel | Impact |
|---|---|---|---|
| Backend | FastAPI (Python) | Aucun (Supabase direct depuis React) | **BLOQUANT** — pas de machine export, pas de calcul serveur |
| Optimisation | rectpack → OR-Tools | JS custom guillotine (255 LOC) | **DETTE** — algo non certifié, pas de contraintes, pas de solver |
| DB | PostgreSQL 16 @ OVH:5433 | Supabase PostgreSQL (managé) | Acceptable — migration possible |
| Frontend | Next.js 14 | React 19 + Vite 8 | Acceptable — SPA suffisant |
| Queue | Redis + Celery | Aucune | Acceptable P1, **BLOQUANT P2** (gros lots) |
| Étiquettes | ZPL Zebra | PDF pdf-lib | **BLOQUANT** pour production (imprimantes atelier) |

## 6. Plan d'action priorisé

### P0 — Bloquants (avant production)
1. **Backend FastAPI** — créer `/api/optimize`, `/api/export-machine`, `/api/labels-zpl` (5j)
2. **Remplacer moteur JS par rectpack** — appel API depuis le frontend, résultats en JSON (3j)
3. **Export machine Bottero/LISEC** — DXF/OPT via backend Python (5j)

### P1 — Quick wins (< 2h chacun)
1. **Marge périmétrique** — ajouter `edgeTrimMargin` à GlassSettings + réduire zone utile dans optimize2D (30min)
2. **QR codes sur étiquettes** — intégrer qrcode.js dans generateLabels.ts (1h)
3. **Validation chutes** — post-optimisation, lister les chutes < 300×300mm et alerter dans TabGlass (1.5h)

### P2 — Compléments MVP
1. Table `glass_product` avec catalogue verres, épaisseurs, couches FE (3j)
2. Table `stock_plate` + `stock_remnant` avec gestion quantités (3j)
3. Champ traitement aval sur Vitrage + groupement dans optimize2D (2j)
4. Champ asymétrie FE + verrouillage rotation dans optimize2D (1j)
5. ZPL label generator (2j)

### P3 — Phase suivante
1. OR-Tools CP-SAT pour contraintes dures (5j)
2. Redis + Celery pour calculs async (2j)
3. Hook Odoo / PRO F2 import auto (3j)
4. KPI yield + dashboard production (3j)
5. Multi-formats stock par matériau (2j)

## 7. Prochain prompt Claude Code suggéré

```
# MISSION : Quick wins P1 — ISULA VITRAGE

## 1. Marge périmétrique (edgeTrimMargin)
- Ajouter `edgeTrimMargin: number` (défaut 15) à GlassSettings dans types.ts
- Dans optimize2D.ts, réduire la zone utile de la plaque :
  le premier free rectangle doit être {x: margin, y: margin, w: plateW - 2*margin, h: plateH - 2*margin}
- Ajouter le champ dans TabSettings
- Mettre à jour supabase-schema.sql (default glass JSON)

## 2. QR codes sur étiquettes
- npm install qrcode
- Dans generateLabels.ts, pour chaque étiquette (A, B, C) :
  générer un QR code PNG (contenu = "ISULA|{commandeRef}|{vitrageRef}|{largeur}x{hauteur}")
  l'incruster en haut à droite de l'étiquette (15x15mm) via pdf-lib embedPng

## 3. Validation chutes post-optimisation
- Dans optimize2D.ts, ajouter une fonction `analyzeRemnants(plate)` qui calcule
  les rectangles libres restants après placement
- Classifier : < 50mm (poussière), 50-250mm (interdit), 250-300mm (à surveiller), > 300mm (stockable)
- Retourner ces stats dans OptimizedPlate
- Afficher un warning dans TabGlass si chutes interdites détectées

Commit + push + merge sur main. Tester le build.
```
