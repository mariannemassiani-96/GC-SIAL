/**
 * Traceability model for SIAL menuiseries (alu + PVC).
 * CE marking (EN 14351-1) for all, NF additionally for PVC.
 *
 * Follows a single menuiserie through 6 workstations:
 * CT-01 Reception & coupe → CT-02 Assemblage → CT-03 Soudure PVC
 * → CT-04 Ferrage → CT-05 Vitrage → CT-06 Controle final
 */

export interface MenuiserieTraca {
  id: string;
  of_ref: string;
  commande_ref: string;
  client: string;
  window_it_code: string;
  matiere: 'alu' | 'pvc';
  gamme: string;
  type_ouverture: string;
  dimensions_l: number;
  dimensions_h: number;
  coloris: string;
  sens: 'gauche' | 'droite' | '';

  // CT-01 Reception & coupe
  ct01: {
    lot_profils: string;
    profil_fournisseur: string;
    lot_quincaillerie: string;
    quincaillerie_fournisseur: string;
    reception_conforme: boolean;
    coupe_longueur_mesuree: number;
    coupe_tolerance_ok: boolean;
    coupe_angle_ok: boolean;
    coupe_aspect_ok: boolean;
    joints_poses: boolean;
    identification_piece_ok: boolean;
    operateur: string;
    date: string;
    valide: boolean;
  };

  // CT-02 Assemblage dormants
  ct02: {
    equerrage_ok: boolean;
    equerrage_valeur: number;
    options_ok: boolean;
    etiquette_ce_posee: boolean;
    etiquette_window_it_posee: boolean;
    operateur: string;
    chef_equipe_validation: string;
    date: string;
    valide: boolean;
  };

  // CT-03 Soudure PVC (si matiere = pvc)
  ct03: {
    applicable: boolean;
    temperature: number;
    temps_pression: number;
    aspect_ok: boolean;
    test_destructif_ok: boolean;
    rebut: boolean;
    operateur: string;
    date: string;
    valide: boolean;
  };

  // CT-04 Ferrage
  ct04: {
    ferrage_conforme: boolean;
    fonctionnement_fluide: boolean;
    reglage_ok: boolean;
    operateur: string;
    date: string;
    valide: boolean;
  };

  // CT-05 Vitrage menuiserie
  ct05: {
    lot_vitrage: string;
    vitrage_fournisseur: string;
    vitrage_isula: boolean;
    vitrage_cekal_id: string;
    vitrage_composition: string;
    vitrage_lot_ext: string;
    vitrage_lot_int: string;
    vitrage_cekal_numero: string;
    sens_profiles_ok: boolean;
    calage_dtu_ok: boolean;
    correspondance_lot: boolean;
    proprete_ok: boolean;
    operateur: string;
    date: string;
    valide: boolean;
  };

  // CT-06 Controle final
  ct06: {
    fonctionnement_global_ok: boolean;
    dimensions_finales_l: number;
    dimensions_finales_h: number;
    etiquette_ce_conforme: boolean;
    window_it_scanne: boolean;
    emballage_ok: boolean;
    chef_equipe: string;
    date: string;
    libere: boolean;
  };

  // NF PVC
  nf: {
    applicable: boolean;
    numero_certification: string;
    dop_reference: string;
    permeabilite: string;
    etancheite: string;
    resistance_vent: string;
    marquage_pose: boolean;
  };

  state: 'brouillon' | 'en_cours' | 'controle_final' | 'libere' | 'expedie';
  lot_fabrication: string;
  date_creation: string;
}

export function createEmptyMenuiserieTraca(of_ref: string, matiere: 'alu' | 'pvc'): MenuiserieTraca {
  return {
    id: crypto.randomUUID(),
    of_ref,
    commande_ref: '', client: '', window_it_code: '',
    matiere, gamme: '', type_ouverture: '',
    dimensions_l: 0, dimensions_h: 0, coloris: '', sens: '',
    ct01: { lot_profils: '', profil_fournisseur: '', lot_quincaillerie: '', quincaillerie_fournisseur: '', reception_conforme: false, coupe_longueur_mesuree: 0, coupe_tolerance_ok: false, coupe_angle_ok: false, coupe_aspect_ok: false, joints_poses: false, identification_piece_ok: false, operateur: '', date: '', valide: false },
    ct02: { equerrage_ok: false, equerrage_valeur: 0, options_ok: false, etiquette_ce_posee: false, etiquette_window_it_posee: false, operateur: '', chef_equipe_validation: '', date: '', valide: false },
    ct03: { applicable: matiere === 'pvc', temperature: 0, temps_pression: 0, aspect_ok: false, test_destructif_ok: false, rebut: false, operateur: '', date: '', valide: false },
    ct04: { ferrage_conforme: false, fonctionnement_fluide: false, reglage_ok: false, operateur: '', date: '', valide: false },
    ct05: { lot_vitrage: '', vitrage_fournisseur: '', vitrage_isula: false, vitrage_cekal_id: '', vitrage_composition: '', vitrage_lot_ext: '', vitrage_lot_int: '', vitrage_cekal_numero: '', sens_profiles_ok: false, calage_dtu_ok: false, correspondance_lot: false, proprete_ok: false, operateur: '', date: '', valide: false },
    ct06: { fonctionnement_global_ok: false, dimensions_finales_l: 0, dimensions_finales_h: 0, etiquette_ce_conforme: false, window_it_scanne: false, emballage_ok: false, chef_equipe: '', date: '', libere: false },
    nf: { applicable: matiere === 'pvc', numero_certification: '', dop_reference: '', permeabilite: '', etancheite: '', resistance_vent: '', marquage_pose: false },
    state: 'brouillon', lot_fabrication: '', date_creation: new Date().toISOString(),
  };
}

export function getCtProgress(t: MenuiserieTraca): { done: number; total: number; pct: number } {
  const steps = [t.ct01.valide, t.ct02.valide, t.ct04.valide, t.ct05.valide, t.ct06.libere];
  if (t.matiere === 'pvc') steps.splice(2, 0, t.ct03.valide);
  const done = steps.filter(Boolean).length;
  const total = steps.length;
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export function getCtLabel(ct: string): string {
  const labels: Record<string, string> = {
    ct01: 'CT-01 Reception & Coupe',
    ct02: 'CT-02 Assemblage',
    ct03: 'CT-03 Soudure PVC',
    ct04: 'CT-04 Ferrage',
    ct05: 'CT-05 Vitrage',
    ct06: 'CT-06 Controle Final',
  };
  return labels[ct] || ct;
}
