# PROMPT — Session Claude Code : Configurateur Atelier / Fabrication

Copie ce prompt au début d'une nouvelle conversation Claude Code.

---

## Contexte du projet

Tu travailles sur le repo **mariannemassiani-96/GC-SIAL** — un portail professionnel SIAL avec deux modules :
- **Fabrication** : Configurateur Garde-Corps Kawneer + 3 apps atelier (Smart Assembly, Bridge, Pick-to-Light)
- **Commercial** : Configurateur Menuiseries APER (type fenetre24.com)

## Ta branche

```
git checkout atelier/fabrication
```

**Tu travailles UNIQUEMENT sur la partie Fabrication.** Ne touche JAMAIS au dossier `src/menuiseries/`.

## Stack technique

- React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4
- @react-pdf/renderer pour les PDF
- lucide-react pour les icônes
- localStorage pour la persistence (pas de backend)
- Dark theme (#0f1117 bg, #181a20 surfaces, #2a2d35 borders, blue-600 accent)

## Architecture des fichiers Fabrication

```
src/
├── App.tsx                    ← Routage principal (Accueil → Fabrication → apps)
├── types/index.ts             ← Types garde-corps (Affaire, Travee, ResultatTravee...)
├── store/affaires.ts          ← Persistence localStorage garde-corps
├── pages/
│   ├── ListeAffaires.tsx      ← Dashboard affaires GC
│   └── Configurateur.tsx      ← Configurateur GC (8 onglets)
├── components/
│   ├── SectionProjet.tsx      ← Métadonnées projet GC
│   ├── SectionTravees.tsx     ← Gestion travées + schémas pose A-H
│   ├── PreviewGC.tsx          ← Aperçu SVG garde-corps
│   ├── SchemaCotes.tsx        ← Schéma cotation
│   ├── SchemaLisse.tsx        ← Schéma lisse
│   ├── OptimBarresVisu.tsx    ← Visualisation optimisation barres
│   ├── tabs/                  ← Onglets (Débits, Usinages, BonCommande, Devis)
│   └── ui/                    ← Composants UI (Button, Badge, Alert)
├── engine/
│   ├── calcTravee.ts          ← Calculs par travée (NF P01-012)
│   ├── calcNomenclature.ts    ← Nomenclature / BOM
│   ├── optimiserBarres.ts     ← Optimisation FFD barres 6400mm
│   ├── devis.ts               ← Moteur de prix GC
│   └── index.ts               ← Orchestrateur calculs
├── export/
│   ├── exportPDF.tsx          ← PDF fiche fab + bon commande
│   └── exportXML.ts           ← Export XML CNC
├── constants/
│   ├── typesGC.ts             ← Types GC (8 types), MC, pose
│   ├── profils.ts             ← Catalogue profilés Kawneer
│   ├── parametres.ts          ← Règles NF P01-012
│   └── fixations.ts           ← Types de fixation
└── atelier/
    ├── types.ts               ← Types partagés (FicheMontage, FercoPiece, CasierConfig, DEMO_FICHE)
    └── components/
        ├── SmartAssembly.tsx   ← Tablette opérateur (scan, guidage pas-à-pas, SVG)
        ├── BridgeAtelier.tsx   ← Base de données fiches (import JSON, recherche, détail)
        └── PickToLight.tsx     ← Simulation LED 14 casiers Ferco
```

## Ce qu'il y a à faire / améliorer

### Garde-corps (existant, à améliorer)
- Le configurateur GC fonctionne avec 8 onglets (Config, Aperçu, Cotes, Débits, Usinages, Optimisation, Bon Commande, Devis)
- Profilés Kawneer 1800 Kadence, NF P01-012
- Export PDF fiche fab et XML CNC

### Apps Atelier (converties récemment de Python → React)
1. **Smart Assembly** : Guidage opérateur pas-à-pas, scan code-barres HID, schéma SVG, LED par casier. Mode démo (F1). Fonctionne en localStorage.
2. **Bridge Atelier** : Import/export JSON fiches PRO F2, recherche, détail pièces Ferco. Pas encore de parsing PDF côté web.
3. **Pick-to-Light** : Simulation des 14 casiers LED WS2812B, test séquentiel, luminosité. Mode simulation web uniquement.

### Fichiers Python originaux (référence)
Les fichiers Python d'origine sont dans `atelier/` à la racine :
- `atelier/sial_bridge_atelier.py` — Parser PDF PRO F2 + API Flask
- `atelier/sial_picktolight.py` — Contrôle GPIO Raspberry Pi
- `atelier/sial_smart_assembly.html` — Version HTML originale

## Règles

1. **Ne JAMAIS modifier `src/menuiseries/`** — c'est géré par la branche `commercial/configurateur`
2. Commiter sur la branche `atelier/fabrication`
3. Pusher avec `git push -u origin atelier/fabrication`
4. Pour mettre à jour main : `git checkout main && git merge atelier/fabrication && git push origin main`
5. Build : `npm run build` (Vite) — doit passer sans erreur TypeScript
