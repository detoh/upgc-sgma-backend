SELECT
  id,
  matricule,
  nom,
  prenom,
  concat(prenom, ' ', nom) AS nom_complet,
  sexe,
  date_naissance,
  (
    EXTRACT(
      year
      FROM
        age(
          (CURRENT_DATE) :: timestamp WITH time zone,
          (date_naissance) :: timestamp WITH time zone
        )
    )
  ) :: integer AS age,
  profession,
  adresse,
  telephone,
  email,
  date_adhesion,
  statut,
  utilisateur_id,
  (
    SELECT
      count(*) AS count
    FROM
      membres_famille mf
    WHERE
      (mf.membre_id = m.id)
  ) AS nb_ayants_droit,
  (
    SELECT
      max(c.date_paiement) AS max
    FROM
      cotisations c
    WHERE
      (
        (c.membre_id = m.id)
        AND (c.statut = 'PAYEE' :: statut_cotisation)
      )
  ) AS derniere_cotisation_date,
  (
    SELECT
      c.statut
    FROM
      cotisations c
    WHERE
      (c.membre_id = m.id)
    ORDER BY
      c.date_paiement DESC NULLS LAST
    LIMIT
      1
  ) AS derniere_cotisation_statut
FROM
  membres m;