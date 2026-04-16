// ── Configuration de marque — portabilité SIAL → Apertura ────────────
// Ce fichier centralise tout le branding pour permettre l'intégration
// dans le portail pro apertura.corsica sans toucher aux composants.

export interface BrandingConfig {
  appName: string;
  tagline: string;
  logoText: string;
  domain: string;
  company: string;
  colors: {
    primary: string;
    primaryLight: string;
    primaryBg: string;
    accent: string;
  };
  footer: string;
  devisPrefix: string;
  contact?: {
    email: string;
    phone: string;
    address: string;
  };
}

export const BRANDING_SIAL: BrandingConfig = {
  appName: 'SIAL Configurateur',
  tagline: 'Portail professionnel de configuration',
  logoText: 'SIAL',
  domain: 'sial.fr',
  company: 'SIAL',
  colors: {
    primary: '#2563eb',
    primaryLight: '#60a5fa',
    primaryBg: 'rgba(37, 99, 235, 0.1)',
    accent: '#2563eb',
  },
  footer: 'SIAL — Portail professionnel',
  devisPrefix: 'SIAL',
};

export const BRANDING_APERTURA: BrandingConfig = {
  appName: 'Apertura Configurateur Pro',
  tagline: 'Votre configurateur menuiseries professionnel',
  logoText: 'APERTURA',
  domain: 'apertura.corsica',
  company: 'Apertura',
  colors: {
    primary: '#2563eb',
    primaryLight: '#60a5fa',
    primaryBg: 'rgba(37, 99, 235, 0.1)',
    accent: '#2563eb',
  },
  footer: 'Apertura — Menuiseries professionnelles en Corse',
  devisPrefix: 'APER',
  contact: {
    email: '',
    phone: '',
    address: 'Corse',
  },
};

// ── Branding actif ───────────────────────────────────────────────────
// Changer cette ligne pour switcher entre SIAL et Apertura
export const BRANDING = BRANDING_SIAL;
