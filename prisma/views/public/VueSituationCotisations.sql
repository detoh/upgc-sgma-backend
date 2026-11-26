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
    WHEN (
      (c.statut = 'EN_ATTENTE' :: statut_cotisation)
      AND (c.date_paiement IS NULL)
    ) THEN TRUE
    ELSE false
  END AS est_impayee,
  (
    SELECT
      parametres.jours_grace
    FROM
      parametres
    WHERE
      (parametres.id = 1)
  ) AS jours_grace
FROM
  (
    (
      cotisations c
      JOIN membres m ON ((c.membre_id = m.id))
    )
    JOIN types_cotisation tc ON ((c.type_cotisation_id = tc.id))
  );