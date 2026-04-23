import type { AffaireAper } from '../store/menuiserieStore';
import { calculerPrix } from '../engine/calcPrix';
import { TYPES_PRODUITS } from '../constants/produits';
import { MATERIAUX } from '../constants/materiaux';
import { VITRAGES } from '../constants/vitrages';
import { COULEURS } from '../constants/couleurs';
import { TYPES_OUVERTURES, POIGNEES, NIVEAUX_SECURITE } from '../constants/ouvertures';

function getLabel(id: string, list: { id: string; label: string }[]): string {
  return list.find((i) => i.id === id)?.label ?? id;
}

/** Génère un CSV technique de toutes les menuiseries */
export function exportCSV(affaire: AffaireAper): void {
  const headers = [
    'Repère', 'Type', 'Matériau', 'Largeur (mm)', 'Hauteur (mm)', 'Surface (m²)',
    'Forme', 'Nb vantaux', 'Imposte', 'Allège',
    'Ouverture V1', 'Ouverture V2', 'Ouverture V3',
    'Vitrage', 'Ug (W/m²K)', 'Rw (dB)', 'Sécurité vitrage',
    'Couleur ext.', 'Couleur int.', 'Bicolore',
    'Poignée', 'Sécurité ferrure', 'Croisillons',
    'Volet roulant', 'Type volet', 'Coffre volet',
    'Appui fenêtre',
    'Qté', 'PU HT (€)', 'Total HT (€)',
    'Notes',
  ];

  const rows = affaire.menuiseries.map((m, i) => {
    const prix = calculerPrix(m);
    const vitrage = VITRAGES.find((v) => v.id === m.vitrage);
    const ouvertures = (m.vantaux ?? []).map((v) => getLabel(v.ouverture, TYPES_OUVERTURES));

    return [
      `M${(i + 1).toString().padStart(2, '0')}`,
      getLabel(m.typeProduit, TYPES_PRODUITS),
      getLabel(m.materiau, MATERIAUX),
      m.largeur,
      m.hauteur,
      ((m.largeur / 1000) * (m.hauteur / 1000)).toFixed(2),
      m.forme,
      m.nbVantaux,
      m.imposte ? `Oui (${m.hauteurImposte ?? 300}mm)` : 'Non',
      m.allege ? `Oui (${m.hauteurAllege ?? 400}mm)` : 'Non',
      ouvertures[0] ?? '',
      ouvertures[1] ?? '',
      ouvertures[2] ?? '',
      getLabel(m.vitrage, VITRAGES),
      vitrage?.ug ?? '',
      vitrage?.affaiblissement ?? '',
      vitrage?.classeSecurite ?? '',
      getLabel(m.couleurExterieure, COULEURS),
      m.bicolore ? getLabel(m.couleurInterieure, COULEURS) : 'Idem ext.',
      m.bicolore ? 'Oui' : 'Non',
      getLabel(m.poignee, POIGNEES),
      getLabel(m.securite, NIVEAUX_SECURITE),
      m.croisillons ? m.typeCroisillon ?? 'Oui' : 'Non',
      m.voletRoulant ? 'Oui' : 'Non',
      m.voletRoulant?.type ?? '',
      m.voletRoulant?.pose ?? '',
      m.appuiFenetre ?? '',
      m.qte ?? 1,
      prix.prixUnitaireHT,
      prix.totalHT,
      m.notes ?? '',
    ];
  });

  // Totaux
  const totalHT = affaire.menuiseries.reduce((acc, m) => acc + calculerPrix(m).totalHT, 0);
  const emptyRow = new Array(headers.length).fill('');
  const totalRow = [...emptyRow];
  totalRow[0] = 'TOTAL';
  totalRow[headers.indexOf('Total HT (€)')] = totalHT;
  totalRow[headers.indexOf('PU HT (€)')] = '';

  const csvContent = [
    // En-tête affaire
    `# Affaire: ${affaire.nom}`,
    `# Ref: ${affaire.ref}`,
    `# Client: ${affaire.client}`,
    `# Date: ${affaire.dateModification}`,
    '',
    headers.join(';'),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';')),
    '',
    totalRow.map((cell) => `"${cell}"`).join(';'),
  ].join('\n');

  // BOM UTF-8 pour Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Export_Technique_${affaire.ref}_${affaire.dateModification}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Génère un JSON technique pour import dans d'autres systèmes */
export function exportJSON(affaire: AffaireAper): void {
  const data = {
    affaire: {
      ref: affaire.ref,
      nom: affaire.nom,
      client: affaire.client,
      adresse: affaire.adresse,
      date: affaire.dateModification,
      contexte: affaire.contexte,
    },
    menuiseries: affaire.menuiseries.map((m, i) => ({
      repere: `M${(i + 1).toString().padStart(2, '0')}`,
      ...m,
      prix: calculerPrix(m),
    })),
    totaux: {
      nbMenuiseries: affaire.menuiseries.length,
      totalHT: affaire.menuiseries.reduce((acc, m) => acc + calculerPrix(m).totalHT, 0),
    },
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Export_${affaire.ref}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
