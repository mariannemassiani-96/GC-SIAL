import type { ConfigMenuiserie, CalculPrix, LigneDevis } from '../types';
import {
  PRIX_BASE_M2, PRIX_FORFAIT_PORTE,
  COEF_MATERIAU, COEF_PROFIL, COEF_VITRAGE, COEF_OUVERTURE, COEF_COULEUR,
  SUPPLEMENT_BICOLORE, PRIX_CROISILLONS, PRIX_APPUI,
  PRIX_VOLET_BASE_M2, COEF_MOTORISATION_VOLET,
  TVA, coefDegressifSurface,
} from '../constants/prix';
import { getMateriauDef } from '../constants/materiaux';
import { getVitrageDef } from '../constants/vitrages';
import { TYPES_OUVERTURES, POIGNEES, NIVEAUX_SECURITE, VOLETS_ROULANTS } from '../constants/ouvertures';
import { getCouleurDef } from '../constants/couleurs';

/**
 * Moteur de calcul de prix — reconstitué à partir des tarifs réels fenetre24.com
 *
 * RÈGLE :
 * Prix HT = PrixBase(type, surface) × CoefDégressif(surface)
 *           × CoefMatériau × CoefProfilé × CoefVitrage
 *           × CoefOuverture(moy vantaux) × CoefCouleur
 *           × CoefSécurité
 *           + Suppléments (bicolore, croisillons, appui, volet, poignée)
 *
 * Pour les portes : prix forfaitaire × coefs (pas de calcul au m²)
 */
