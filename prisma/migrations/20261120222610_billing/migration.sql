-- CreateEnum
CREATE TYPE "role_utilisateur" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE', 'CAISSIER', 'MEMBRE');

-- CreateEnum
CREATE TYPE "sexe_enum" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "statut_membre" AS ENUM ('ACTIF', 'SUSPENDU', 'RADIE');

-- CreateEnum
CREATE TYPE "lien_parente_enum" AS ENUM ('Père', 'Mère', 'Conjoint', 'Enfant');

-- CreateEnum
CREATE TYPE "statut_cotisation" AS ENUM ('EN_ATTENTE', 'PAYEE', 'EN_RETARD', 'ANNULEE');

-- CreateEnum
CREATE TYPE "mode_paiement_enum" AS ENUM ('ESPECES', 'MOBILE_MONEY', 'VIREMENT', 'CHEQUE', 'CARTE');

-- CreateEnum
CREATE TYPE "type_prestation_enum" AS ENUM ('NAISSANCE', 'MARIAGE_MEMBRE', 'DECES_PERE', 'DECES_MERE', 'DECES_CONJOINT', 'DECES_ENFANT', 'DEPART_RETRAITE', 'MUTATION');

-- CreateEnum
CREATE TYPE "statut_prestation" AS ENUM ('EN_ATTENTE', 'VALIDEE', 'REJETEE', 'PAYEE');

-- CreateEnum
CREATE TYPE "plan_abonnement" AS ENUM ('ESSAI', 'ESSENTIEL', 'PRO', 'PREMIUM');

