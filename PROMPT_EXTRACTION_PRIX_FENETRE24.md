# PROMPT — Extraction automatique des prix fenetre24.com

## Instructions pour Claude Code avec contrôle navigateur

Copie ce prompt dans un Claude Code qui a accès à ton navigateur (via MCP browser-use, Playwright MCP, ou computer use).

---

## MISSION

Tu dois extraire les prix RÉELS du configurateur fenetre24.com en simulant des configurations dans le navigateur. Tu vas créer un fichier JSON structuré avec TOUS les prix.

## MÉTHODE

1. Ouvre le navigateur sur https://www.fenetre24.com/
2. Pour chaque configuration ci-dessous, utilise le configurateur en ligne
3. Note le prix TTC affiché à chaque étape
4. Enregistre dans un fichier JSON

## IMPORTANT
- Le prix s'affiche en temps réel à gauche du configurateur pendant que tu configures
- Après chaque changement d'option, attends que le prix se mette à jour
- Note le prix EXACT affiché (avec centimes)
- Entre les dimensions au clavier dans les champs largeur/hauteur

---

## CONFIGURATIONS À TESTER

### BLOC 1 — FENÊTRE PVC : effet des DIMENSIONS (blanc, double vitrage std, oscillo-battant droit)

Pour chaque dimension, configure :
- Type : Fenêtre
- Matériau : PVC
- Profilé : le premier proposé (IDEAL 4000 ou similaire)
- Couleur : Blanc
- Vitrage : Double vitrage standard
- Ouverture : 1 vantail oscillo-battant droit
- Poignée : Standard blanche

Dimensions à tester :
```
1V OB : 400×400, 500×500, 600×600, 600×800, 600×1000
1V OB : 700×900, 700×1000, 700×1100, 700×1200, 700×1400
1V OB : 800×800, 800×1000, 800×1200, 800×1400
1V OB : 900×1000, 900×1200, 900×1400, 900×1600
1V OB : 1000×1000, 1000×1200, 1000×1400
```

Puis la même chose en FIXE (pas oscillo-battant) pour 3-4 dimensions :
```
1V Fixe : 600×600, 700×1200, 1000×1200
```

Puis 2 vantaux OB :
```
2V OB : 1000×1000, 1100×1200, 1200×1200, 1400×1200, 1600×1200
```

Puis 3 vantaux :
```
3V OB : 1800×1200, 2000×1200, 2400×1200
```

### BLOC 2 — EFFET DU MATÉRIAU (dimension fixe 700×1200, 1V OB, blanc, double vitrage std)

Teste chaque matériau disponible dans le configurateur :
- PVC (profilé de base)
- PVC (profilé milieu de gamme)
- PVC (profilé haut de gamme / Energeto)
- Bois pin
- Bois chêne
- Bois méranti
- Aluminium (profilé de base)
- Aluminium (profilé haut de gamme)
- Bois-Alu
- PVC-Alu

### BLOC 3 — EFFET DU PROFILÉ (PVC, 700×1200, 1V OB, blanc, double vitrage std)

Teste TOUS les profilés PVC disponibles l'un après l'autre et note le prix pour chacun.

### BLOC 4 — EFFET DU VITRAGE (PVC IDEAL 4000, 700×1200, 1V OB, blanc)

Teste CHAQUE option de vitrage disponible :
- Double vitrage standard
- Double vitrage phonique (CHAQUE classe disponible : cl.2, cl.3, cl.4, cl.5)
- Double vitrage sécurité (CHAQUE classe : A1, A3, etc.)
- Double vitrage contrôle solaire
- Double vitrage structuré / opaque
- Triple vitrage standard
- Triple vitrage phonique
- Triple vitrage sécurité
- Toute autre option de vitrage visible

### BLOC 5 — EFFET DE LA COULEUR (PVC IDEAL 4000, 700×1200, 1V OB, double vitrage std)

Teste CHAQUE couleur disponible :
- Blanc (référence)
- CHAQUE gris disponible (anthracite, quartz, etc.)
- CHAQUE décor bois (chêne doré, noyer, etc.)
- CHAQUE finition spéciale (Aludec, Woodec, etc.)
- Noir
- Crème

Puis teste le BICOLORE : blanc intérieur + gris anthracite extérieur

### BLOC 6 — EFFET DE LA POIGNÉE (PVC, 700×1200, 1V OB, blanc, double vitrage std)

Teste CHAQUE modèle de poignée disponible :
- Note le nom exact
- Note le prix
- Note la couleur disponible

### BLOC 7 — EFFET DES CROISILLONS (PVC, 700×1200, 1V OB, blanc, double vitrage std)

- Sans croisillons (référence)
- Croisillons type 1 (Helima) — 18mm, 26mm, 45mm
- Croisillons type 2 (Wiener) — 18mm, 26mm, 45mm
- Vrais croisillons

### BLOC 8 — EFFET DE LA SÉCURITÉ (PVC, 700×1200, 1V OB, blanc, double vitrage std)

Teste chaque niveau de ferrure/sécurité disponible.

### BLOC 9 — PORTE-FENÊTRE PVC (blanc, double vitrage std, OB)

