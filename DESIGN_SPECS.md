# SIAL — Spécifications Design pour Figma

## Palette de couleurs

### Fonds
- Background principal : `#0f1117`
- Surface 1 (cartes, header) : `#181a20`
- Surface 2 (inputs, sections) : `#1c1e24`
- Surface 3 (hover, surélevé) : `#252830`

### Bordures
- Bordure standard : `#2a2d35`
- Bordure hover : `#404550`
- Bordure active : `#353840`

### Accents
- Bleu principal : `#2563eb` (blue-600)
- Bleu clair : `#60a5fa` (blue-400)
- Bleu fond : `rgba(37, 99, 235, 0.1)`
- Vert succès : `#16a34a` (green-600)
- Vert texte : `#4ade80` (green-400)
- Rouge erreur : `#dc2626` (red-600)
- Ambre warning : `#d97706` (amber-600)
- Violet : `#7a4bc8`

### Textes
- Blanc principal : `#ffffff`
- Texte standard : `#e5e7eb` (gray-200)
- Texte secondaire : `#9ca3af` (gray-400)
- Texte tertiaire : `#6b7280` (gray-500)
- Texte désactivé : `#4b5563` (gray-600)

## Typographie

- **Titres** : DM Sans, 700 (bold)
- **Corps** : DM Sans, 400 (regular)
- **Mono** (refs, prix) : DM Mono, 400

### Tailles
- H1 : 24px / bold
- H2 : 20px / bold
- H3 : 16px / semibold
- Body : 14px / regular
- Small : 12px / regular
- Caption : 11px / regular
- Micro : 10px / medium

## Espacements

- Page padding : 24px
- Card padding : 20px
- Gap entre cards : 12-16px
- Border radius cards : 12px (rounded-xl)
- Border radius boutons : 8px (rounded-lg)
- Border radius inputs : 8px

## Composants clés à maquetter

### 1. Page d'accueil
- 2 grandes cartes : Fabrication (vert) / Commercial (bleu)
- Logo SIAL centré
- Dark theme

### 2. Flow Configurateur (le plus important)
- Layout : contenu scrollable (gauche 70%) + sidebar sticky prix (droite 30%)
- 8 sections accordéon empilées verticalement
- Chaque section : numéro + titre + résumé quand fermée
- Options : grille de cartes avec icône SVG + label + prix

### 3. Carte d'option (OptionCard)
- Bordure 2px, radius 12px
- État normal : bordure `#2a2d35`, fond `#1c1e24`
- État sélectionné : bordure `#2563eb`, fond bleu 8%, check bleu
- Icône/schéma SVG en haut (44×44px)
- Label en bold 14px
- Description en 11px gray-500
- Badge optionnel (coin supérieur droit)
- Prix optionnel en bas (mono 10px)

### 4. Carte couleur (ColorCard)
- Pastille couleur 40×40px, radius 8px
- Label 10px en dessous
- Check bleu si sélectionné

### 5. Section accordéon (FlowSection)
- Header cliquable : numéro (cercle 32px) + titre + résumé + chevron
- Fermée + complétée : cercle vert + check + résumé texte
- Fermée + verrouillée : opacité 30%
- Ouverte : bordure bleue, contenu visible

### 6. Sidebar prix (sticky)
- Aperçu SVG menuiserie (260×200px)
- Prix HT grand (24px bold)
- TVA + TTC
- Détail dépliable
- Résumé config (key-value pairs)

### 7. Slider dimensions
- Range input + input numérique côte à côte
- Échelle min/mid/max en dessous
- Surface calculée affichée

## Écrans à maquetter (priorité)

1. **Flow Configurateur** — le plus important, c'est là qu'on passe le plus de temps
2. **Tableau de bord affaires** — liste des affaires avec stats
3. **Création affaire** — formulaire 3 blocs (projet, chantier, paramètres)
4. **Liste menuiseries** — cartes menuiseries + sidebar résumé
5. **Page d'accueil** — sélection Fabrication / Commercial

## Dimensions écran

- Desktop : 1440px de large (design principal)
- Tablette : 768px (responsive)
- Mobile : 375px (responsive)