export function calculerPrix(config: Partial<ConfigMenuiserie>): CalculPrix {
  const details: LigneDevis[] = [];
  const typeProduit = config.typeProduit ?? 'fenetre';

  // ── Surface ─────────────────────────────────────────
  const largeurM = (config.largeur ?? 1000) / 1000;
  const hauteurM = (config.hauteur ?? 1200) / 1000;
  const surface = largeurM * hauteurM;

  // ── Prix de base ────────────────────────────────────
  let prixBase: number;
  const isPorte = typeProduit === 'porte_entree' || typeProduit === 'porte_service';

  if (isPorte) {
    // Portes : prix forfaitaire selon matériau
    const key = `${typeProduit}_${config.materiau ?? 'pvc'}`;
    prixBase = PRIX_FORFAIT_PORTE[key] ?? PRIX_FORFAIT_PORTE[`${typeProduit}_pvc`] ?? 500;
    details.push({
      label: `${typeProduit.replace(/_/g, ' ')} ${(config.materiau ?? 'pvc').toUpperCase()} (base)`,
      qte: 1, prixUnitaire: prixBase, prixTotal: prixBase,
    });
  } else {
    // Fenêtres, baies, volets, pergolas : prix au m²
    const prixM2 = PRIX_BASE_M2[typeProduit] ?? 320;
    const coefDeg = coefDegressifSurface(surface);
    prixBase = Math.round(prixM2 * surface * coefDeg);
    details.push({
      label: `${typeProduit.replace(/_/g, ' ')} ${largeurM.toFixed(2)}×${hauteurM.toFixed(2)}m (${surface.toFixed(2)} m²)`,
      qte: 1, prixUnitaire: prixBase, prixTotal: prixBase,
      description: `${prixM2} €/m² × ${coefDeg.toFixed(2)}`,
    });
  }

  // ── Coefficient matériau ────────────────────────────
  const matId = config.materiau ?? 'pvc';
  const coefMateriau = isPorte ? 1.0 : (COEF_MATERIAU[matId] ?? 1.0); // Déjà inclus dans le forfait porte
  if (!isPorte && coefMateriau !== 1.0) {
    const materiauDef = getMateriauDef(matId);
    const supMat = Math.round(prixBase * (coefMateriau - 1));
    details.push({
      label: `Matériau ${materiauDef?.label ?? matId.toUpperCase()}`,
      qte: 1, prixUnitaire: supMat, prixTotal: supMat,
      description: `×${coefMateriau}`,
    });
  }

  // ── Coefficient profilé ─────────────────────────────
  const coefProf = config.profil ? (COEF_PROFIL[config.profil] ?? 1.0) : 1.0;
  if (coefProf !== 1.0) {
    const supProf = Math.round(prixBase * coefMateriau * (coefProf - 1));
    details.push({
      label: `Profilé ${config.profil?.replace(/_/g, ' ') ?? ''}`,
      qte: 1, prixUnitaire: supProf, prixTotal: supProf,
      description: `×${coefProf}`,
    });
  }

  // ── Coefficient vitrage ─────────────────────────────
  const coefVit = config.vitrage ? (COEF_VITRAGE[config.vitrage] ?? 1.0) : 1.0;
  if (coefVit !== 1.0) {
    const vitDef = getVitrageDef(config.vitrage ?? '');
    const supVit = Math.round(prixBase * (coefVit - 1));
    details.push({
      label: `Vitrage ${vitDef?.label ?? ''}`,
      qte: 1, prixUnitaire: supVit, prixTotal: supVit,
      description: `×${coefVit} (double std inclus)`,
    });
  }

  // ── Coefficient ouverture ───────────────────────────
  let coefOuv = 1.0;
  if (config.vantaux && config.vantaux.length > 0) {
    const totalCoef = config.vantaux.reduce((acc, v) => {
      return acc + (COEF_OUVERTURE[v.ouverture] ?? 1.0);
    }, 0);
    coefOuv = totalCoef / config.vantaux.length;
    if (Math.abs(coefOuv - 1.0) > 0.01) {
      const supOuv = Math.round(prixBase * (coefOuv - 1));
      const ouvLabels = config.vantaux.map((v) => {
        const def = TYPES_OUVERTURES.find((o) => o.id === v.ouverture);
        return def?.label ?? v.ouverture;
      });
      details.push({
        label: `Ouverture : ${ouvLabels.join(' + ')}`,
        qte: config.vantaux.length, prixUnitaire: Math.round(supOuv / config.vantaux.length), prixTotal: supOuv,
        description: `×${coefOuv.toFixed(2)}`,
      });
    }
  }

  // ── Coefficient couleur ─────────────────────────────
  const couleurExtId = config.couleurExterieure ?? 'blanc_9016';
  const coefCoulExt = COEF_COULEUR[couleurExtId] ?? 1.0;
  const coefCoulInt = config.bicolore ? (COEF_COULEUR[config.couleurInterieure ?? 'blanc_9016'] ?? 1.0) : 1.0;
  const coefCoul = Math.max(coefCoulExt, coefCoulInt);

  let supBicolore = 0;
  if (config.bicolore) {
    supBicolore = Math.round(prixBase * SUPPLEMENT_BICOLORE);
    details.push({ label: 'Option bicolore', qte: 1, prixUnitaire: supBicolore, prixTotal: supBicolore, description: '+15%' });
  }
  if (coefCoul !== 1.0) {
    const couleurDef = getCouleurDef(couleurExtId);
    const supCoul = Math.round(prixBase * (coefCoul - 1));
    details.push({
      label: `Coloris ${couleurDef?.label ?? couleurExtId}`,
      qte: 1, prixUnitaire: supCoul, prixTotal: supCoul,
      description: `×${coefCoul}`,
    });
  }

  // ── Sécurité ────────────────────────────────────────
  const securiteDef = config.securite ? NIVEAUX_SECURITE.find((s) => s.id === config.securite) : undefined;
  const coefSecu = securiteDef?.coefPrix ?? 1.0;
  if (coefSecu !== 1.0) {
    const supSecu = Math.round(prixBase * (coefSecu - 1));
    details.push({
      label: `Sécurité ${securiteDef?.label ?? ''}`,
      qte: 1, prixUnitaire: supSecu, prixTotal: supSecu,
    });
  }

  // ── Poignée ─────────────────────────────────────────
  const nbVantaux = config.nbVantaux ?? 1;
  const poigneeDef = config.poignee ? POIGNEES.find((p) => p.id === config.poignee) : undefined;
  let supPoignee = 0;
  if (poigneeDef && poigneeDef.coefPrix > 1.0) {
    supPoignee = Math.round(18 * (poigneeDef.coefPrix - 1) * nbVantaux);
    details.push({
      label: `Poignée ${poigneeDef.label}`,
      qte: nbVantaux, prixUnitaire: Math.round(supPoignee / nbVantaux), prixTotal: supPoignee,
    });
  }

  // ── Croisillons ─────────────────────────────────────
  let supCroisillons = 0;
  if (config.croisillons && config.typeCroisillon) {
    supCroisillons = (PRIX_CROISILLONS[config.typeCroisillon] ?? 0) * nbVantaux;
    details.push({
      label: `Croisillons ${config.typeCroisillon}`,
      qte: nbVantaux, prixUnitaire: PRIX_CROISILLONS[config.typeCroisillon], prixTotal: supCroisillons,
    });
  }

  // ── Appui de fenêtre ────────────────────────────────
  let supAppui = 0;
  if (config.appuiFenetre) {
    supAppui = Math.round((PRIX_APPUI[config.appuiFenetre] ?? 0) * largeurM);
    details.push({
      label: `Appui ${config.appuiFenetre.toUpperCase()} (${largeurM.toFixed(2)} ml)`,
      qte: 1, prixUnitaire: supAppui, prixTotal: supAppui,
    });
  }

  // ── Volet roulant ───────────────────────────────────
  let prixVolet = 0;
  if (config.voletRoulant) {
    const coefMotor = COEF_MOTORISATION_VOLET[config.voletRoulant.type] ?? 1.0;
    prixVolet = Math.round(PRIX_VOLET_BASE_M2 * surface * coefMotor);
    const voletDef = VOLETS_ROULANTS.find((v) => v.id === config.voletRoulant!.type);
    details.push({
      label: `Volet roulant ${voletDef?.label ?? ''}`,
      qte: 1, prixUnitaire: prixVolet, prixTotal: prixVolet,
      description: `${PRIX_VOLET_BASE_M2} €/m² × ${coefMotor}`,
    });
  }

  // ══════════════════════════════════════════════════════
  // ── TOTAL ─────────────────────────────────────────────
  // ══════════════════════════════════════════════════════

  const prixUnitaireHT = Math.round(
    prixBase * coefMateriau * coefProf * coefVit * coefOuv * coefCoul * coefSecu
    + supBicolore
    + supPoignee
    + supCroisillons
    + supAppui
    + prixVolet
  );

  const qte = config.qte ?? 1;
  const totalHT = prixUnitaireHT * qte;
  const tva = Math.round(totalHT * TVA);
  const totalTTC = totalHT + tva;

  return {
    prixBase: Math.round(prixBase),
    coefMateriau,
    coefVitrage: coefVit,
    coefOuverture: coefOuv,
    coefCouleur: coefCoul,
    coefOptions: coefSecu,
    prixVolet: Math.round(prixVolet),
    prixAccessoires: Math.round(supAppui + supPoignee + supCroisillons),
    prixUnitaireHT,
    qte,
    totalHT,
    tva,
    totalTTC,
    details,
  };
}
