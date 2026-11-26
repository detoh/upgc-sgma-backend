-- ==========================================
-- VUE 1 : Membres actifs avec statistiques
-- ==========================================
CREATE OR REPLACE VIEW v_membres_actifs_stats AS
SELECT
  m.id,
  m.organisation_id,
  m.matricule,
  m.nom,
  m.prenom,
  m.date_adhesion,
  m.statut,
  COUNT(c.id) AS nb_cotisations,
  COUNT(c.id) FILTER (WHERE c.statut = 'PAYEE') AS nb_cotisations_payees,
  COALESCE(SUM(c.montant) FILTER (WHERE c.statut = 'PAYEE'), 0) AS total_cotise,
  COALESCE(SUM(c.montant) FILTER (WHERE c.statut IN ('EN_ATTENTE', 'EN_RETARD')), 0) AS total_impaye
FROM membres m
LEFT JOIN cotisations c ON c.membre_id = m.id
WHERE m.statut = 'ACTIF'
GROUP BY m.id, m.organisation_id, m.matricule, m.nom, m.prenom, m.date_adhesion, m.statut;

-- ==========================================
-- VUE 2 : Cotisations en attente / retard
-- ==========================================
CREATE OR REPLACE VIEW v_cotisations_en_retard AS
SELECT
  c.id,
  c.organisation_id,
  c.membre_id,
  c.periode,
  c.montant,
  c.statut,
  c.date_paiement,
  m.nom AS membre_nom,
  m.prenom AS membre_prenom,
  m.matricule AS membre_matricule,
  tc.libelle AS type_cotisation
FROM cotisations c
JOIN membres m ON m.id = c.membre_id
LEFT JOIN types_cotisation tc ON tc.id = c.type_cotisation_id
WHERE c.statut IN ('EN_ATTENTE', 'EN_RETARD')
ORDER BY c.periode DESC;

-- ==========================================
-- VUE 3 : État à jour de chaque membre
-- ==========================================
CREATE OR REPLACE VIEW v_etat_cotisations_membres AS
SELECT
  m.id AS membre_id,
  m.organisation_id,
  m.matricule,
  m.nom,
  m.prenom,
  m.date_adhesion,
  TO_CHAR(CURRENT_DATE, 'YYYY-MM') AS periode_courante,
  EXISTS (
    SELECT 1 FROM cotisations c
    WHERE c.membre_id = m.id
      AND c.periode = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
      AND c.statut = 'PAYEE'
  ) AS est_a_jour,
  (
    SELECT COUNT(*)
    FROM generate_series(0, 5) AS offset_mois
    WHERE NOT EXISTS (
      SELECT 1 FROM cotisations c
      WHERE c.membre_id = m.id
        AND c.periode = TO_CHAR(CURRENT_DATE - (offset_mois || ' month')::interval, 'YYYY-MM')
        AND c.statut = 'PAYEE'
    )
  ) AS nb_mois_impayes,
  COALESCE((
    SELECT SUM(c.montant)
    FROM cotisations c
    WHERE c.membre_id = m.id
      AND c.statut IN ('EN_ATTENTE', 'EN_RETARD')
  ), 0) AS total_impaye
FROM membres m
WHERE m.statut = 'ACTIF';

-- ==========================================
-- VUE 4 : Prestations par type / statut / mois
-- ==========================================
CREATE OR REPLACE VIEW v_prestations_par_type AS
SELECT
  p.organisation_id,
  p.type_prestation,
  p.statut,
  COUNT(*) AS nombre,
  COALESCE(SUM(p.montant), 0) AS montant_total,
  DATE_TRUNC('month', p.date_evenement) AS mois
FROM prestations p
GROUP BY p.organisation_id, p.type_prestation, p.statut, DATE_TRUNC('month', p.date_evenement);

-- ==========================================
-- VUE 5 : Récap financier annuel par organisation
-- ==========================================
CREATE OR REPLACE VIEW v_recap_financier_annuel AS
SELECT
  annee,
  organisation_id,
  COALESCE(SUM(total_cotisations), 0) AS total_cotisations,
  COALESCE(SUM(total_dons), 0) AS total_dons,
  COALESCE(SUM(total_cotisations), 0) + COALESCE(SUM(total_dons), 0) AS total_recettes,
  COALESCE(SUM(total_prestations), 0) AS total_depenses,
  COALESCE(SUM(total_cotisations), 0) + COALESCE(SUM(total_dons), 0) - COALESCE(SUM(total_prestations), 0) AS solde
FROM (
  SELECT EXTRACT(YEAR FROM date_paiement)::int AS annee,
         organisation_id,
         SUM(montant) AS total_cotisations,
         NULL::numeric AS total_dons,
         NULL::numeric AS total_prestations
  FROM cotisations
  WHERE statut = 'PAYEE' AND date_paiement IS NOT NULL
  GROUP BY 1, 2
  UNION ALL
  SELECT EXTRACT(YEAR FROM date_don)::int,
         organisation_id,
         NULL,
         SUM(montant),
         NULL
  FROM dons
  GROUP BY 1, 2
  UNION ALL
  SELECT EXTRACT(YEAR FROM date_evenement)::int,
         organisation_id,
         NULL,
         NULL,
         SUM(montant)
  FROM prestations
  WHERE statut = 'PAYEE'
  GROUP BY 1, 2
) t
GROUP BY annee, organisation_id;

-- ==========================================
-- VUE 6 : État des abonnements organisations
-- ==========================================
CREATE OR REPLACE VIEW v_organisations_abonnement AS
SELECT
  o.id,
  o.nom,
  o.slug,
  o.plan,
  o.statut_abonnement,
  o.date_expiration_abonnement,
  o.devise,
  o.actif,
  (o.date_expiration_abonnement::date - CURRENT_DATE) AS jours_restants,
  CASE
    WHEN o.statut_abonnement = 'SUSPENDU' THEN 'SUSPENDU'
    WHEN o.date_expiration_abonnement < CURRENT_DATE THEN 'EXPIRE'
    WHEN o.date_expiration_abonnement <= CURRENT_DATE + INTERVAL '7 days' THEN 'CRITIQUE'
    WHEN o.date_expiration_abonnement <= CURRENT_DATE + INTERVAL '30 days' THEN 'ATTENTION'
    ELSE 'OK'
  END AS niveau_alerte,
  (SELECT COUNT(*) FROM membres m WHERE m.organisation_id = o.id AND m.statut = 'ACTIF') AS nb_membres_actifs
FROM organisations o;

-- ==========================================
-- Documentation
-- ==========================================
COMMENT ON VIEW v_membres_actifs_stats IS 'Statistiques des membres actifs : nb cotisations, total cotisé, impayés';
COMMENT ON VIEW v_cotisations_en_retard IS 'Cotisations en attente ou en retard avec infos membre';
COMMENT ON VIEW v_etat_cotisations_membres IS 'État à jour de chaque membre actif (période en cours, mois impayés)';
COMMENT ON VIEW v_prestations_par_type IS 'Agrégation prestations par type, statut et mois';
COMMENT ON VIEW v_recap_financier_annuel IS 'Recettes, dépenses et solde par année et organisation';
COMMENT ON VIEW v_organisations_abonnement IS 'État des abonnements avec niveau d''alerte et jours restants';-- This is an empty migration.