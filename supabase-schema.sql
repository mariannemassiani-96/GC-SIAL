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

-- ── Catalogue verres ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS glass_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  type TEXT DEFAULT 'float' CHECK (type IN ('float','feuillete','trempe','couche','clair')),
  epaisseur REAL NOT NULL DEFAULT 4,
  has_coating BOOLEAN DEFAULT false,
  coating_face TEXT DEFAULT '',
  ug_default REAL DEFAULT 0,
  fournisseur TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE glass_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_glass_products" ON glass_products FOR ALL USING (true) WITH CHECK (true);

INSERT INTO glass_products (code, label, type, epaisseur, has_coating, ug_default) VALUES
  ('44.2 Clair', 'Float clair 4mm', 'clair', 4, false, 0),
  ('44.6 Clair', 'Float clair 6mm', 'clair', 6, false, 0),
  ('44.2 FE1.1', 'Float FE 4mm basse emissivite', 'couche', 4, true, 1.1),
  ('44.6 FE1.1', 'Float FE 6mm basse emissivite', 'couche', 6, true, 1.1),
  ('SP10', 'Solar Protect 10mm', 'couche', 10, true, 1.0),
  ('44.2 Securit', 'Trempe securite 4mm', 'trempe', 4, false, 0),
  ('88.4 Stadip', 'Feuillete Stadip 44.2+44.2', 'feuillete', 8.4, false, 0)
ON CONFLICT (code) DO NOTHING;

-- ── Stock plaques ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stock_plates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  glass_code TEXT NOT NULL REFERENCES glass_products(code),
  width REAL NOT NULL DEFAULT 3210,
  height REAL NOT NULL DEFAULT 2550,
  quantity INTEGER NOT NULL DEFAULT 0,
  emplacement TEXT DEFAULT '',
  fournisseur TEXT DEFAULT '',
  lot_fournisseur TEXT DEFAULT '',
  date_reception DATE DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stock_plates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_stock_plates" ON stock_plates FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_stock_plates_code ON stock_plates(glass_code);

CREATE TRIGGER stock_plates_updated_at
  BEFORE UPDATE ON stock_plates
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ── Stock chutes reutilisables ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS stock_remnants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  glass_code TEXT NOT NULL REFERENCES glass_products(code),
  width REAL NOT NULL,
  height REAL NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  source_commande TEXT DEFAULT '',
  date_creation DATE DEFAULT CURRENT_DATE,
  emplacement TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stock_remnants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_stock_remnants" ON stock_remnants FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_stock_remnants_code ON stock_remnants(glass_code);

-- ── Lots de production ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS production_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL DEFAULT '',
  semaine TEXT NOT NULL DEFAULT '',
  date_creation DATE DEFAULT CURRENT_DATE,
  commande_ids JSONB DEFAULT '[]'::jsonb,
  commande_refs JSONB DEFAULT '[]'::jsonb,
  total_pieces INTEGER DEFAULT 0,
  total_we INTEGER DEFAULT 0,
  statut TEXT DEFAULT 'en_preparation' CHECK (statut IN ('en_preparation','pret_coupe','en_coupe','pret_assemblage','en_assemblage','en_cours','termine')),
  lot_matieres JSONB DEFAULT '{}'::jsonb,
  glass_optim JSONB DEFAULT '[]'::jsonb,
  we_optim JSONB DEFAULT '[]'::jsonb,
  preparation JSONB DEFAULT '{}'::jsonb,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE production_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_production_lots" ON production_lots FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_production_lots_semaine ON production_lots(semaine);

CREATE TRIGGER production_lots_updated_at
  BEFORE UPDATE ON production_lots
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ── Pieces de production (1 par face verre) ──────────────────────────

CREATE TABLE IF NOT EXISTS production_pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES production_lots(id) ON DELETE CASCADE,
  commande_ref TEXT DEFAULT '',
  vitrage_ref TEXT DEFAULT '',
  vitrage_id TEXT DEFAULT '',
  largeur REAL DEFAULT 0,
  hauteur REAL DEFAULT 0,
  composition TEXT DEFAULT '',
  face TEXT DEFAULT 'EXT' CHECK (face IN ('EXT','INT')),
  material TEXT DEFAULT '',
  machine TEXT DEFAULT '' CHECK (machine IN ('','lisec','bottero')),
  plaque_no INTEGER DEFAULT 0,
  lot_verre TEXT DEFAULT '',
  statut TEXT DEFAULT 'a_preparer' CHECK (statut IN ('a_preparer','a_couper','coupe','a_assembler','assemble','nc','casse','manquant')),
  operateur TEXT DEFAULT '',
  date_coupe TIMESTAMPTZ,
  date_assemblage TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE production_pieces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_production_pieces" ON production_pieces FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_production_pieces_lot ON production_pieces(lot_id);
CREATE INDEX idx_production_pieces_statut ON production_pieces(statut);

-- ── Pieces Warm Edge production ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS production_we (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES production_lots(id) ON DELETE CASCADE,
  barre_no INTEGER DEFAULT 0,
  longueur REAL DEFAULT 0,
  orig_dim REAL DEFAULT 0,
  cote TEXT DEFAULT '',
  vitrage_ref TEXT DEFAULT '',
  epaisseur REAL DEFAULT 10,
  couleur TEXT DEFAULT '',
  statut TEXT DEFAULT 'a_couper' CHECK (statut IN ('a_couper','coupe','nc')),
  operateur TEXT DEFAULT '',
  date_coupe TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE production_we ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_production_we" ON production_we FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_production_we_lot ON production_we(lot_id);
