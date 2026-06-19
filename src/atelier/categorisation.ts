// ── Moteur de catégorisation automatique des articles fournisseurs ────
// Analyse la désignation + la référence + le fournisseur pour classer
// chaque article dans une catégorie produit.

export type CategorieProduit =
  | 'PROFILE'
  | 'QUINCAILLERIE'
  | 'VITRAGE'
  | 'JOINT'
  | 'VISSERIE'
  | 'CONSOMMABLE'
  | 'OUTILLAGE'
  | 'EPI'
  | 'ACCESSOIRE'
  | 'HABILLAGE'
  | 'AUTOMATISME'
  | 'DIVERS';

export interface CategorieDefinition {
  id: CategorieProduit;
  label: string;
  description: string;
  couleur: string;
  motsCles: RegExp;
}

export const CATEGORIES: CategorieDefinition[] = [
  {
    id: 'PROFILE',
    label: 'Profilés & Barres',
    description: 'Barres alu, profilés PVC, traverses, montants, dormants, ouvrants',
    couleur: '#4b8fc8',
    motsCles: /profil|barre\b|traverse|montant|dormant|ouvrant|cadre|rupteur|meneau|parclose|coupure\s*thermique|RPT|lisse\b|raidisseur|tubulaire|section|longueur\s*\d+\s*mm|6[0-5]00\s*mm|\b[A-Z]{2,3}\s*\d{4,6}\b.*mm/i,
  },
  {
    id: 'QUINCAILLERIE',
    label: 'Quincaillerie',
    description: 'Crémones, compas, gâches, paumelles, renvois, ferrures, serrures',
    couleur: '#c8a84b',
    motsCles: /cr[eé]mone|compas|g[aâ]che|paumelle|renvoi|ferrure|serrure|verrou|t[eê]ti[eè]re|entrebâilleur|limiteur|anti.d[eé]croch|fiches?\s*(interm|de\s*comp)|p[eê]ne|galet|charni[eè]re|pivot|b[eé]quille|barillet|cylindre|multi.?point|ferco|winkhaus|maco|roto|siegenia/i,
  },
  {
    id: 'VITRAGE',
    label: 'Vitrage',
    description: 'Double/triple vitrage, vitrages isolants, intercalaires',
    couleur: '#7ac8c8',
    motsCles: /vitrage|verre\b|glace\b|intercalaire|spacer|butyl|warm.?edge|argon|krypton|\d+\/\d+\/\d+|feuillet[eé]|tremp[eé]|s[eé]curit|phonique|thermique.*verre|saint.?gobain|AGC|guardian|pilkington/i,
  },
  {
    id: 'JOINT',
    label: 'Joints & Etanchéité',
    description: 'Joints EPDM, brosses, mousse, calfeutrage, lèvres',
    couleur: '#4bc87a',
    motsCles: /joint\b|brosse\b|epdm|mousse\b|calfeutr|l[eè]vre|[eé]tanch|coextr|souple|profil[eé]\s*d.*[eé]tanch|central\b.*joint|ouvrant\b.*joint|dormant\b.*joint/i,
  },
  {
    id: 'VISSERIE',
    label: 'Visserie & Fixation',
    description: 'Vis, boulons, rivets, chevilles, écrous, rondelles, tiges',
    couleur: '#c84b4b',
    motsCles: /\bvis\b|boulon|rivet|cheville|[eé]crou|rondelle|tige\s*filet|goujon|tir[eé]fond|auto.?for|auto.?perc|auto.?tar|t[eê]te\s*(hex|frais|bomb|cylin)|inox\s*A[24]|galva|zing|torx|pozidri|cruciforme|6[\.,]3|4[\.,]8|3[\.,]9/i,
  },
  {
    id: 'CONSOMMABLE',
    label: 'Consommables',
    description: 'Silicone, colle, mastic, adhésif, film, nettoyant',
    couleur: '#c87a4b',
    motsCles: /silicone|colle\b|mastic|adh[eé]sif|film\b|ruban\b|scotch|solvant|nettoyant|d[eé]graissant|lubrifiant|primaire|spray|a[eé]rosol|cartouche|bombe\b|chiffon|absorbant/i,
  },
  {
    id: 'OUTILLAGE',
    label: 'Outillage',
    description: 'Cutter, visseuse, perceuse, tréteaux, ventouses, forets, lames',
    couleur: '#c84b7a',
    motsCles: /cutter|visseuse|perceuse|tr[eé]teau|ventouse|lame\b|foret|scie\b|meule|disque\b.*[cç]|ponceuse|fraise\b|embout\b.*tournevis|cl[eé]\s*(plate|allen|torx|pipe)|pince|marteau|niveau|m[eè]tre|r[eè]gle|[eé]querre\b.*outil|serre.?joint|[eé]tabli|chariot|diable/i,
  },
  {
    id: 'EPI',
    label: 'Equipements de Protection',
    description: 'Gants, lunettes, casques, chaussures sécurité, gilets',
    couleur: '#7a4bc8',
    motsCles: /gant\b|lunette|casque|chaussure|gilet|bouchon.*oreille|masque|protection|s[eé]curit[eé].*[eé]quip|harnais|visi[eè]re|combinaison|tablier|genouill[eè]re|EPI\b/i,
  },
  {
    id: 'ACCESSOIRE',
    label: 'Accessoires Menuiserie',
    description: 'Poignées, caches, bouchons, clips, embouts, pièces de finition',
    couleur: '#888888',
    motsCles: /poign[eé]e|cache\b|bouchon|clip\b|embout\b|capot\b|patte\b.*fixation|[eé]querre\b(?!.*outil)|sabot|goupille|plaquette|rosace|entr[eé]e\s*de\s*cl[eé]|b[eé]quille|olive\b|bouton\b.*porte/i,
  },
  {
    id: 'HABILLAGE',
    label: 'Habillage & Finition',
    description: 'Tapées, bavettes, appuis, seuils, couvertines, nez de cloison',
    couleur: '#4bc8c8',
    motsCles: /tap[eé]e|bavette|appui\b|seuil|couvertine|habillage|nez\s*de\s*cloison|rejingot|couvre.?joint|grille\s*ventil|a[eé]ration|closoir/i,
  },
  {
    id: 'AUTOMATISME',
    label: 'Automatismes & Motorisation',
    description: 'Moteurs volets, télécommandes, capteurs, câbles',
    couleur: '#c8c84b',
    motsCles: /moteur|t[eé]l[eé]commande|capteur|interrupteur|c[aâ]ble\b|automatisme|somfy|nice\b|bubendorff|commande\b.*radio|r[eé]cepteur|[eé]metteur|domotique|io\b.*home|variateur/i,
  },
];

// ── Catégorisation par fournisseur (bonus) ───────────────────────────
// Certains fournisseurs sont spécialisés — on peut booster la confiance

const FOURNISSEUR_CATEGORIES: Record<string, CategorieProduit[]> = {
  // ── Fournisseurs directs (fabricants) ──
  'kawneer': ['PROFILE', 'ACCESSOIRE', 'HABILLAGE'],
  'rehau': ['PROFILE', 'JOINT', 'ACCESSOIRE'],
  'ferco': ['QUINCAILLERIE'],
  'winkhaus': ['QUINCAILLERIE'],
  'roto': ['QUINCAILLERIE'],
  'siegenia': ['QUINCAILLERIE'],
  'wurth': ['VISSERIE', 'CONSOMMABLE', 'OUTILLAGE', 'EPI'],
  'faynot': ['VISSERIE'],
  'sfs': ['VISSERIE'],
  'saint-gobain': ['VITRAGE'],
  'agc': ['VITRAGE'],
  'guardian': ['VITRAGE'],
  'pilkington': ['VITRAGE'],
  'somfy': ['AUTOMATISME'],
  'nice': ['AUTOMATISME'],
  'hoppe': ['ACCESSOIRE', 'QUINCAILLERIE'],
  'gu': ['QUINCAILLERIE'],
  'schlegel': ['JOINT'],
  'sika': ['CONSOMMABLE'],
  'illbruck': ['JOINT', 'CONSOMMABLE'],
  'tramico': ['CONSOMMABLE', 'JOINT'],
  // ── Distributeurs / Quincailliers (multi-marques) ──
  'pro equipe': ['QUINCAILLERIE', 'ACCESSOIRE', 'VISSERIE'],
  'pro équipe': ['QUINCAILLERIE', 'ACCESSOIRE', 'VISSERIE'],
  'proequipe': ['QUINCAILLERIE', 'ACCESSOIRE', 'VISSERIE'],
  'foussier': ['QUINCAILLERIE', 'VISSERIE', 'OUTILLAGE', 'CONSOMMABLE', 'EPI'],
  'boschat': ['QUINCAILLERIE', 'VISSERIE', 'OUTILLAGE', 'CONSOMMABLE'],
  'laveix': ['QUINCAILLERIE', 'VISSERIE', 'OUTILLAGE', 'CONSOMMABLE'],
  'boschat laveix': ['QUINCAILLERIE', 'VISSERIE', 'OUTILLAGE', 'CONSOMMABLE'],
  'rey': ['QUINCAILLERIE', 'ACCESSOIRE', 'VISSERIE'],
  'nerfs': ['QUINCAILLERIE', 'ACCESSOIRE', 'VISSERIE'],
};

// ── Distributeurs connus (ref distributeur ≠ ref fabricant) ──────────
// Ces fournisseurs ont leur propre codification sur la facture,
// mais la désignation contient la ref fabricant (Ferco, Roto, etc.)
export const DISTRIBUTEURS: Record<string, { label: string; marques: string[] }> = {
  'pro equipe': { label: 'PRO Équipe', marques: ['Ferco', 'Winkhaus', 'Roto', 'Siegenia', 'Hoppe', 'GU'] },
  'pro équipe': { label: 'PRO Équipe', marques: ['Ferco', 'Winkhaus', 'Roto', 'Siegenia', 'Hoppe', 'GU'] },
  'proequipe': { label: 'PRO Équipe', marques: ['Ferco', 'Winkhaus', 'Roto', 'Siegenia', 'Hoppe', 'GU'] },
  'foussier': { label: 'Foussier', marques: ['Ferco', 'Winkhaus', 'Roto', 'Hoppe', 'Wurth', 'Facom'] },
  'boschat': { label: 'Boschat Laveix', marques: ['Ferco', 'Roto', 'Siegenia', 'Hoppe'] },
  'laveix': { label: 'Boschat Laveix', marques: ['Ferco', 'Roto', 'Siegenia', 'Hoppe'] },
  'boschat laveix': { label: 'Boschat Laveix', marques: ['Ferco', 'Roto', 'Siegenia', 'Hoppe'] },
  'rey': { label: 'Rey', marques: [] },
  'nerfs': { label: 'Nerfs', marques: [] },
};

// ── Fonction de catégorisation ───────────────────────────────────────

export interface ResultatCategorie {
  categorie: CategorieProduit;
  confiance: 'haute' | 'moyenne' | 'basse';
  motif: string;
}

export function categoriserArticle(
  ref: string,
  designation: string,
  fournisseur: string,
): ResultatCategorie {
  const texte = `${ref} ${designation}`;
  const fournisseurLower = fournisseur.toLowerCase();

  // 1. Chercher par mots-clés dans la désignation
  for (const cat of CATEGORIES) {
    if (cat.motsCles.test(texte)) {
      // Vérifier si le fournisseur confirme
      const fournisseurCats = Object.entries(FOURNISSEUR_CATEGORIES)
        .find(([f]) => fournisseurLower.includes(f))?.[1];
      const confirmeParFournisseur = fournisseurCats?.includes(cat.id);

      return {
        categorie: cat.id,
        confiance: confirmeParFournisseur ? 'haute' : 'moyenne',
        motif: confirmeParFournisseur
          ? `Mots-cles "${texte.match(cat.motsCles)?.[0]}" + fournisseur ${fournisseur}`
          : `Mots-cles detectes dans la designation`,
      };
    }
  }

  // 2. Fallback : deviner par le fournisseur seul
  const fournisseurCats = Object.entries(FOURNISSEUR_CATEGORIES)
    .find(([f]) => fournisseurLower.includes(f))?.[1];
  if (fournisseurCats && fournisseurCats.length > 0) {
    return {
      categorie: fournisseurCats[0],
      confiance: 'basse',
      motif: `Categorie supposee d'apres le fournisseur ${fournisseur}`,
    };
  }

  // 3. Inconnu
  return {
    categorie: 'DIVERS',
    confiance: 'basse',
    motif: 'Aucun mot-cle reconnu',
  };
}

// ── Regroupement intelligent ─────────────────────────────────────────

export interface GroupeCategorie {
  categorie: CategorieProduit;
  definition: CategorieDefinition;
  articles: { ref: string; designation: string; fournisseur: string; confiance: string }[];
  nbRefs: number;
  nbHauteConfiance: number;
}

export function regrouperParCategorie(
  items: { ref: string; designation: string; fournisseur: string }[],
): GroupeCategorie[] {
  const groupes = new Map<CategorieProduit, GroupeCategorie>();

  for (const item of items) {
    const result = categoriserArticle(item.ref, item.designation, item.fournisseur);
    const def = CATEGORIES.find(c => c.id === result.categorie) ?? CATEGORIES[CATEGORIES.length - 1];

    if (!groupes.has(result.categorie)) {
      groupes.set(result.categorie, {
        categorie: result.categorie,
        definition: def,
        articles: [],
        nbRefs: 0,
        nbHauteConfiance: 0,
      });
    }

    const groupe = groupes.get(result.categorie)!;
    groupe.articles.push({ ...item, confiance: result.confiance });
    groupe.nbRefs++;
    if (result.confiance === 'haute') groupe.nbHauteConfiance++;
  }

  return [...groupes.values()].sort((a, b) => b.nbRefs - a.nbRefs);
}

// ── Extraction ref fabricant depuis désignation ──────────────────────
// Quand la facture vient d'un distributeur (PRO Équipe, Foussier, etc.),
// la ref sur la facture est celle du distributeur. La ref fabricant
// (ex: Ferco G-22158-00) se trouve dans la désignation.

const PATTERNS_REF_FABRICANT: { marque: string; pattern: RegExp }[] = [
  // Ferco : G-xxxxx-xx-x-x, E-xxxxx-xx-x-x, 6-xxxxx-xx-x-x, 9-xxxxx-xx-x-x
  { marque: 'Ferco', pattern: /\b([GE69]-\d{5}-\d{2}-\d-\d)\b/ },
  // Ferco court : G-22158, E-19736
  { marque: 'Ferco', pattern: /\b([GE69]-\d{5}(?:-\d{2})?)\b/ },
  // Winkhaus : activPilot, autoLock + ref
  { marque: 'Winkhaus', pattern: /\b((?:activPilot|autoLock|STV|AV2)\s*[\w.-]+)\b/i },
  // Roto : R600, R700, NT, NX
  { marque: 'Roto', pattern: /\b((?:R[67]\d{2}|NT|NX)\s*[\w.-]+)\b/i },
  // Siegenia : TITAN, A-TEC, SI
  { marque: 'Siegenia', pattern: /\b((?:TITAN|A-TEC|SI)\s*[\w.-]+)\b/i },
  // Hoppe : Atlanta, Secustik + ref num
  { marque: 'Hoppe', pattern: /\b((?:Atlanta|Secustik|Luxembourg|Toulon)\s*[\w.-]*)\b/i },
  // GU : BKS, Secury + ref
  { marque: 'GU', pattern: /\b((?:BKS|Secury|GU)\s*[\w.-]+)\b/i },
  // Ref générique alphanumérique avec tirets (ex: CR3P-ALU-BL)
  { marque: '', pattern: /\b([A-Z]{2,4}-[A-Z0-9]{2,}-[A-Z0-9]{1,})\b/ },
];

export interface RefsExtraites {
  refDistributeur: string;
  refFabricant: string | null;
  marqueFabricant: string | null;
  isDistributeur: boolean;
}

export function extraireRefs(
  refFacture: string,
  designation: string,
  fournisseur: string,
): RefsExtraites {
  const fLower = fournisseur.toLowerCase();
  const distrib = Object.entries(DISTRIBUTEURS).find(([key]) => fLower.includes(key));
  const isDistributeur = !!distrib;

  if (!isDistributeur) {
    return { refDistributeur: refFacture, refFabricant: null, marqueFabricant: null, isDistributeur: false };
  }

  // Chercher la ref fabricant dans la désignation
  for (const { marque, pattern } of PATTERNS_REF_FABRICANT) {
    const match = designation.match(pattern);
    if (match) {
      return {
        refDistributeur: refFacture,
        refFabricant: match[1],
        marqueFabricant: marque || null,
        isDistributeur: true,
      };
    }
  }

  return { refDistributeur: refFacture, refFabricant: null, marqueFabricant: null, isDistributeur: true };
}

// ── Export pour réutilisation ─────────────────────────────────────────

export function getCategorieDefinition(id: CategorieProduit): CategorieDefinition {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function getAllCategories(): CategorieDefinition[] {
  return [...CATEGORIES, {
    id: 'DIVERS' as CategorieProduit,
    label: 'Divers',
    description: 'Articles non classifiés',
    couleur: '#555555',
    motsCles: /^$/,
  }];
}
