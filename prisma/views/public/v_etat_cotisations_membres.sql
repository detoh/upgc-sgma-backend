SELECT
  id AS membre_id,
  organisation_id,
  matricule,
  nom,
  prenom,
  date_adhesion,
  to_char(
    (CURRENT_DATE) :: timestamp WITH time zone,
    'YYYY-MM' :: text
  ) AS periode_courante,
  (
    EXISTS (
      SELECT
        1
      FROM
        cotisations c
      WHERE
        (
          (c.membre_id = m.id)
          AND (
            (c.periode) :: text = to_char(
              (CURRENT_DATE) :: timestamp WITH time zone,
              'YYYY-MM' :: text
            )
          )
          AND (c.statut = 'PAYEE' :: statut_cotisation)
        )
    )
  ) AS est_a_jour,
  (
    SELECT
      count(*) AS count
    FROM
      generate_series(0, 5) offset_mois(offset_mois)
    WHERE
      (
        NOT (
          EXISTS (
            SELECT
              1
            FROM
              cotisations c
            WHERE
              (
                (c.membre_id = m.id)
                AND (
                  (c.periode) :: text = to_char(
                    (
                      CURRENT_DATE - ((offset_mois.offset_mois || ' month' :: text)) :: INTERVAL
                    ),
                    'YYYY-MM' :: text
                  )
                )
                AND (c.statut = 'PAYEE' :: statut_cotisation)
              )
          )
        )
      )
  ) AS nb_mois_impayes,
  COALESCE(
    (
      SELECT
        sum(c.montant) AS sum
      FROM
        cotisations c
      WHERE
        (
          (c.membre_id = m.id)
          AND (
            c.statut = ANY (
              ARRAY ['EN_ATTENTE'::statut_cotisation, 'EN_RETARD'::statut_cotisation]
            )
          )
        )
    ),
    (0) :: numeric
  ) AS total_impaye
FROM
  membres m
WHERE
  (statut = 'ACTIF' :: statut_membre);