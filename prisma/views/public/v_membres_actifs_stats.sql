SELECT
  m.id,
  m.organisation_id,
  m.matricule,
  m.nom,
  m.prenom,
  m.date_adhesion,
  m.statut,
  count(c.id) AS nb_cotisations,
  count(c.id) FILTER (
    WHERE
      (c.statut = 'PAYEE' :: statut_cotisation)
  ) AS nb_cotisations_payees,
  COALESCE(
    sum(c.montant) FILTER (
      WHERE
        (c.statut = 'PAYEE' :: statut_cotisation)
    ),
    (0) :: numeric
  ) AS total_cotise,
  COALESCE(
    sum(c.montant) FILTER (
      WHERE
        (
          c.statut = ANY (
            ARRAY ['EN_ATTENTE'::statut_cotisation, 'EN_RETARD'::statut_cotisation]
          )
        )
    ),
    (0) :: numeric
  ) AS total_impaye
FROM
  (
    membres m
    LEFT JOIN cotisations c ON ((c.membre_id = m.id))
  )
WHERE
  (m.statut = 'ACTIF' :: statut_membre)
GROUP BY
  m.id,
  m.organisation_id,
  m.matricule,
  m.nom,
  m.prenom,
  m.date_adhesion,
  m.statut;