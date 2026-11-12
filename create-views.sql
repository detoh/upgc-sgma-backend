-- ==========================================
-- CRÉATION DES VUES SQL POUR UPGC
-- ==========================================

-- Vue 1: Membres complets avec stats
CREATE OR REPLACE VIEW vue_membres_complet AS
SELECT 
    m.id,
    m.matricule,
    m.nom,
    m.prenom,
    CONCAT(m.prenom, ' ', m.nom) AS nom_complet,
    m.sexe,
    m.date_naissance,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_naissance))::int AS age,
    m.profession,
    m.adresse,
    m.telephone,
    m.email,
    m.date_adhesion,
    m.statut,
    m.utilisateur_id,
    (SELECT COUNT(*) FROM membres_famille mf WHERE mf.membre_id = m.id)::bigint AS nb_ayants_droit,
    (SELECT MAX(c.date_paiement) FROM cotisations c WHERE c.membre_id = m.id AND c.statut = 'PAYEE') AS derniere_cotisation_date,
    (SELECT c.statut FROM cotisations c WHERE c.membre_id = m.id ORDER BY c.date_paiement DESC NULLS LAST LIMIT 1) AS derniere_cotisation_statut
FROM membres m;

-- Vue 2: Situation des cotisations
CREATE OR REPLACE VIEW vue_situation_cotisations AS
SELECT 
    c.id,
    c.membre_id,
    m.matricule,
    CONCAT(m.prenom, ' ', m.nom) AS membre_nom_complet,
    c.type_cotisation_id,
    tc.libelle AS type_cotisation_libelle,
    c.montant,
    c.periode,
    c.date_paiement,
    c.mode_paiement,
    c.reference,
    c.statut,
    (c.statut IN ('EN_ATTENTE', 'EN_RETARD')) AS est_impayee,
    p.jours_grace
FROM cotisations c
JOIN membres m ON m.id = c.membre_id
JOIN types_cotisation tc ON tc.id = c.type_cotisation_id
CROSS JOIN parametres p;

-- Vue 3: Prestations en attente
CREATE OR REPLACE VIEW vue_prestations_en_attente AS
SELECT 
    p.id,
    p.membre_id,
    m.matricule,
    CONCAT(m.prenom, ' ', m.nom) AS membre_nom_complet,
    p.type_prestation,
    p.date_evenement,
    p.description,
    p.montant,
    p.statut,
    (CURRENT_DATE - p.date_evenement)::int AS jours_depuis_evenement
FROM prestations p
JOIN membres m ON m.id = p.membre_id
WHERE p.statut = 'EN_ATTENTE';

-- Vue 4: Membres avec famille (ayants droit)
CREATE OR REPLACE VIEW vue_membres_famille AS
SELECT 
    m.id AS membre_id,
    m.matricule,
    CONCAT(m.prenom, ' ', m.nom) AS membre_nom_complet,
    COALESCE(
        json_agg(
            json_build_object(
                'id', mf.id,
                'nom', mf.nom,
                'prenom', mf.prenom,
                'lienParente', mf.lien_parente,
                'dateNaissance', mf.date_naissance,
                'telephone', mf.telephone
            )
        ) FILTER (WHERE mf.id IS NOT NULL),
        '[]'::json
    ) AS ayants_droit
FROM membres m
LEFT JOIN membres_famille mf ON mf.membre_id = m.id
GROUP BY m.id, m.matricule, m.prenom, m.nom;

-- Vue 5: Activités à venir
CREATE OR REPLACE VIEW vue_activites_a_venir AS
SELECT 
    a.id,
    a.titre,
    a.description,
    a.lieu,
    a.date,
    a.budget,
    a.responsable,
    (a.date - CURRENT_DATE)::int AS jours_restants
FROM activites a
WHERE a.date >= CURRENT_DATE
ORDER BY a.date ASC;

-- Vue 6: Stats pour le dashboard
CREATE OR REPLACE VIEW vue_dashboard_stats AS
SELECT 
    1::smallint AS id,
    (SELECT COUNT(*) FROM membres WHERE statut = 'ACTIF')::bigint AS total_membres_actifs,
    (SELECT COUNT(*) FROM membres WHERE statut = 'SUSPENDU')::bigint AS total_membres_suspendus,
    (SELECT COUNT(*) FROM membres_famille)::bigint AS total_ayants_droit,
    (SELECT COUNT(*) FROM prestations WHERE statut = 'EN_ATTENTE')::bigint AS prestations_en_attente,
    (SELECT COALESCE(SUM(montant), 0) FROM cotisations WHERE date_paiement IS NOT NULL AND EXTRACT(MONTH FROM date_paiement) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM date_paiement) = EXTRACT(YEAR FROM CURRENT_DATE))::decimal(12,2) AS cotisations_montant_mois_courant,
    (SELECT COUNT(*) FROM cotisations WHERE date_paiement IS NOT NULL AND EXTRACT(MONTH FROM date_paiement) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM date_paiement) = EXTRACT(YEAR FROM CURRENT_DATE))::bigint AS cotisations_nb_mois_courant,
    (SELECT COALESCE(SUM(montant), 0) FROM prestations WHERE date_paiement IS NOT NULL AND EXTRACT(MONTH FROM date_paiement) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM date_paiement) = EXTRACT(YEAR FROM CURRENT_DATE))::decimal(12,2) AS prestations_montant_mois_courant,
    (SELECT COUNT(*) FROM activites WHERE date >= CURRENT_DATE)::bigint AS activites_a_venir;