/**
 * Traceability data model for CE/CEKAL labeling.
 *
 * Captures all data needed for CE conformity labels:
 * - Glass supplier + lot numbers (at cutting)
 * - Assembly materials lots (at assembly)
 * - Production dates + operators
 * - IGU composition + performance values
 */

export interface GlassLotInfo {
  glass_code: string;
  fournisseur: string;
  nom_commercial: string;
  lot_fournisseur: string;
  date_reception: string;
  plaque_no: number;
}

export interface AssemblyLotInfo {
  intercalaire_lot: string;
  intercalaire_fournisseur: string;
  intercalaire_dlu: string;
  dessiccant_lot: string;
  dessiccant_fournisseur: string;
  dessiccant_dlu: string;
  mastic_butyl_lot: string;
  mastic_butyl_fournisseur: string;
  mastic_butyl_dlu: string;
  mastic_pu_lot: string;
  mastic_pu_fournisseur: string;
  mastic_pu_dlu: string;
  gaz_argon_lot: string;
  gaz_pourcentage: number;
  gaz_test_echantillon: boolean;
}

export interface LavageData {
  conductivite: number;
  ph: number;
  temperature: number;
  date_controle: string;
  conforme: boolean;
}

export interface ControlesFabrication {
  dimension_mesuree_l: number;
  dimension_mesuree_h: number;
  epaisseur_mesuree: number;
  tolerance_ok: boolean;
  continuite_butyle: boolean;
  aspect_visuel: boolean;
  point_rosee_ok: boolean;
  point_rosee_valeur: number;
  etiquette_cekal_posee: boolean;
}

export interface CEData {
  vitrage_id: string;
  vitrage_ref: string;
  commande_ref: string;
  client: string;

  // Composition
  composition: string;
  verre_ext: string;
  verre_ext_epaisseur: number;
  intercalaire_epaisseur: number;
  gaz_type: string;
  verre_int: string;
  verre_int_epaisseur: number;
  largeur: number;
  hauteur: number;

  // Performance
  ug: number;
  sw: number;
  rw: number;

  // Tracabilite lots
  lot_verre_ext: GlassLotInfo;
  lot_verre_int: GlassLotInfo;
  lots_assemblage: AssemblyLotInfo;

  // Production
  date_fabrication: string;
  operateur_coupe: string;
  operateur_assemblage: string;
  lot_fabrication: string;

  // Controles fabrication
  lavage: LavageData;
  controles: ControlesFabrication;

  // Certification
  fabricant: string;
  usine: string;
  ce_numero: string;
  cekal_numero: string;
  norme: string;
  classe_securite: string;
  fiche_lot_cekal_validee: boolean;
}

export function buildCEData(
  piece: {
    vitrage_id: string; vitrage_ref: string; commande_ref: string;
    largeur: number; hauteur: number; composition: string;
    face: string; material: string;
  },
  allPiecesForVitrage: { face: string; material: string; lot_verre?: string; operateur?: string }[],
  matieresJour: Record<string, string>,
  lotRef: string,
  client: string,
): CEData {
  const ext = allPiecesForVitrage.find(p => p.face === 'EXT');
  const int = allPiecesForVitrage.find(p => p.face === 'INT');

  return {
    vitrage_id: piece.vitrage_id,
    vitrage_ref: piece.vitrage_ref,
    commande_ref: piece.commande_ref,
    client,
    composition: piece.composition || `${ext?.material || ''} / ${int?.material || ''}`,
    verre_ext: ext?.material || '',
    verre_ext_epaisseur: 0,
    intercalaire_epaisseur: 0,
    gaz_type: 'Argon',
    verre_int: int?.material || '',
    verre_int_epaisseur: 0,
    largeur: piece.largeur,
    hauteur: piece.hauteur,
    ug: 0,
    sw: 0,
    rw: 0,
    lot_verre_ext: {
      glass_code: ext?.material || '',
      fournisseur: '',
      nom_commercial: '',
      lot_fournisseur: ext?.lot_verre || '',
      date_reception: '',
      plaque_no: 0,
    },
    lot_verre_int: {
      glass_code: int?.material || '',
      fournisseur: '',
      nom_commercial: '',
      lot_fournisseur: int?.lot_verre || '',
      date_reception: '',
      plaque_no: 0,
    },
    lots_assemblage: {
      intercalaire_lot: matieresJour.intercalaire || '',
      intercalaire_fournisseur: matieresJour.intercalaire_fournisseur || '',
      intercalaire_dlu: matieresJour.intercalaire_dlu || '',
      dessiccant_lot: matieresJour.dessiccant || '',
      dessiccant_fournisseur: matieresJour.dessiccant_fournisseur || '',
      dessiccant_dlu: matieresJour.dessiccant_dlu || '',
      mastic_butyl_lot: matieresJour.masticButyl || '',
      mastic_butyl_fournisseur: matieresJour.masticButyl_fournisseur || '',
      mastic_butyl_dlu: matieresJour.masticButyl_dlu || '',
      mastic_pu_lot: matieresJour.masticPU || '',
      mastic_pu_fournisseur: matieresJour.masticPU_fournisseur || '',
      mastic_pu_dlu: matieresJour.masticPU_dlu || '',
      gaz_argon_lot: matieresJour.gazArgon || '',
      gaz_pourcentage: 90,
      gaz_test_echantillon: false,
    },
    date_fabrication: new Date().toISOString().slice(0, 10),
    operateur_coupe: ext?.operateur || '',
    operateur_assemblage: '',
    lot_fabrication: lotRef,
    lavage: {
      conductivite: 0, ph: 0, temperature: 0,
      date_controle: new Date().toISOString().slice(0, 10),
      conforme: false,
    },
    controles: {
      dimension_mesuree_l: 0, dimension_mesuree_h: 0,
      epaisseur_mesuree: 0, tolerance_ok: false,
      continuite_butyle: false, aspect_visuel: false,
      point_rosee_ok: false, point_rosee_valeur: 0,
      etiquette_cekal_posee: false,
    },
    fabricant: 'SIAL Apertura',
    usine: 'Biguglia, Corse',
    ce_numero: '',
    cekal_numero: '',
    norme: 'EN 1279',
    classe_securite: '',
    fiche_lot_cekal_validee: false,
  };
}

/**
 * Sync traceability data to Odoo via the connector.
 * Creates/updates a production lot record in Odoo with all CE data.
 */
export async function syncTraceabilityToOdoo(
  ceData: CEData[],
  apiBase: string,
): Promise<{ ok: boolean; synced: number; errors: number }> {
  let synced = 0;
  let errors = 0;

  for (const ce of ceData) {
    try {
      const res = await fetch(`${apiBase}/api/data/tracabilite/ce/${ce.vitrage_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sial_token') || ''}`,
        },
        body: JSON.stringify(ce),
      });
      if (res.ok) synced++;
      else errors++;
    } catch {
      errors++;
    }
  }

  return { ok: errors === 0, synced, errors };
}
