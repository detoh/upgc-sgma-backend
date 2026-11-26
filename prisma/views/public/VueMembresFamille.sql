SELECT
  m.id AS membre_id,
  m.matricule,
  concat(m.prenom, ' ', m.nom) AS membre_nom_complet,
  COALESCE(
    json_agg(
      json_build_object(
        'id',
        mf.id,
        'nom',
        mf.nom,
        'prenom',
        mf.prenom,
        'lienParente',
        mf.lien_parente,
        'dateNaissance',
        mf.date_naissance,
        'telephone',
        mf.telephone
      )
    ) FILTER (
      WHERE
        (mf.id IS NOT NULL)
    ),
    '[]' :: json
  ) AS ayants_droit
FROM
  (
    membres m
    LEFT JOIN membres_famille mf ON ((mf.membre_id = m.id))
  )
GROUP BY
  m.id,
  m.matricule,
  m.prenom,
  m.nom;