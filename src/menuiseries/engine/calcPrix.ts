import type { ConfigMenuiserie, CalculPrix, LigneDevis } from '../types';
import { PRIX_BASE, PRIX_CROISILLONS, PRIX_APPUI, PRIX_VOLET_BASE, TVA } from '../constants/prix';
import { getMateriauDef } from '../constants/materiaux';
import { PROFILS } from '../constants/materiaux';
import { getVitrageDef } from '../constants/vitrages';
import { TYPES_OUVERTURES, POIGNEES, NIVEAUX_SECURITE, VOLETS_ROULANTS } from '../constants/ouvertures';
import { getCouleurDef } from '../constants/couleurs';

/**
 * Calcule le prix complet d'une configuration menuiserie.
 * Le prix est basé sur : surface × prix_base × coefficients (matériau, vitrage, ouverture, couleur, options)
 */
export function calculerPrix(config: Partial<ConfigMenuiserie>): CalculPrix {
  const details: LigneDevis[] = [];

  // Surface en m²
  const largeurM = (config.largeur ?? 1000) / 1000;
  const hauteurM = (config.hauteur ?? 1000) / 1000;
  const surface = largeurM * hauteurM;

  // Prix de base
  const typeProduit = config.typeProduit ?? 'fenetre';
  const prixBase = PRIX_BASE[typeProduit] * surface;
  details.push({ label: `${typeProduit} ${largeurM.toFixed(2)}×${hauteurM.toFixed(2)}m`, qte: 1, prixUnitaire: prixBase, prixTotal: prixBase });

  // Coefficient matériau
  const materiauDef = config.materiau ? getMateriauDef(config.materiau) : undefined;
  const coefMateriau = materiauDef?.coefPrix ?? 1.0;
  if (coefMateriau !== 1.0) {
    details.push({ label: `Matériau ${materiauDef?.label ?? ''}`, qte: 1, prixUnitaire: 0, prixTotal: prixBase * (coefMateriau - 1), description: `×${coefMateriau}` });
  }

  // Coefficient profilé
  const profilDef = config.profil ? PROFILS.find((p) => p.id === config.profil) : undefined;
  const coefProfil = profilDef?.coefPrix ?? 1.0;
  if (coefProfil !== 1.0) {
    const supProfil = prixBase * coefMateriau * (coefProfil - 1);
    details.push({ label: `Profilé ${profilDef?.label ?? ''}`, qte: 1, prixUnitaire: supProfil, prixTotal: supProfil });
  }

  // Coefficient vitrage
  const vitrageDef = config.vitrage ? getVitrageDef(config.vitrage) : undefined;
  const coefVitrage = vitrageDef?.coefPrix ?? 1.0;
  if (coefVitrage !== 1.0) {
    const supVitrage = prixBase * (coefVitrage - 1);
    details.push({ label: `Vitrage ${vitrageDef?.label ?? ''}`, qte: 1, prixUnitaire: supVitrage, prixTotal: supVitrage });
  }

  // Coefficient ouverture (moyenne des vantaux)
  let coefOuverture = 1.0;
  if (config.vantaux && config.vantaux.length > 0) {
    const totalCoef = config.vantaux.reduce((acc, v) => {
      const ouvDef = TYPES_OUVERTURES.find((o) => o.id === v.ouverture);
      return acc + (ouvDef?.coefPrix ?? 1.0);
    }, 0);
    coefOuverture = totalCoef / config.vantaux.length;
    if (coefOuverture !== 1.0) {
      const supOuverture = prixBase * (coefOuverture - 1);
      details.push({ label: 'Type d\'ouverture', qte: config.vantaux.length, prixUnitaire: supOuverture / config.vantaux.length, prixTotal: supOuverture });
    }
  }

  // Coefficient couleur
  const couleurExtDef = config.couleurExterieure ? getCouleurDef(config.couleurExterieure) : undefined;
  const couleurIntDef = config.couleurInterieure ? getCouleurDef(config.couleurInterieure) : undefined;
  const coefCouleurExt = couleurExtDef?.coefPrix ?? 1.0;
  const coefCouleurInt = config.bicolore ? (couleurIntDef?.coefPrix ?? 1.0) : 1.0;
  const coefCouleur = Math.max(coefCouleurExt, coefCouleurInt);
  if (config.bicolore) {
    const supBicolore = prixBase * 0.15;
    details.push({ label: 'Option bicolore', qte: 1, prixUnitaire: supBicolore, prixTotal: supBicolore });
  }
  if (coefCouleur !== 1.0) {
    const supCouleur = prixBase * (coefCouleur - 1);
    details.push({ label: `Coloris ${couleurExtDef?.label ?? ''}`, qte: 1, prixUnitaire: supCouleur, prixTotal: supCouleur });
  }

  // Options : poignée
  const poigneeDef = config.poignee ? POIGNEES.find((p) => p.id === config.poignee) : undefined;
  const nbVantaux = config.nbVantaux ?? 1;
  if (poigneeDef && poigneeDef.coefPrix > 1.0) {
    const supPoignee = 15 * (poigneeDef.coefPrix - 1) * nbVantaux;
    details.push({ label: `Poignée ${poigneeDef.label}`, qte: nbVantaux, prixUnitaire: supPoignee / nbVantaux, prixTotal: supPoignee });
  }

  // Options : sécurité
  const securiteDef = config.securite ? NIVEAUX_SECURITE.find((s) => s.id === config.securite) : undefined;
  const coefOptions = securiteDef?.coefPrix ?? 1.0;
  if (coefOptions !== 1.0) {
    const supSecurite = prixBase * (coefOptions - 1);
    details.push({ label: `Sécurité ${securiteDef?.label ?? ''}`, qte: 1, prixUnitaire: supSecurite, prixTotal: supSecurite });
  }

  // Options : croisillons
  if (config.croisillons && config.typeCroisillon) {
    const prixCroisillon = PRIX_CROISILLONS[config.typeCroisillon] * nbVantaux;
    details.push({ label: `Croisillons ${config.typeCroisillon}`, qte: nbVantaux, prixUnitaire: PRIX_CROISILLONS[config.typeCroisillon], prixTotal: prixCroisillon });
  }

  // Options : appui de fenêtre
  let prixAccessoires = 0;
  if (config.appuiFenetre) {
    const prixAppui = PRIX_APPUI[config.appuiFenetre] * largeurM;
    prixAccessoires += prixAppui;
    details.push({ label: `Appui de fenêtre ${config.appuiFenetre.toUpperCase()}`, qte: 1, prixUnitaire: prixAppui, prixTotal: prixAppui });
  }

  // Volet roulant
  let prixVolet = 0;
  if (config.voletRoulant) {
    const voletDef = VOLETS_ROULANTS.find((v) => v.id === config.voletRoulant!.type);
    prixVolet = PRIX_VOLET_BASE * surface * (voletDef?.coefPrix ?? 1.0);
    details.push({ label: `Volet roulant ${voletDef?.label ?? ''}`, qte: 1, prixUnitaire: prixVolet, prixTotal: prixVolet });
  }

  // Total
  const prixUnitaireHT = Math.round(
    prixBase * coefMateriau * coefProfil * coefVitrage * coefOuverture * coefCouleur * coefOptions
    + prixVolet
    + prixAccessoires
    + (config.croisillons && config.typeCroisillon ? PRIX_CROISILLONS[config.typeCroisillon] * nbVantaux : 0)
    + (config.bicolore ? prixBase * 0.15 : 0)
  );

  const qte = config.qte ?? 1;
  const totalHT = prixUnitaireHT * qte;
  const tva = Math.round(totalHT * TVA);
  const totalTTC = totalHT + tva;

  return {
    prixBase: Math.round(prixBase),
    coefMateriau,
    coefVitrage,
    coefOuverture,
    coefCouleur,
    coefOptions,
    prixVolet: Math.round(prixVolet),
    prixAccessoires: Math.round(prixAccessoires),
    prixUnitaireHT,
    qte,
    totalHT,
    tva,
    totalTTC,
    details,
  };
}
