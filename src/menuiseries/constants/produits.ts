import type { TypeProduitDef } from '../types';

// ─── Catalogue produits calqué sur fenetre24.com ──────────────────────
// Fenêtres (1V, 2V, 3V), Portes-fenêtres (1V–4V), Baie coulissante,
// Baie oscillo-coulissante, Porte d'entrée, Porte de service,
// Volet roulant (intégré / extérieur), Pergola bioclimatique

export const TYPES_PRODUITS: TypeProduitDef[] = [
  // ── Fenêtres ────────────────────────────────────────
  {
    id: 'fenetre',
    label: 'Fenêtre',
    description: 'Fenêtre sur mesure 1, 2 ou 3 vantaux — battante, oscillo-battante ou fixe',
    icon: 'AppWindow',
    materiauxDisponibles: ['pvc', 'bois', 'aluminium', 'bois_alu', 'pvc_alu'],
    formesDisponibles: ['rectangulaire', 'cintre', 'arc_surbaisse', 'trapeze', 'triangle', 'rond', 'oeil_de_boeuf'],
    ouverturesDisponibles: ['fixe', 'battant_gauche', 'battant_droit', 'oscillo_battant_gauche', 'oscillo_battant_droit', 'a_soufflet'],
    hasVitrage: true,
    hasVoletIntegre: true,
  },

  // ── Portes-fenêtres ─────────────────────────────────
  {
    id: 'porte_fenetre',
    label: 'Porte-fenêtre',
    description: 'Porte-fenêtre battante ou oscillo-battante, 1 à 4 vantaux',
    icon: 'DoorOpen',
    materiauxDisponibles: ['pvc', 'bois', 'aluminium', 'bois_alu', 'pvc_alu'],
    formesDisponibles: ['rectangulaire', 'cintre', 'arc_surbaisse'],
    ouverturesDisponibles: ['battant_gauche', 'battant_droit', 'oscillo_battant_gauche', 'oscillo_battant_droit', 'fixe'],
    hasVitrage: true,
    hasVoletIntegre: true,
  },

  // ── Baie coulissante (coulissant / soulevant-coulissant) ─
  {
    id: 'baie_coulissante',
    label: 'Baie coulissante',
    description: 'Baie vitrée coulissante ou soulevant-coulissant — grandes ouvertures',
    icon: 'PanelsTopLeft',
    materiauxDisponibles: ['pvc', 'bois', 'aluminium', 'bois_alu', 'pvc_alu'],
    formesDisponibles: ['rectangulaire'],
    ouverturesDisponibles: ['coulissant', 'soulevant_coulissant'],
    hasVitrage: true,
    hasVoletIntegre: true,
  },

  // ── Baie oscillo-coulissante ────────────────────────
  {
    id: 'baie_oscillo_coulissante',
    label: 'Baie oscillo-coulissante',
    description: 'Baie vitrée oscillo-coulissante à translation — le vantail bascule puis coulisse',
    icon: 'PanelRightOpen',
    materiauxDisponibles: ['pvc', 'bois', 'aluminium', 'bois_alu', 'pvc_alu'],
    formesDisponibles: ['rectangulaire'],
    ouverturesDisponibles: ['oscillo_coulissant'],
    hasVitrage: true,
    hasVoletIntegre: true,
  },

  // ── Porte d'entrée ──────────────────────────────────
  {
    id: 'porte_entree',
    label: "Porte d'entrée",
    description: "Porte d'entrée sur mesure en PVC, aluminium, bois ou acier — sécurité et isolation",
    icon: 'DoorClosed',
    materiauxDisponibles: ['pvc', 'bois', 'aluminium', 'bois_alu', 'acier'],
    formesDisponibles: ['rectangulaire', 'cintre', 'arc_surbaisse'],
    ouverturesDisponibles: ['battant_gauche', 'battant_droit'],
    hasVitrage: true,
    hasVoletIntegre: false,
  },

  // ── Porte de service ────────────────────────────────
  {
    id: 'porte_service',
    label: 'Porte de service',
    description: 'Porte de service extérieure — accès garage, buanderie, jardin',
    icon: 'LogIn',
    materiauxDisponibles: ['pvc', 'aluminium', 'bois'],
    formesDisponibles: ['rectangulaire'],
    ouverturesDisponibles: ['battant_gauche', 'battant_droit'],
    hasVitrage: true,
    hasVoletIntegre: false,
  },

  // ── Volet roulant ───────────────────────────────────
  {
    id: 'volet_roulant',
    label: 'Volet roulant',
    description: 'Volet roulant intégré ou extérieur — sangle, manivelle, motorisé ou solaire',
    icon: 'Blinds',
    materiauxDisponibles: ['pvc', 'aluminium'],
    formesDisponibles: ['rectangulaire'],
    ouverturesDisponibles: [],
    hasVitrage: false,
    hasVoletIntegre: false,
  },

  // ── Pergola bioclimatique ───────────────────────────
  {
    id: 'pergola',
    label: 'Pergola bioclimatique',
    description: 'Pergola bioclimatique aluminium — adossée ou autoportante, lames orientables',
    icon: 'Fence',
    materiauxDisponibles: ['aluminium'],
    formesDisponibles: ['rectangulaire'],
    ouverturesDisponibles: [],
    hasVitrage: false,
    hasVoletIntegre: false,
  },
];

export function getTypeProduit(id: string): TypeProduitDef | undefined {
  return TYPES_PRODUITS.find((t) => t.id === id);
}
