-- ==========================================
-- MIGRATION MONO-TENANT → MULTI-TENANT (SGMA)
-- ==========================================

BEGIN;

-- 1. Créer les nouveaux enums
DO $$ BEGIN
    CREATE TYPE plan_abonnement AS ENUM ('ESSAI', 'ESSENTIEL', 'PRO', 'PREMIUM');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE statut_abonnement AS ENUM ('ACTIF', 'SUSPENDU', 'EXPIRE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Ajouter SUPER_ADMIN au role_utilisateur
ALTER TYPE role_utilisateur ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- 3. Créer la table organisations
CREATE TABLE IF NOT EXISTS organisations (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(200) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    logo_url VARCHAR(500),
    adresse TEXT,
    email VARCHAR(255),
    telephone VARCHAR(30),
    devise VARCHAR(10) DEFAULT 'XOF',
    plan plan_abonnement DEFAULT 'ESSAI',
    statut_abonnement statut_abonnement DEFAULT 'ACTIF',
    date_debut_essai TIMESTAMPTZ,
    date_fin_essai TIMESTAMPTZ,
    date_creation TIMESTAMPTZ DEFAULT NOW(),
    actif BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_organisations_slug ON organisations(slug);
CREATE INDEX IF NOT EXISTS idx_organisations_statut ON organisations(statut_abonnement);

-- 4. Insérer UPGC comme organisation n°1
INSERT INTO organisations (nom, slug, plan, statut_abonnement, date_debut_essai, date_fin_essai)
VALUES (
    'UPGC', 
    'upgc', 
    'PREMIUM',  -- Plan élevé pour la 1ère org (celle qui existe déjà)
    'ACTIF',
    NOW(),
    NOW() + INTERVAL '3650 days'  -- 10 ans (pas de limite pour UPGC)
)
ON CONFLICT (slug) DO NOTHING;

-- 5. Récupérer l'ID de l'organisation UPGC
DO $$
DECLARE
    org_id BIGINT;
BEGIN
    SELECT id INTO org_id FROM organisations WHERE slug = 'upgc';
    
    -- 6. Ajouter organisation_id sur toutes les tables (NULL au début)
    ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS organisation_id BIGINT;
    ALTER TABLE membres ADD COLUMN IF NOT EXISTS organisation_id BIGINT;
    ALTER TABLE types_cotisation ADD COLUMN IF NOT EXISTS organisation_id BIGINT;
    ALTER TABLE cotisations ADD COLUMN IF NOT EXISTS organisation_id BIGINT;
    ALTER TABLE prestations ADD COLUMN IF NOT EXISTS organisation_id BIGINT;
    ALTER TABLE activites ADD COLUMN IF NOT EXISTS organisation_id BIGINT;
    ALTER TABLE dons ADD COLUMN IF NOT EXISTS organisation_id BIGINT;
    ALTER TABLE parametres ADD COLUMN IF NOT EXISTS organisation_id BIGINT;
    ALTER TABLE notifications_inapp ADD COLUMN IF NOT EXISTS organisation_id BIGINT;
    
    -- 7. Migrer TOUTES les données vers l'organisation UPGC
    UPDATE utilisateurs SET organisation_id = org_id WHERE organisation_id IS NULL;
    UPDATE membres SET organisation_id = org_id WHERE organisation_id IS NULL;
    UPDATE types_cotisation SET organisation_id = org_id WHERE organisation_id IS NULL;
    UPDATE cotisations SET organisation_id = org_id WHERE organisation_id IS NULL;
    UPDATE prestations SET organisation_id = org_id WHERE organisation_id IS NULL;
    UPDATE activites SET organisation_id = org_id WHERE organisation_id IS NULL;
    UPDATE dons SET organisation_id = org_id WHERE organisation_id IS NULL;
    UPDATE parametres SET organisation_id = org_id WHERE organisation_id IS NULL;
    UPDATE notifications_inapp SET organisation_id = org_id WHERE organisation_id IS NULL;
    
    -- 8. Ajouter les contraintes NOT NULL + FK
    ALTER TABLE utilisateurs ALTER COLUMN organisation_id SET NOT NULL;
    ALTER TABLE membres ALTER COLUMN organisation_id SET NOT NULL;
    ALTER TABLE types_cotisation ALTER COLUMN organisation_id SET NOT NULL;
    ALTER TABLE cotisations ALTER COLUMN organisation_id SET NOT NULL;
    ALTER TABLE prestations ALTER COLUMN organisation_id SET NOT NULL;
    ALTER TABLE activites ALTER COLUMN organisation_id SET NOT NULL;
    ALTER TABLE dons ALTER COLUMN organisation_id SET NOT NULL;
    ALTER TABLE parametres ALTER COLUMN organisation_id SET NOT NULL;
    ALTER TABLE notifications_inapp ALTER COLUMN organisation_id SET NOT NULL;
    
    -- 9. Ajouter les contraintes de clé étrangère
    ALTER TABLE utilisateurs ADD CONSTRAINT fk_utilisateurs_organisation
        FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE;
    ALTER TABLE membres ADD CONSTRAINT fk_membres_organisation
        FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE;
    ALTER TABLE types_cotisation ADD CONSTRAINT fk_types_cotisation_organisation
        FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE;
    ALTER TABLE cotisations ADD CONSTRAINT fk_cotisations_organisation
        FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE;
    ALTER TABLE prestations ADD CONSTRAINT fk_prestations_organisation
        FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE;
    ALTER TABLE activites ADD CONSTRAINT fk_activites_organisation
        FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE;
    ALTER TABLE dons ADD CONSTRAINT fk_dons_organisation
        FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE;
    ALTER TABLE parametres ADD CONSTRAINT fk_parametres_organisation
        FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE;
    ALTER TABLE notifications_inapp ADD CONSTRAINT fk_notifications_organisation
        FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE;
    
    -- 10. Ajouter les contraintes UNIQUE (unicité par organisation)
    -- Supprimer les anciens uniques globaux et les remplacer par uniques par organisation
    ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_email_key;
    ALTER TABLE utilisateurs ADD CONSTRAINT uq_utilisateurs_email_org UNIQUE (email, organisation_id);
    
    ALTER TABLE membres DROP CONSTRAINT IF EXISTS membres_matricule_key;
    ALTER TABLE membres ADD CONSTRAINT uq_membres_matricule_org UNIQUE (matricule, organisation_id);
    
    ALTER TABLE types_cotisation DROP CONSTRAINT IF EXISTS types_cotisation_libelle_key;
    ALTER TABLE types_cotisation ADD CONSTRAINT uq_types_cotisation_libelle_org UNIQUE (libelle, organisation_id);
    
    ALTER TABLE parametres ADD CONSTRAINT uq_parametres_organisation_id UNIQUE (organisation_id);
    
    -- 11. Index sur organisation_id
    CREATE INDEX IF NOT EXISTS idx_utilisateurs_organisation_id ON utilisateurs(organisation_id);
    CREATE INDEX IF NOT EXISTS idx_membres_organisation_id ON membres(organisation_id);
    CREATE INDEX IF NOT EXISTS idx_types_cotisation_organisation_id ON types_cotisation(organisation_id);
    CREATE INDEX IF NOT EXISTS idx_cotisations_organisation_id ON cotisations(organisation_id);
    CREATE INDEX IF NOT EXISTS idx_prestations_organisation_id ON prestations(organisation_id);
    CREATE INDEX IF NOT EXISTS idx_activites_organisation_id ON activites(organisation_id);
    CREATE INDEX IF NOT EXISTS idx_dons_organisation_id ON dons(organisation_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_organisation_id ON notifications_inapp(organisation_id);
    
    RAISE NOTICE 'Migration terminée avec succès. Organisation UPGC ID: %', org_id;
END $$;

-- 12. Transformer l'admin actuel en SUPER_ADMIN
UPDATE utilisateurs 
SET role = 'SUPER_ADMIN' 
WHERE email = 'admin@upgc.ci';

COMMIT;