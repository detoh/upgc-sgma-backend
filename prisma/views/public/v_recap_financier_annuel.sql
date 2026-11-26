SELECT
  annee,
  organisation_id,
  COALESCE(sum(total_cotisations), (0) :: numeric) AS total_cotisations,
  COALESCE(sum(total_dons), (0) :: numeric) AS total_dons,
  (
    COALESCE(sum(total_cotisations), (0) :: numeric) + COALESCE(sum(total_dons), (0) :: numeric)
  ) AS total_recettes,
  COALESCE(sum(total_prestations), (0) :: numeric) AS total_depenses,
  (
    (
      COALESCE(sum(total_cotisations), (0) :: numeric) + COALESCE(sum(total_dons), (0) :: numeric)
    ) - COALESCE(sum(total_prestations), (0) :: numeric)
  ) AS solde
FROM
  (
    SELECT
      (
        EXTRACT(
          year
          FROM
            cotisations.date_paiement
        )
      ) :: integer AS annee,
      cotisations.organisation_id,
      sum(cotisations.montant) AS total_cotisations,
      NULL :: numeric AS total_dons,
      NULL :: numeric AS total_prestations
    FROM
      cotisations
    WHERE
      (
        (cotisations.statut = 'PAYEE' :: statut_cotisation)
        AND (cotisations.date_paiement IS NOT NULL)
      )
    GROUP BY
      (
        (
          EXTRACT(
            year
            FROM
              cotisations.date_paiement
          )
        ) :: integer
      ),
      cotisations.organisation_id
    UNION
    ALL
    SELECT
      (
        EXTRACT(
          year
          FROM
            dons.date_don
        )
      ) :: integer AS "extract",
      dons.organisation_id,
      NULL :: numeric,
      sum(dons.montant) AS sum,
      NULL :: numeric
    FROM
      dons
    GROUP BY
      (
        (
          EXTRACT(
            year
            FROM
              dons.date_don
          )
        ) :: integer
      ),
      dons.organisation_id
    UNION
    ALL
    SELECT
      (
        EXTRACT(
          year
          FROM
            prestations.date_evenement
        )
      ) :: integer AS "extract",
      prestations.organisation_id,
      NULL :: numeric,
      NULL :: numeric,
      sum(prestations.montant) AS sum
    FROM
      prestations
    WHERE
      (prestations.statut = 'PAYEE' :: statut_prestation)
    GROUP BY
      (
        (
          EXTRACT(
            year
            FROM
              prestations.date_evenement
          )
        ) :: integer
      ),
      prestations.organisation_id
  ) t
GROUP BY
  annee,
  organisation_id;