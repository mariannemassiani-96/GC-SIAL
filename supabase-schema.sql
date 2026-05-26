-- Schema ISULA VITRAGE — Supabase
-- Executer dans l'editeur SQL de votre projet Supabase

CREATE TABLE IF NOT EXISTS commandes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL DEFAULT '',
  client TEXT DEFAULT '',
  date_creation DATE DEFAULT CURRENT_DATE,
  semaine_fabrication TEXT DEFAULT '',
  semaine_livraison TEXT DEFAULT '',
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente','en_cours','terminee','livree')),
  vitrages JSONB DEFAULT '[]'::jsonb,
  lot_fabrication JSONB DEFAULT '{}'::jsonb,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger pour mettre a jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER commandes_updated_at
  BEFORE UPDATE ON commandes
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Desactiver RLS pour simplifier (pas d'auth pour l'instant)
ALTER TABLE commandes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON commandes FOR ALL USING (true) WITH CHECK (true);

-- Index pour les requetes frequentes
CREATE INDEX idx_commandes_statut ON commandes(statut);
CREATE INDEX idx_commandes_date ON commandes(date_creation DESC);

-- Table parametres (une seule ligne)
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  avery JSONB DEFAULT '{"paddingLeft":4,"paddingRight":3,"paddingTop":2,"paddingBottom":2}'::jsonb,
  we JSONB DEFAULT '{"barreLength":6000,"marge":20,"kerf":5}'::jsonb,
  glass JSONB DEFAULT '{"plateWidth":3210,"plateHeight":2550,"cuttingGap":5}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_settings" ON settings FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();
