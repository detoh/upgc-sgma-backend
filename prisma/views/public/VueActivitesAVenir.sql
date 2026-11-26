SELECT
  id,
  titre,
  description,
  lieu,
  date,
  budget,
  responsable,
  (date - CURRENT_DATE) AS jours_restants
FROM
  activites a
WHERE
  (date >= CURRENT_DATE)
ORDER BY
  date;