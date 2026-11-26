SELECT
  id,
  nom,
  slug,
  plan,
  statut_abonnement,
  date_expiration_abonnement,
  devise,
  actif,
  (
    (date_expiration_abonnement) :: date - CURRENT_DATE
  ) AS jours_restants,
  CASE
    WHEN (
      statut_abonnement = 'SUSPENDU' :: statut_abonnement
    ) THEN 'SUSPENDU' :: text
    WHEN (date_expiration_abonnement < CURRENT_DATE) THEN 'EXPIRE' :: text
    WHEN (
      date_expiration_abonnement <= (CURRENT_DATE + '7 days' :: INTERVAL)
    ) THEN 'CRITIQUE' :: text
    WHEN (
      date_expiration_abonnement <= (CURRENT_DATE + '30 days' :: INTERVAL)
    ) THEN 'ATTENTION' :: text
    ELSE 'OK' :: text
  END AS niveau_alerte,
  (
    SELECT
      count(*) AS count
    FROM
      membres m
    WHERE
      (
        (m.organisation_id = o.id)
        AND (m.statut = 'ACTIF' :: statut_membre)
      )
  ) AS nb_membres_actifs
FROM
  organisations o;