```
1V OB : 700×2100, 800×2100, 900×2100, 1000×2100
2V OB : 1200×2100, 1400×2100, 1600×2100, 1800×2100
```

### BLOC 10 — BAIE COULISSANTE PVC (blanc, double vitrage std)

```
Coulissant 2V : 1500×2100, 1800×2100, 2000×2100, 2500×2100
Coulissant 3V : 2500×2100, 3000×2100
```

Si oscillo-coulissant disponible :
```
Oscillo-coulissant 2V : 1500×2100, 2000×2100, 2500×2100
```

Si soulevant-coulissant (HST) disponible :
```
HST 2V : 1500×2100, 2000×2100, 2500×2100, 3000×2100
```

### BLOC 11 — PORTE D'ENTRÉE

PVC :
- Modèle vitrée le moins cher : noter le prix
- Modèle plein le moins cher : noter le prix
- Avec serrure 3 points puis 5 points
- Avec barre de tirage
- Avec lecteur empreinte

Aluminium :
- Modèle vitrée le moins cher
- Modèle plein le moins cher

### BLOC 12 — VOLET ROULANT (sur fenêtre PVC 700×1200)

- Sans volet (référence)
- Avec volet PVC sangle
- Avec volet PVC manivelle
- Avec volet PVC INEL filaire
- Avec volet PVC Somfy ILMO
- Avec volet PVC Somfy Oximo IO
- Avec volet PVC solaire
- Avec volet ALU Somfy ILMO (si dispo)
- Avec moustiquaire intégrée (si option visible)

Coffre :
- Coffre intégré tunnel
- Coffre extérieur arrondi
- Coffre extérieur rectangulaire

### BLOC 13 — PERGOLA BIOCLIMATIQUE

- Adossée 3000×2000
- Adossée 3000×3000
- Adossée 4000×3000
- Adossée 5000×3000
- Autoportante 3000×3000
- Autoportante 4000×3000

---

## FORMAT DE SORTIE

Crée un fichier `fenetre24_prix_extraction.json` avec cette structure :

```json
{
  "date_extraction": "2026-04-16",
  "source": "fenetre24.com configurateur en ligne",
  
  "fenetre_pvc_1v_ob_dimensions": {
    "config_commune": "PVC IDEAL 4000, blanc, double vitrage std, 1V OB droit, poignée std",
    "prix": {
      "400x400": { "ttc": 0.00, "note": "" },
      "500x500": { "ttc": 0.00, "note": "" },
      ...
    }
  },
  
  "fenetre_pvc_1v_fixe_dimensions": { ... },
  "fenetre_pvc_2v_ob_dimensions": { ... },
  "fenetre_pvc_3v_ob_dimensions": { ... },
  
  "effet_materiau": {
    "config_commune": "700x1200, 1V OB, blanc, double vitrage std",
    "prix": {
      "pvc_ideal_4000": { "ttc": 0.00 },
      "pvc_ideal_7000": { "ttc": 0.00 },
      "pvc_energeto_8000": { "ttc": 0.00 },
      "bois_pin": { "ttc": 0.00 },
      ...
    }
  },
  
  "effet_profil_pvc": {
    "config_commune": "PVC, 700x1200, 1V OB, blanc, double vitrage std",
    "prix": {
      "ideal_4000": { "ttc": 0.00, "nom_complet": "" },
      ...
    }
  },
  
  "effet_vitrage": {
    "config_commune": "PVC IDEAL 4000, 700x1200, 1V OB, blanc",
    "prix": {
      "double_standard": { "ttc": 0.00, "description": "" },
      "double_phonique_cl2": { "ttc": 0.00, "description": "" },
      ...
    }
  },
  
  "effet_couleur": {
    "config_commune": "PVC IDEAL 4000, 700x1200, 1V OB, double vitrage std",
    "prix": {
      "blanc": { "ttc": 0.00 },
      "gris_anthracite": { "ttc": 0.00, "ral": "7016" },
      ...
    }
  },
  
  "effet_bicolore": {
    "sans": { "ttc": 0.00 },
    "blanc_int_gris_ext": { "ttc": 0.00 }
  },
  
  "effet_poignee": {
    "config_commune": "PVC IDEAL 4000, 700x1200, 1V OB, blanc, double vitrage std",
    "prix": {
      "modele_1": { "ttc": 0.00, "nom": "", "couleur": "" },
      ...
    }
  },
  
  "effet_croisillons": { ... },
  "effet_securite": { ... },
  
  "porte_fenetre_pvc": { ... },
  "baie_coulissante_pvc": { ... },
  "porte_entree": { ... },
  "volet_roulant": { ... },
  "pergola": { ... }
}
```

## CONSIGNES CRITIQUES

1. NE PAS estimer — noter le prix EXACT affiché
2. Si une option n'est pas disponible, noter "non_disponible"  
3. Si le configurateur change d'interface selon le produit, adapter la navigation
4. Faire des CAPTURES d'écran des prix si possible
5. Si tu rencontres un bug ou un prix incohérent, le noter en commentaire
6. Prends ton temps — la précision est plus importante que la vitesse
