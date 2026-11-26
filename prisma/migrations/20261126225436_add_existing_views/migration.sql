---- ==========================================
-- VUE 1 : Activités à venir
-- ==========================================
CREATE OR REPLACE VIEW vue_activites_a_venir AS
SELECT 
  id,
  titre,
  description,
  lieu,
  date,
  budget,
  responsable,
  (date - CURRENT_DATE) AS jours_restants
FROM activites a
WHERE (date >= CURRENT_DATE)
ORDER BY date;

-- ==========================================
-- VUE 2 : Dashboard Stats
-- ==========================================
CREATE OR REPLACE VIEW vue_dashboard_stats AS
SELECT 
  (1)::smallint AS id,
  (SELECT count(*) AS count FROM membres WHERE (membres.statut = 'ACTIF'::statut_membre)) AS total_membres_actifs,
  (SELECT count(*) AS count FROM membres WHERE (membres.statut = 'SUSPENDU'::statut_membre)) AS total_membres_suspendus,
  (SELECT count(*) AS count FROM membres_famille) AS total_ayants_droit,
  (SELECT count(*) AS count FROM prestations WHERE (prestations.statut = 'EN_ATTENTE'::statut_prestation)) AS prestations_en_attente,
  ((SELECT COALESCE(sum(cotisations.montant), (0)::numeric) AS "coalesce"
    FROM cotisations
    WHERE ((cotisations.date_paiement IS NOT NULL) 
      AND (EXTRACT(month FROM cotisations.date_paiement) = EXTRACT(month FROM CURRENT_DATE)) 
      AND (EXTRACT(year FROM cotisations.date_paiement) = EXTRACT(year FROM CURRENT_DATE)))))::numeric(12,2) AS cotisations_montant_mois_courant,
  (SELECT count(*) AS count
    FROM cotisations
    WHERE ((cotisations.date_paiement IS NOT NULL) 
      AND (EXTRACT(month FROM cotisations.date_paiement) = EXTRACT(month FROM CURRENT_DATE)) 
      AND (EXTRACT(year FROM cotisations.date_paiement) = EXTRACT(year FROM CURRENT_DATE)))) AS cotisations_nb_mois_courant,
  ((SELECT COALESCE(sum(prestations.montant), (0)::numeric) AS "coalesce"
    FROM prestations
    WHERE ((prestations.date_paiement IS NOT NULL) 
      AND (EXTRACT(month FROM prestations.date_paiement) = EXTRACT(month FROM CURRENT_DATE)) 
      AND (EXTRACT(year FROM prestations.date_paiement) = EXTRACT(year FROM CURRENT_DATE)))))::numeric(12,2) AS prestations_montant_mois_courant,
  (SELECT count(*) AS count FROM activites WHERE (activites.date >= CURRENT_DATE)) AS activites_a_venir;

-- ==========================================
-- VUE 3 : Membres complet
-- ==========================================
CREATE OR REPLACE VIEW vue_membres_complet AS
SELECT 
  id,
  matricule,
  nom,
  prenom,
  concat(prenom, ' ', nom) AS nom_complet,
  sexe,
  date_naissance,
  (EXTRACT(year FROM age((CURRENT_DATE)::timestamp with time zone, (date_naissance)::timestamp with time zone)))::integer AS age,
  profession,
  adresse,
  telephone,
  email,
  date_adhesion,
  statut,
  utilisateur_id,
  (SELECT count(*) AS count FROM membres_famille mf WHERE (mf.membre_id = m.id)) AS nb_ayants_droit,
  (SELECT max(c.date_paiement) AS max FROM cotisations c WHERE ((c.membre_id = m.id) AND (c.statut = 'PAYEE'::statut_cotisation))) AS derniere_cotisation_date,
  (SELECT c.statut FROM cotisations c WHERE (c.membre_id = m.id) ORDER BY c.date_paiement DESC NULLS LAST LIMIT 1) AS derniere_cotisation_statut
FROM membres m;

-- ==========================================
-- VUE 4 : Membres famille
-- ==========================================
CREATE OR REPLACE VIEW vue_membres_famille AS
SELECT 
  m.id AS membre_id,
  m.matricule,
  concat(m.prenom, ' ', m.nom) AS membre_nom_complet,
  COALESCE(json_agg(json_build_object('id', mf.id, 'nom', mf.nom, 'prenom', mf.prenom, 'lienParente', mf.lien_parente, 'dateNaissance', mf.date_naissance, 'telephone', mf.telephone)) FILTER (WHERE (mf.id IS NOT NULL)), '[]'::json) AS ayants_droit
FROM (membres m LEFT JOIN membres_famille mf ON ((mf.membre_id = m.id)))
GROUP BY m.id, m.matricule, m.prenom, m.nom;

-- ==========================================
-- VUE 5 : Prestations en attente
-- ==========================================
CREATE OR REPLACE VIEW vue_prestations_en_attente AS
SELECT 
  p.id,
  p.membre_id,
  m.matricule,
  concat(m.prenom, ' ', m.nom) AS membre_nom_complet,
  p.type_prestation,
  p.date_evenement,
  p.description,
  p.montant,
  p.statut,
  (CURRENT_DATE - p.date_evenement) AS jours_depuis_evenement
FROM (prestations p JOIN membres m ON ((m.id = p.membre_id)))
WHERE (p.statut = 'EN_ATTENTE'::statut_prestation);

-- ==========================================
-- VUE 6 : Situation cotisations
-- ==========================================
CREATE OR REPLACE VIEW vue_situation_cotisations AS
SELECT 
  c.id,
  c.membre_id,
  m.matricule,
  concat(m.nom, ' ', m.prenom) AS membre_nom_complet,
  c.type_cotisation_id,
  tc.libelle AS type_cotisation_libelle,
  c.montant,
  c.periode,
  c.date_paiement,
  c.mode_paiement,
  c.reference,
  c.statut,
  CASE
    WHEN ((c.statut = 'EN_ATTENTE'::statut_cotisation) AND (c.date_paiement IS NULL)) THEN true
    ELSE false
  END AS est_impayee,
  (SELECT parametres.jours_grace FROM parametres WHERE (parametres.id = 1)) AS jours_grace
FROM ((cotisations c JOIN membres m ON ((c.membre_id = m.id))) JOIN types_cotisation tc ON ((c.type_cotisation_id = tc.id)));