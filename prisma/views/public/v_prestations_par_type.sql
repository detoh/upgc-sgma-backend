SELECT
  organisation_id,
  type_prestation,
  statut,
  count(*) AS nombre,
  COALESCE(sum(montant), (0) :: numeric) AS montant_total,
  date_trunc(
    'month' :: text,
    (date_evenement) :: timestamp WITH time zone
  ) AS mois
FROM
  prestations p
GROUP BY
  organisation_id,
  type_prestation,
  statut,
  (
    date_trunc(
      'month' :: text,
      (date_evenement) :: timestamp WITH time zone
    )
  );