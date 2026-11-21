-- ==========================================
-- MIGRATION BILLING : Plans + Paiements
-- ==========================================

-- 1. Créer la table plans
CREATE TABLE IF NOT EXISTS plans (
  id BIGSERIAL PRIMARY KEY,
  type TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  description TEXT,
  prix_mensuel INTEGER NOT NULL,
  prix_annuel INTEGER NOT NULL,
  max_membres INTEGER,
  max_utilisateurs INTEGER,
  fonctionnalites JSONB DEFAULT '{}',
  actif BOOLEAN DEFAULT true,
  date_creation TIMESTAMP DEFAULT NOW(),
  date_modification TIMESTAMP DEFAULT NOW()
);

-- 2. Seed des 3 plans
INSERT INTO plans (type, nom, description, prix_mensuel, prix_annuel, max_membres, max_utilisateurs, fonctionnalites) VALUES
('GRATUIT', 'Gratuit', 'Pour découvrir la plateforme', 0, 0, 50, 1, 
 '{"rapportsAG": false, "importCSV": false, "emailsAuto": false, "smsNotif": false, "supportPrio": false, "logoCustom": false}'),
('PREMIUM', 'Premium', 'Pour les mutuelles en croissance', 15000, 150000, 500, 5,
 '{"rapportsAG": true, "importCSV": true, "emailsAuto": true, "smsNotif": false, "supportPrio": false, "logoCustom": true}'),
('ENTERPRISE', 'Enterprise', 'Pour les grandes organisations', 50000, 500000, NULL, NULL,
 '{"rapportsAG": true, "importCSV": true, "emailsAuto": true, "smsNotif": true, "supportPrio": true, "logoCustom": true}')
ON CONFLICT (type) DO NOTHING;

-- 3. Ajouter les colonnes à organisations
ALTER TABLE organisations 
  ADD COLUMN IF NOT EXISTS plan_id BIGINT REFERENCES plans(id),
  ADD COLUMN IF NOT EXISTS statut_abonnement TEXT DEFAULT 'ESSAI',
  ADD COLUMN IF NOT EXISTS date_expiration_abonnement TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_debut_essai TIMESTAMP,
  ADD COLUMN IF NOT EXISTS cinetpay_customer_id TEXT;

-- 4. Mettre à jour les organisations existantes avec le plan GRATUIT par défaut
UPDATE organisations SET 
  plan_id = (SELECT id FROM plans WHERE type = 'GRATUIT'),
  statut_abonnement = 'ESSAI',
  date_debut_essai = NOW(),
  date_expiration_abonnement = NOW() + INTERVAL '14 days'
WHERE plan_id IS NULL;

-- 5. Créer la table paiements
CREATE TABLE IF NOT EXISTS paiements (
  id BIGSERIAL PRIMARY KEY,
  organisation_id BIGINT NOT NULL REFERENCES organisations(id),
  plan_id BIGINT REFERENCES plans(id),
  montant INTEGER NOT NULL,
  mode_paiement TEXT NOT NULL,
  statut TEXT DEFAULT 'EN_ATTENTE',
  periode TEXT NOT NULL,
  date_paiement TIMESTAMP,
  date_expiration TIMESTAMP,
  reference TEXT UNIQUE,
  reference_externe TEXT,
  metadata JSONB,
  valide_par_id BIGINT,
  date_creation TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paiements_organisation_id ON paiements(organisation_id);
CREATE INDEX IF NOT EXISTS idx_paiements_statut ON paiements(statut);

-- 6. Créer la table journal_evenements
CREATE TABLE IF NOT EXISTS journal_evenements (
  id BIGSERIAL PRIMARY KEY,
  organisation_id BIGINT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  date_creation TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_organisation_id ON journal_evenements(organisation_id);