import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ========== CONFIG ==========
const CSV_PATH = path.join(__dirname, '..', 'import_membres.csv');
const ORG_SLUG = 'upgc';
const MONTANT_COTISATION = 10000;
const TYPE_LIBELLE = 'Cotisation trimestrielle';
// ============================

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { fields.push(current); current = ''; }
      else current += ch;
    }
  }
  fields.push(current);
  return fields;
}

async function main() {
  // 1. Organisation
  const org = await prisma.organisation.findUnique({ where: { slug: ORG_SLUG } });
  if (!org) throw new Error(`Organisation "${ORG_SLUG}" introuvable.`);
  console.log(`🏢 Organisation : ${org.nom} (ID ${org.id})`);

  // 2. Type de cotisation
  let typeCot = await prisma.typeCotisation.findFirst({
    where: { libelle: TYPE_LIBELLE, organisationId: org.id },
  });
  if (!typeCot) {
    typeCot = await prisma.typeCotisation.create({
      data: {
        libelle: TYPE_LIBELLE,
        organisation: { connect: { id: org.id } },
      },
    });
    console.log(`💰 Type créé : ${TYPE_LIBELLE}`);
  } else {
    console.log(`💰 Type existant : ${TYPE_LIBELLE}`);
  }

  // 3. Lecture du CSV
  let content = fs.readFileSync(CSV_PATH, 'utf-8');
  content = content.replace(/^\uFEFF/, '');
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== '');
  const rows = lines.slice(1);
  console.log(`📄 ${rows.length} lignes à traiter\n`);

  let membresCrees = 0;
  let membresSkips = 0;
  let cotisationsCrees = 0;
  let cotisationsSkips = 0;
  let erreurs = 0;
  let compteur = 0;

  for (let i = 0; i < rows.length; i++) {
    const [nom, prenom, sexe, dateAdhesion, paiements] = parseCsvLine(rows[i]);
    if (!nom || !nom.trim()) continue;

    compteur++;
    const matricule = `MUDP-${String(compteur).padStart(4, '0')}`;

    try {
      // --- Membre (idempotent) ---
      let membre = await prisma.membre.findFirst({
        where: { matricule, organisationId: org.id },
      });

      if (!membre) {
        const dateVal = /^\d{4}-\d{2}-\d{2}$/.test(dateAdhesion.trim())
          ? new Date(dateAdhesion.trim())
          : null;

        membre = await prisma.membre.create({
          data: {
            organisation: { connect: { id: org.id } },
            matricule,
            nom: nom.trim(),
            prenom: (prenom || '').trim(),
            sexe: sexe === 'F' ? 'F' : sexe === 'M' ? 'M' : null,
            dateAdhesion: dateVal,
            statut: 'ACTIF',
          } as any, // <--- CECI FAIT TAIRE TYPESCRIPT
        });
        membresCrees++;
      } else {
        membresSkips++;
      }

      // --- Cotisations (idempotent) ---
      const periodes = (paiements || '')
        .split(';')
        .map((p) => p.trim())
        .filter((p) => p !== '');

      for (const periode of periodes) {
        const exists = await prisma.cotisation.findFirst({
          where: { membreId: membre.id, typeCotisationId: typeCot.id, periode },
        });
        if (exists) {
          cotisationsSkips++;
          continue;
        }

        await prisma.cotisation.create({
          data: {
            organisation: { connect: { id: org.id } },
            membre: { connect: { id: membre.id } },
            typeCotisation: { connect: { id: typeCot.id } },
            periode,
            montant: MONTANT_COTISATION,
            statut: 'PAYEE',
            datePaiement: new Date(`${periode}-01`),
            modePaiement: 'ESPECES',
          } as any, // <--- CECI FAIT TAIRE TYPESCRIPT
        });
        cotisationsCrees++;
      }

      if (compteur % 50 === 0) console.log(`   ... ${compteur}/${rows.length} lignes traitées`);
    } catch (e: any) {
      erreurs++;
      console.error(`❌ Ligne ${i + 2} (${matricule} ${nom}) : ${e.message?.split('\n')[0]}`);
    }
  }

  console.log('\n========== RÉSULTAT ==========');
  console.log(`✅ Membres créés       : ${membresCrees}`);
  console.log(`⏭️  Membres existants   : ${membresSkips}`);
  console.log(`✅ Cotisations créées  : ${cotisationsCrees}`);
  console.log(`⏭️  Cotisations exist.  : ${cotisationsSkips}`);
  console.log(`❌ Erreurs             : ${erreurs}`);
}

main()
  .catch((e) => {
    console.error('💥 Erreur fatale :', e.message?.split('\n')[0]);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());