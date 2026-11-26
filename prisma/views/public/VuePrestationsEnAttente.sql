SELECT
  p.id,
  p.membre_id,
  m.matricule,
  concat(m.prenom, ' ', m.nom) AS membre_nom_complet,
  p.type_prestation,
  p.date_evenement,
  p.description,
  p.montant,
  p.statut,
  (CURRENT_DATE - p.date_evenement) AS jours_depuis_evenement
FROM
  (
    prestations p
    JOIN membres m ON ((m.id = p.membre_id))
  )
WHERE
  (p.statut = 'EN_ATTENTE' :: statut_prestation);