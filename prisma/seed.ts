// prisma/seed.ts
import { PrismaClient, PlanType, RoleUtilisateur } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seed de production...');

  // ==========================================
  // 1. PLANS D'ABONNEMENT (avec enum PlanType)
  // ==========================================
  const plans = [
    {
      type: PlanType.GRATUIT,
      nom: 'GRATUIT',
      prixMensuel: 0,
      prixAnnuel: 0,
      maxMembres: 50,
      fonctionnalites: ['Gestion membres', 'Cotisations basiques', 'Jusqu\'à 50 membres'],
    },
    {
      type: PlanType.PREMIUM,
      nom: 'PREMIUM',
      prixMensuel: 15000,
      prixAnnuel: 150000,
      maxMembres: 500,
      fonctionnalites: [
        'Tout GRATUIT',
        'Prestations sociales',
        'Rapports financiers',
        'Exports PDF/Excel',
        'Jusqu\'à 500 membres',
      ],
    },
    {
      type: PlanType.ENTERPRISE,
      nom: 'ENTERPRISE',
      prixMensuel: 50000,
      prixAnnuel: 500000,
      maxMembres: -1,
      fonctionnalites: [
        'Tout PREMIUM',
        'Support prioritaire',
        'Personnalisation complète',
        'Membres illimités',
      ],
    },
  ];

  for (const plan of plans) {
    const existing = await prisma.plan.findUnique({
      where: { type: plan.type },
    });

    if (existing) {
      await prisma.plan.update({
        where: { type: plan.type },
        data: plan,
      });
      console.log(`✅ Plan mis à jour : ${plan.nom}`);
    } else {
      await prisma.plan.create({ data: plan });
      console.log(`✅ Plan créé : ${plan.nom}`);
    }
  }

  // ==========================================
  // 2. ORGANISATION UPGC MUTUELLE
  // ==========================================
  let org = await prisma.organisation.findUnique({
    where: { slug: 'upgc' },
  });

  if (!org) {
    org = await prisma.organisation.create({
      data: {
        nom: 'UPGC Mutuelle',
        slug: 'upgc',
        email: 'contact@upgc.ci',
        plan: 'PREMIUM',
        statutAbonnement: 'ACTIF',
        dateExpirationAbonnement: new Date('2027-12-31'),
        devise: 'XOF',
        actif: true,
      },
    });
    console.log(`✅ Organisation créée : ${org.nom} (ID: ${org.id})`);
  } else {
    console.log(`✅ Organisation existe déjà : ${org.nom} (ID: ${org.id})`);
  }

  // ==========================================
  // 3. SUPER_ADMIN (ton compte)
  // ==========================================
  const hashSuperAdmin = await bcrypt.hash('Admin123!', 10);
  const existingSuperAdmin = await prisma.utilisateur.findFirst({
    where: {
      email: 'patrickdetoh@gmail.com',
      organisationId: org.id,
    },
  });

  if (!existingSuperAdmin) {
    await prisma.utilisateur.create({
      data: {
        nom: 'Admin',
        prenom: 'SGMA',
        email: 'patrickdetoh@gmail.com',
        motDePasse: hashSuperAdmin,
        role: RoleUtilisateur.SUPER_ADMIN,
        actif: true,
        organisationId: org.id,
      },
    });
    console.log('✅ SUPER_ADMIN créé : patrickdetoh@gmail.com');
  } else {
    console.log('✅ SUPER_ADMIN existe déjà');
  }

  // ==========================================
  // 4. ADMIN de UPGC (pour tests)
  // ==========================================
  const hashAdmin = await bcrypt.hash('Admin123!', 10);
  const existingAdmin = await prisma.utilisateur.findFirst({
    where: {
      email: 'admin@upgc.ci',
      organisationId: org.id,
    },
  });

  if (!existingAdmin) {
    await prisma.utilisateur.create({
      data: {
        nom: 'UPGC',
        prenom: 'Admin',
        email: 'admin@upgc.ci',
        motDePasse: hashAdmin,
        role: RoleUtilisateur.ADMIN,
        actif: true,
        organisationId: org.id,
      },
    });
    console.log('✅ ADMIN UPGC créé : admin@upgc.ci');
  } else {
    console.log('✅ ADMIN UPGC existe déjà');
  }

  // ==========================================
  // 5. PARAMÈTRES DE LA MUTUELLE
  // ==========================================
  const existingParams = await prisma.parametre.findFirst({
    where: { organisationId: org.id },
  });

  if (!existingParams) {
    await prisma.parametre.create({
      data: {
        organisationId: org.id,
        nomMutuelle: 'UPGC Mutuelle',
        devise: 'XOF',
        joursGrace: 90,
        email: 'contact@upgc.ci',
        telephone: '+225 07 00 00 00 00',
      },
    });
    console.log('✅ Paramètres mutuelle créés');
  } else {
    console.log('✅ Paramètres mutuelle existent déjà');
  }

  console.log('\n🎉 Seed terminé avec succès !\n');
  console.log('📋 Comptes disponibles :');
  console.log('   SUPER_ADMIN → patrickdetoh@gmail.com / Admin123!');
  console.log('   ADMIN UPGC  → admin@upgc.ci         / Admin123!');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });