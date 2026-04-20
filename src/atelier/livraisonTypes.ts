// ── Types Préparation & Livraison ─────────────────────────────────────

export interface MenuiserieLivraison {
  id: string;
  barcode: string;
  repere: string;        // ex: F01, PF01, BC01
  type: string;          // Fenêtre 1V OB, Porte-fenêtre 2V, etc.
  dimensions: string;    // 700×1200
  largeurMM: number;
  hauteurMM: number;
  materiau: string;      // ALU / PVC
  couleur: string;
  vitrage: string;
  poids_kg: number;
  local: string;         // Salon, Chambre, etc.
  accessoires: AccessoireLivraison[];
  statut: 'a_preparer' | 'prepare' | 'charge' | 'livre';
}

export interface AccessoireLivraison {
  ref: string;
  designation: string;
  qte: number;
  prepare: boolean;
}

export interface CommandeClient {
  id: string;
  ref: string;           // ex: CMD-2026-0154
  client: string;
  adresse: string;
  telephone: string;
  dateLivraisonPrevue: string;
  priorite: number;      // Ordre dans la tournée (1 = premier livré)
  menuiseries: MenuiserieLivraison[];
  notes: string;
}

export interface Tournee {
  id: string;
  ref: string;           // ex: TRN-2026-05-15
  date: string;
  chauffeur: string;
  vehicule: string;
  commandes: CommandeClient[];  // Ordonnées par priorité de livraison
  statut: 'preparation' | 'chargement' | 'en_cours' | 'terminee';
}

export interface SignatureLivraison {
  commandeId: string;
  signatureDataUrl: string;  // base64 du canvas signature
  dateSignature: string;
  reserves: string;
  photoReserves?: string;    // base64 photo
}

// ── Données démo ─────────────────────────────────────────────────────

export const DEMO_TOURNEE: Tournee = {
  id: 'TRN1',
  ref: 'TRN-2026-05-15',
  date: '2026-05-15',
  chauffeur: 'Marco',
  vehicule: 'Iveco Daily — AB-123-CD',
  statut: 'preparation',
  commandes: [
    {
      id: 'CMD1', ref: 'CMD-2026-0154', client: 'M. Dupont', adresse: '12 chemin des Oliviers, 20166 Porticcio',
      telephone: '06 12 34 56 78', dateLivraisonPrevue: '2026-05-15', priorite: 1, notes: 'Appeler 30min avant',
      menuiseries: [
        {
          id: 'M1', barcode: '2207029970010100211', repere: 'F01', type: 'Fenetre 1V OB', dimensions: '700×1200',
          largeurMM: 700, hauteurMM: 1200, materiau: 'PVC', couleur: 'Blanc RAL9016', vitrage: '4/16Ar/4BE',
          poids_kg: 18, local: 'Salon', statut: 'a_preparer',
          accessoires: [
            { ref: 'PO-STD-BL', designation: 'Poignee standard blanche', qte: 1, prepare: false },
            { ref: 'TAP-120', designation: 'Tapee isolation 120mm', qte: 2, prepare: false },
          ],
        },
        {
          id: 'M2', barcode: '2207029970010100212', repere: 'F02', type: 'Fenetre 1V OB', dimensions: '700×1200',
          largeurMM: 700, hauteurMM: 1200, materiau: 'PVC', couleur: 'Blanc RAL9016', vitrage: '4/16Ar/4BE',
          poids_kg: 18, local: 'Chambre 1', statut: 'a_preparer',
          accessoires: [
            { ref: 'PO-STD-BL', designation: 'Poignee standard blanche', qte: 1, prepare: false },
            { ref: 'TAP-120', designation: 'Tapee isolation 120mm', qte: 2, prepare: false },
          ],
        },
        {
          id: 'M3', barcode: '2207029970010100213', repere: 'PF01', type: 'Porte-fenetre 2V OB', dimensions: '1400×2150',
          largeurMM: 1400, hauteurMM: 2150, materiau: 'PVC', couleur: 'Blanc RAL9016', vitrage: '4/16Ar/4BE',
          poids_kg: 42, local: 'Sejour', statut: 'a_preparer',
          accessoires: [
            { ref: 'PO-STD-BL', designation: 'Poignee standard blanche', qte: 2, prepare: false },
            { ref: 'SEUIL-PVC', designation: 'Seuil PVC 1400mm', qte: 1, prepare: false },
          ],
        },
        {
          id: 'M4', barcode: '2207029970010100214', repere: 'BC01', type: 'Baie coulissante 2V', dimensions: '2500×2150',
          largeurMM: 2500, hauteurMM: 2150, materiau: 'ALU', couleur: 'Gris anthracite RAL7016', vitrage: '4/16Ar/4BE',
          poids_kg: 85, local: 'Sejour', statut: 'a_preparer',
          accessoires: [
            { ref: 'KIT-COUL', designation: 'Kit coulissant complet', qte: 1, prepare: false },
          ],
        },
      ],
    },
    {
      id: 'CMD2', ref: 'CMD-2026-0148', client: 'Mme Ferracci', adresse: '8 avenue Napoleon, 20000 Ajaccio',
      telephone: '06 98 76 54 32', dateLivraisonPrevue: '2026-05-15', priorite: 2, notes: 'Livraison RDC uniquement',
      menuiseries: [
        {
          id: 'M5', barcode: '2207029970020100301', repere: 'PE01', type: 'Porte entree ALU', dimensions: '900×2150',
          largeurMM: 900, hauteurMM: 2150, materiau: 'ALU', couleur: 'Gris anthracite RAL7016', vitrage: '44.2/16Ar/4BE',
          poids_kg: 55, local: 'Entree', statut: 'a_preparer',
          accessoires: [
            { ref: 'BARRE-TIR', designation: 'Barre de tirage inox 1200mm', qte: 1, prepare: false },
            { ref: 'CYLIN-5P', designation: 'Cylindre securite 5 points', qte: 1, prepare: false },
          ],
        },
        {
          id: 'M6', barcode: '2207029970020100302', repere: 'F01', type: 'Fenetre 2V OB', dimensions: '1200×1200',
          largeurMM: 1200, hauteurMM: 1200, materiau: 'ALU', couleur: 'Gris anthracite RAL7016', vitrage: '4/16Ar/4BE',
          poids_kg: 28, local: 'Cuisine', statut: 'a_preparer',
          accessoires: [
            { ref: 'PO-DES-NM', designation: 'Poignee design noir mat', qte: 2, prepare: false },
          ],
        },
        {
          id: 'M7', barcode: '2207029970020100303', repere: 'F02', type: 'Fenetre 1V soufflet', dimensions: '600×400',
          largeurMM: 600, hauteurMM: 400, materiau: 'ALU', couleur: 'Gris anthracite RAL7016', vitrage: '4/16Ar/4BE',
          poids_kg: 8, local: 'SDB', statut: 'a_preparer',
          accessoires: [],
        },
      ],
    },
    {
      id: 'CMD3', ref: 'CMD-2026-0161', client: 'SCI Les Sanguinaires', adresse: 'Route des Sanguinaires, 20000 Ajaccio',
      telephone: '04 95 12 34 56', dateLivraisonPrevue: '2026-05-15', priorite: 3, notes: 'Chantier neuf — RDV avec chef de chantier',
      menuiseries: [
        {
          id: 'M8', barcode: '2207029970030100401', repere: 'F01', type: 'Fenetre 2V OB', dimensions: '1400×1200',
          largeurMM: 1400, hauteurMM: 1200, materiau: 'PVC', couleur: 'Blanc RAL9016', vitrage: '4/16Ar/4BE',
          poids_kg: 30, local: 'Apt 1 Salon', statut: 'a_preparer',
          accessoires: [
            { ref: 'PO-STD-BL', designation: 'Poignee standard blanche', qte: 2, prepare: false },
            { ref: 'VR-SOMFY', designation: 'Volet roulant Somfy IO', qte: 1, prepare: false },
          ],
        },
        {
          id: 'M9', barcode: '2207029970030100402', repere: 'F02', type: 'Fenetre 2V OB', dimensions: '1400×1200',
          largeurMM: 1400, hauteurMM: 1200, materiau: 'PVC', couleur: 'Blanc RAL9016', vitrage: '4/16Ar/4BE',
          poids_kg: 30, local: 'Apt 1 Chambre', statut: 'a_preparer',
          accessoires: [
            { ref: 'PO-STD-BL', designation: 'Poignee standard blanche', qte: 2, prepare: false },
            { ref: 'VR-SOMFY', designation: 'Volet roulant Somfy IO', qte: 1, prepare: false },
          ],
        },
        {
          id: 'M10', barcode: '2207029970030100403', repere: 'PF01', type: 'Porte-fenetre 1V', dimensions: '900×2150',
          largeurMM: 900, hauteurMM: 2150, materiau: 'PVC', couleur: 'Blanc RAL9016', vitrage: '4/16Ar/4BE',
          poids_kg: 35, local: 'Apt 1 Sejour', statut: 'a_preparer',
          accessoires: [
            { ref: 'PO-STD-BL', designation: 'Poignee standard blanche', qte: 1, prepare: false },
          ],
        },
      ],
    },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────

export function getOrdreChargement(tournee: Tournee): CommandeClient[] {
  // Dernier livré = premier chargé
  return [...tournee.commandes].sort((a, b) => b.priorite - a.priorite);
}

export function getOrdreLivraison(tournee: Tournee): CommandeClient[] {
  return [...tournee.commandes].sort((a, b) => a.priorite - b.priorite);
}

export function getTotalMenuiseries(tournee: Tournee): number {
  return tournee.commandes.reduce((s, c) => s + c.menuiseries.length, 0);
}

export function getTotalPoids(tournee: Tournee): number {
  return tournee.commandes.reduce((s, c) => s + c.menuiseries.reduce((s2, m) => s2 + m.poids_kg, 0), 0);
}

export function getStatutTournee(tournee: Tournee): { prepares: number; charges: number; livres: number; total: number } {
  let prepares = 0, charges = 0, livres = 0, total = 0;
  for (const c of tournee.commandes) {
    for (const m of c.menuiseries) {
      total++;
      if (m.statut === 'prepare') prepares++;
      if (m.statut === 'charge') charges++;
      if (m.statut === 'livre') livres++;
    }
  }
  return { prepares, charges, livres, total };
}
