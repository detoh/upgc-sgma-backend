SELECT
  c.id,
  c.organisation_id,
  c.membre_id,
  c.periode,
  c.montant,
  c.statut,
  c.date_paiement,
  m.nom AS membre_nom,
  m.prenom AS membre_prenom,
  m.matricule AS membre_matricule,
  tc.libelle AS type_cotisation
FROM
  (
    (
      cotisations c
      JOIN membres m ON ((m.id = c.membre_id))
    )
    LEFT JOIN types_cotisation tc ON ((tc.id = c.type_cotisation_id))
  )
WHERE
  (
    c.statut = ANY (
      ARRAY ['EN_ATTENTE'::statut_cotisation, 'EN_RETARD'::statut_cotisation]
    )
  )
ORDER BY
  c.periode DESC;