SELECT
  (1) :: smallint AS id,
  (
    SELECT
      count(*) AS count
    FROM
      membres
    WHERE
      (membres.statut = 'ACTIF' :: statut_membre)
  ) AS total_membres_actifs,
  (
    SELECT
      count(*) AS count
    FROM
      membres
    WHERE
      (membres.statut = 'SUSPENDU' :: statut_membre)
  ) AS total_membres_suspendus,
  (
    SELECT
      count(*) AS count
    FROM
      membres_famille
  ) AS total_ayants_droit,
  (
    SELECT
      count(*) AS count
    FROM
      prestations
    WHERE
      (
        prestations.statut = 'EN_ATTENTE' :: statut_prestation
      )
  ) AS prestations_en_attente,
  (
    (
      SELECT
        COALESCE(sum(cotisations.montant), (0) :: numeric) AS "coalesce"
      FROM
        cotisations
      WHERE
        (
          (cotisations.date_paiement IS NOT NULL)
          AND (
            EXTRACT(
              MONTH
              FROM
                cotisations.date_paiement
            ) = EXTRACT(
              MONTH
              FROM
                CURRENT_DATE
            )
          )
          AND (
            EXTRACT(
              year
              FROM
                cotisations.date_paiement
            ) = EXTRACT(
              year
              FROM
                CURRENT_DATE
            )
          )
        )
    )
  ) :: numeric(12, 2) AS cotisations_montant_mois_courant,
  (
    SELECT
      count(*) AS count
    FROM
      cotisations
    WHERE
      (
        (cotisations.date_paiement IS NOT NULL)
        AND (
          EXTRACT(
            MONTH
            FROM
              cotisations.date_paiement
          ) = EXTRACT(
            MONTH
            FROM
              CURRENT_DATE
          )
        )
        AND (
          EXTRACT(
            year
            FROM
              cotisations.date_paiement
          ) = EXTRACT(
            year
            FROM
              CURRENT_DATE
          )
        )
      )
  ) AS cotisations_nb_mois_courant,
  (
    (
      SELECT
        COALESCE(sum(prestations.montant), (0) :: numeric) AS "coalesce"
      FROM
        prestations
      WHERE
        (
          (prestations.date_paiement IS NOT NULL)
          AND (
            EXTRACT(
              MONTH
              FROM
                prestations.date_paiement
            ) = EXTRACT(
              MONTH
              FROM
                CURRENT_DATE
            )
          )
          AND (
            EXTRACT(
              year
              FROM
                prestations.date_paiement
            ) = EXTRACT(
              year
              FROM
                CURRENT_DATE
            )
          )
        )
    )
  ) :: numeric(12, 2) AS prestations_montant_mois_courant,
  (
    SELECT
      count(*) AS count
    FROM
      activites
    WHERE
      (activites.date >= CURRENT_DATE)
  ) AS activites_a_venir;