-- CreateEnum
CREATE TYPE "statut_abonnement" AS ENUM ('ACTIF', 'SUSPENDU', 'EXPIRE');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('GRATUIT', 'PREMIUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('CINETPAY', 'CASH', 'VIREMENT', 'CHEQUE', 'GRATUIT');

-- CreateEnum
CREATE TYPE "TypeTransaction" AS ENUM ('ABONNEMENT', 'DON');

-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('EN_ATTENTE', 'SUCCES', 'ECHOUE', 'ANNULE');

-- CreateEnum
CREATE TYPE "PeriodeAbonnement" AS ENUM ('MENSUEL', 'ANNUEL');

-- CreateTable
CREATE TABLE "organisations" (
    "id" BIGSERIAL NOT NULL,
    "nom" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "logo_url" VARCHAR(500),
    "adresse" TEXT,
    "email" VARCHAR(255),
    "telephone" VARCHAR(30),
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XOF',
    "plan" "plan_abonnement" NOT NULL DEFAULT 'ESSAI',
    "statut_abonnement" "statut_abonnement" NOT NULL DEFAULT 'ACTIF',
    "date_debut_essai" TIMESTAMPTZ(6),
    "date_fin_essai" TIMESTAMPTZ(6),
    "date_creation" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "plan_id" BIGINT,
    "date_expiration_abonnement" TIMESTAMP(3),
    "cinetpay_customer_id" TEXT,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" BIGSERIAL NOT NULL,
    "organisation_id" BIGINT NOT NULL DEFAULT 1,
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "telephone" VARCHAR(30),
    "mot_de_passe" VARCHAR(255) NOT NULL,
    "role" "role_utilisateur" NOT NULL DEFAULT 'GESTIONNAIRE',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "dernier_acces" TIMESTAMP(3),
    "date_creation" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membres" (
    "id" BIGSERIAL NOT NULL,
    "organisation_id" BIGINT NOT NULL DEFAULT 1,
    "matricule" VARCHAR(50) NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "sexe" "sexe_enum" NOT NULL,
    "date_naissance" DATE NOT NULL,
    "profession" VARCHAR(150),
    "adresse" TEXT,
    "telephone" VARCHAR(30),
    "email" VARCHAR(255),
    "date_adhesion" DATE NOT NULL DEFAULT CURRENT_DATE,
    "statut" "statut_membre" NOT NULL DEFAULT 'ACTIF',
    "utilisateur_id" BIGINT,

    CONSTRAINT "membres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membres_famille" (
    "id" BIGSERIAL NOT NULL,
    "membre_id" BIGINT NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "lien_parente" "lien_parente_enum" NOT NULL,
    "date_naissance" DATE,
    "telephone" VARCHAR(30),

    CONSTRAINT "membres_famille_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "types_cotisation" (
    "id" BIGSERIAL NOT NULL,
    "organisation_id" BIGINT NOT NULL DEFAULT 1,
    "libelle" VARCHAR(100) NOT NULL,

    CONSTRAINT "types_cotisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotisations" (
    "id" BIGSERIAL NOT NULL,
    "organisation_id" BIGINT NOT NULL DEFAULT 1,
    "membre_id" BIGINT NOT NULL,
    "type_cotisation_id" BIGINT NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "periode" VARCHAR(20) NOT NULL,
    "date_paiement" DATE,
    "mode_paiement" "mode_paiement_enum",
    "reference" VARCHAR(100),
    "statut" "statut_cotisation" NOT NULL DEFAULT 'EN_ATTENTE',

    CONSTRAINT "cotisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prestations" (
    "id" BIGSERIAL NOT NULL,
    "organisation_id" BIGINT NOT NULL DEFAULT 1,
    "membre_id" BIGINT NOT NULL,
    "beneficiaire_id" BIGINT,
    "type_prestation" "type_prestation_enum" NOT NULL,
    "date_evenement" DATE NOT NULL,
    "description" TEXT,
    "montant" DECIMAL(12,2) NOT NULL,
    "statut" "statut_prestation" NOT NULL DEFAULT 'EN_ATTENTE',
    "date_validation" TIMESTAMPTZ(6),
    "valide_par_id" BIGINT,
    "date_paiement" TIMESTAMPTZ(6),
    "mode_paiement" "mode_paiement_enum",
    "reference" VARCHAR(100),
    "paye_par_id" BIGINT,
    "historique" JSONB DEFAULT '[]',

    CONSTRAINT "prestations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activites" (
    "id" BIGSERIAL NOT NULL,
    "organisation_id" BIGINT NOT NULL DEFAULT 1,
    "titre" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "lieu" VARCHAR(200),
    "date" DATE NOT NULL,
    "budget" DECIMAL(12,2),
    "responsable" VARCHAR(150),

    CONSTRAINT "activites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dons" (
    "id" BIGSERIAL NOT NULL,
    "organisation_id" BIGINT NOT NULL DEFAULT 1,
    "structure_donatrice" VARCHAR(200) NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "date_don" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mode_paiement" "mode_paiement_enum" NOT NULL DEFAULT 'ESPECES',
    "motif" TEXT,
    "reference" VARCHAR(100),
    "utilisateur_id" BIGINT,
    "date_creation" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametres" (
    "id" SERIAL NOT NULL,
    "organisation_id" BIGINT NOT NULL DEFAULT 1,
    "nom_mutuelle" VARCHAR(200) NOT NULL,
    "logo_url" VARCHAR(500),
    "adresse" TEXT,
    "email" VARCHAR(255),
    "telephone" VARCHAR(30),
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XOF',
    "type_cotisation_defaut_id" BIGINT,
    "montant_cotisation_defaut" DECIMAL(12,2),
    "jours_grace" INTEGER NOT NULL DEFAULT 0,
    "smtp_config" JSONB DEFAULT '{}',
    "paiement_en_ligne_config" JSONB DEFAULT '{}',

    CONSTRAINT "parametres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications_inapp" (
    "id" BIGSERIAL NOT NULL,
    "organisation_id" BIGINT NOT NULL DEFAULT 1,
    "user_id" BIGINT NOT NULL,
    "titre" VARCHAR(200) NOT NULL,
    "message" VARCHAR(1000) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "lien" VARCHAR(500),
    "lue" BOOLEAN NOT NULL DEFAULT false,
    "date_creation" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_lecture" TIMESTAMPTZ(6),

    CONSTRAINT "notifications_inapp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" BIGSERIAL NOT NULL,
    "type" "PlanType" NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "prixMensuel" INTEGER NOT NULL,
    "prixAnnuel" INTEGER NOT NULL,
    "maxMembres" INTEGER,
    "maxUtilisateurs" INTEGER,
    "fonctionnalites" JSONB NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements" (
    "id" BIGSERIAL NOT NULL,
    "organisationId" BIGINT NOT NULL,
    "planId" BIGINT,
    "montant" INTEGER NOT NULL,
    "modePaiement" "ModePaiement" NOT NULL,
    "statut" "StatutPaiement" NOT NULL DEFAULT 'EN_ATTENTE',
    "periode" "PeriodeAbonnement" NOT NULL,
    "datePaiement" TIMESTAMP(3),
    "dateExpiration" TIMESTAMP(3),
    "reference" TEXT,
    "referenceExterne" TEXT,
    "metadata" JSONB,
    "valideParId" BIGINT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paiements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_evenements" (
    "id" BIGSERIAL NOT NULL,
    "organisationId" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_evenements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisations_slug_key" ON "organisations"("slug");

-- CreateIndex
CREATE INDEX "idx_organisations_slug" ON "organisations"("slug");

-- CreateIndex
CREATE INDEX "idx_organisations_statut" ON "organisations"("statut_abonnement");

-- CreateIndex
CREATE INDEX "idx_utilisateurs_organisation_id" ON "utilisateurs"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_utilisateurs_email_org" ON "utilisateurs"("email", "organisation_id");

-- CreateIndex
CREATE INDEX "idx_membres_nom_prenom" ON "membres"("nom", "prenom");

-- CreateIndex
CREATE INDEX "idx_membres_statut" ON "membres"("statut");

-- CreateIndex
CREATE INDEX "idx_membres_utilisateur_id" ON "membres"("utilisateur_id");

-- CreateIndex
CREATE INDEX "idx_membres_organisation_id" ON "membres"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_membres_matricule_org" ON "membres"("matricule", "organisation_id");

-- CreateIndex
CREATE INDEX "idx_membres_famille_membre_id" ON "membres_famille"("membre_id");

-- CreateIndex
CREATE INDEX "idx_types_cotisation_organisation_id" ON "types_cotisation"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_types_cotisation_libelle_org" ON "types_cotisation"("libelle", "organisation_id");

-- CreateIndex
CREATE INDEX "idx_cotisations_organisation_id" ON "cotisations"("organisation_id");

-- CreateIndex
CREATE INDEX "idx_cotisations_membre_id" ON "cotisations"("membre_id");

-- CreateIndex
CREATE INDEX "idx_cotisations_statut" ON "cotisations"("statut");

-- CreateIndex
CREATE INDEX "idx_cotisations_type_id" ON "cotisations"("type_cotisation_id");

-- CreateIndex
CREATE INDEX "idx_cotisations_periode" ON "cotisations"("periode");

-- CreateIndex
CREATE INDEX "idx_cotisations_date_paiement" ON "cotisations"("date_paiement");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cotisation_membre_type_periode" ON "cotisations"("membre_id", "type_cotisation_id", "periode");

-- CreateIndex
CREATE INDEX "idx_prestations_organisation_id" ON "prestations"("organisation_id");

-- CreateIndex
CREATE INDEX "idx_prestations_membre_id" ON "prestations"("membre_id");

-- CreateIndex
CREATE INDEX "idx_prestations_beneficiaire_id" ON "prestations"("beneficiaire_id");

-- CreateIndex
CREATE INDEX "idx_prestations_statut" ON "prestations"("statut");

-- CreateIndex
CREATE INDEX "idx_prestations_type" ON "prestations"("type_prestation");

-- CreateIndex
CREATE INDEX "idx_activites_organisation_id" ON "activites"("organisation_id");

-- CreateIndex
CREATE INDEX "idx_activites_date" ON "activites"("date");

-- CreateIndex
CREATE INDEX "idx_dons_organisation_id" ON "dons"("organisation_id");

-- CreateIndex
CREATE INDEX "idx_dons_date_don" ON "dons"("date_don");

-- CreateIndex
CREATE INDEX "idx_dons_structure" ON "dons"("structure_donatrice");

-- CreateIndex
CREATE INDEX "idx_dons_utilisateur_id" ON "dons"("utilisateur_id");

-- CreateIndex
CREATE INDEX "idx_notifications_organisation_id" ON "notifications_inapp"("organisation_id");

-- CreateIndex
CREATE INDEX "idx_notifications_user_id" ON "notifications_inapp"("user_id");

-- CreateIndex
CREATE INDEX "idx_notifications_lue" ON "notifications_inapp"("lue");

-- CreateIndex
CREATE INDEX "idx_notifications_date_creation" ON "notifications_inapp"("date_creation");

-- CreateIndex
CREATE UNIQUE INDEX "plans_type_key" ON "plans"("type");

-- CreateIndex
CREATE UNIQUE INDEX "paiements_reference_key" ON "paiements"("reference");

-- CreateIndex
CREATE INDEX "paiements_organisationId_idx" ON "paiements"("organisationId");

-- CreateIndex
CREATE INDEX "paiements_statut_idx" ON "paiements"("statut");

-- CreateIndex
CREATE INDEX "journal_evenements_organisationId_idx" ON "journal_evenements"("organisationId");

-- AddForeignKey
ALTER TABLE "organisations" ADD CONSTRAINT "organisations_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membres" ADD CONSTRAINT "membres_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membres" ADD CONSTRAINT "membres_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membres_famille" ADD CONSTRAINT "membres_famille_membre_id_fkey" FOREIGN KEY ("membre_id") REFERENCES "membres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "types_cotisation" ADD CONSTRAINT "types_cotisation_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotisations" ADD CONSTRAINT "cotisations_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotisations" ADD CONSTRAINT "cotisations_membre_id_fkey" FOREIGN KEY ("membre_id") REFERENCES "membres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotisations" ADD CONSTRAINT "cotisations_type_cotisation_id_fkey" FOREIGN KEY ("type_cotisation_id") REFERENCES "types_cotisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestations" ADD CONSTRAINT "prestations_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestations" ADD CONSTRAINT "prestations_membre_id_fkey" FOREIGN KEY ("membre_id") REFERENCES "membres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestations" ADD CONSTRAINT "prestations_beneficiaire_id_fkey" FOREIGN KEY ("beneficiaire_id") REFERENCES "membres_famille"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestations" ADD CONSTRAINT "prestations_valide_par_id_fkey" FOREIGN KEY ("valide_par_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestations" ADD CONSTRAINT "prestations_paye_par_id_fkey" FOREIGN KEY ("paye_par_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activites" ADD CONSTRAINT "activites_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dons" ADD CONSTRAINT "dons_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dons" ADD CONSTRAINT "dons_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parametres" ADD CONSTRAINT "parametres_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parametres" ADD CONSTRAINT "parametres_type_cotisation_defaut_id_fkey" FOREIGN KEY ("type_cotisation_defaut_id") REFERENCES "types_cotisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications_inapp" ADD CONSTRAINT "notifications_inapp_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications_inapp" ADD CONSTRAINT "notifications_inapp_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
