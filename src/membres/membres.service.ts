import { 
  Injectable, 
  NotFoundException, 
  ConflictException, 
  BadRequestException 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMembreDto } from './dto/create-membre.dto';
import { UpdateMembreDto } from './dto/update-membre.dto';
import { QueryMembreDto } from './dto/query-membre.dto';
import { Prisma, StatutCotisation } from '@prisma/client';
import { ImportMembresDto } from './dto/import-membres.dto';
import { parse } from 'csv-parse/sync';
@Injectable()
export class MembresService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // GÉNÉRATION AUTOMATIQUE DU MATRICULE
  // ==========================================
  private async generateMatricule(): Promise<string> {
    const annee = new Date().getFullYear();
    const prefix = `UPGC-${annee}-`;

    // Compter les membres créés cette année
    const count = await this.prisma.membre.count({
      where: {
        matricule: {
          startsWith: prefix,
        },
      },
    });

    // Générer le matricule : UPGC-2026-001, UPGC-2026-002, etc.
    const numero = (count + 1).toString().padStart(3, '0');
    return `${prefix}${numero}`;
  }

  // ==========================================
  // CRÉER LE DROIT D'ADHÉSION (5000 FCFA)
  // ==========================================
  private async createDroitAdhesion(membreId: bigint, montant: number = 5000) {
    // Chercher le type "Droit d'adhésion"
    let typeAdhesion = await this.prisma.typeCotisation.findFirst({
      where: {
        libelle: { contains: 'adhésion', mode: 'insensitive' },
      },
    });

    // Si le type n'existe pas, le créer
    if (!typeAdhesion) {
      typeAdhesion = await this.prisma.typeCotisation.create({
        data: { libelle: 'Droit d\'adhésion' },
      });
    }

    // Créer la cotisation PAYEE (droit d'adhésion obligatoire)
    const cotisation = await this.prisma.cotisation.create({
      data: {
        membreId,
        typeCotisationId: typeAdhesion.id,
        montant,
        periode: new Date().toISOString().slice(0, 7), // YYYY-MM actuel
        statut: 'PAYEE',
        datePaiement: new Date(),
        modePaiement: 'ESPECES',
        reference: `ADH-${Date.now()}`,
      },
    });

    return cotisation;
  }

  // ==========================================
  // CRÉER UN MEMBRE
  // ==========================================
  async create(dto: CreateMembreDto) {
    // Vérifier l'email s'il est fourni
    if (dto.email) {
      const existingEmail = await this.prisma.membre.findFirst({
        where: { email: dto.email },
      });
      if (existingEmail) {
        throw new ConflictException('Cet email est déjà utilisé par un autre membre');
      }
    }

    // Générer le matricule automatiquement
    const matricule = await this.generateMatricule();

    // 👇 Extraire utilisateurId du DTO pour éviter le conflit
    const { utilisateurId, ...membreData } = dto;

    // Créer le membre
    const membre = await this.prisma.membre.create({
      data: {
        ...membreData,
        matricule,
        dateNaissance: new Date(dto.dateNaissance),
        dateAdhesion: dto.dateAdhesion ? new Date(dto.dateAdhesion) : new Date(),
        statut: dto.statut || 'ACTIF',
        // 👇 Si utilisateurId est fourni, le convertir en BigInt
        ...(utilisateurId && { utilisateurId: BigInt(utilisateurId) }),
      },
    });

    // Créer automatiquement le droit d'adhésion de 5000 FCFA
    const droitAdhesion = await this.createDroitAdhesion(membre.id);

    // Recharger le membre avec toutes ses relations
    const membreComplet = await this.prisma.membre.findUnique({
      where: { id: membre.id },
      include: {
        famille: {
          orderBy: { id: 'asc' },  // 👈 CORRIGÉ
        },
        cotisations: {
          include: { typeCotisation: true },
          orderBy: { periode: 'desc' },  // 👈 CORRIGÉ
        },
        prestations: {
          orderBy: { dateEvenement: 'desc' },  // 👈 CORRIGÉ
        },
      },
    });

    return {
      ...membreComplet,
      droitAdhesion,
    };
  }

  // ==========================================
  // LISTER LES MEMBRES AVEC PAGINATION
  // ==========================================
  async findAll(query: QueryMembreDto) {
    // 1. Configuration de la pagination
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 20; // 20 par défaut
    const skip = (page - 1) * limit;

    // 2. Construction des filtres
    const where: any = {};
    
    if (query.search) {
      where.OR = [
        { nom: { contains: query.search, mode: 'insensitive' } },
        { prenom: { contains: query.search, mode: 'insensitive' } },
        { matricule: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.statut) {
      where.statut = query.statut;
    }
    if (query.sexe) {
      where.sexe = query.sexe;
    }

    // 3. Exécution en parallèle (très rapide)
    const [data, total] = await this.prisma.$transaction([
      this.prisma.membre.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nom: 'asc' },
        select: {
          id: true,
          matricule: true,
          nom: true,
          prenom: true,
          sexe: true,
          dateAdhesion: true,
          statut: true,
          cotisations: {
            select: {
              id: true,
              montant: true,
              periode: true,
              statut: true,
              datePaiement: true,
              typeCotisation: { select: { libelle: true } },
            },
            orderBy: { periode: 'desc' },
          },
        },
      }),
      this.prisma.membre.count({ where }),
    ]);

    // 4. Retourner les données + les métadonnées de pagination
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==========================================
  // STATUT DES COTISATIONS D'UN MEMBRE
  // ==========================================
  async getStatutCotisations(membreId: bigint) {
    const membre = await this.prisma.membre.findUnique({
      where: { id: membreId },
      include: {
        cotisations: {
          include: { typeCotisation: true },
        },
      },
    });

    if (!membre) {
      throw new NotFoundException(`Membre avec ID ${membreId} non trouvé`);
    }

    // Calculer les trimestres requis
    const now = new Date();
    const dateAdhesion = new Date(membre.dateAdhesion);
    
    const trimestreActuel = now.getFullYear() * 4 + Math.floor(now.getMonth() / 3) + 1;
    const trimestreAdhesion = dateAdhesion.getFullYear() * 4 + Math.floor(dateAdhesion.getMonth() / 3) + 1;
    const trimestresRequis = Math.max(0, trimestreActuel - trimestreAdhesion);

    // Compter les trimestres payés (hors droit d'adhésion)
    const trimestresPayes = membre.cotisations.filter(
      c => c.statut === 'PAYEE' && 
          !c.typeCotisation.libelle.toLowerCase().includes('adhésion')
    ).length;

    // Calculer le retard
    const trimestresManquants = Math.max(0, trimestresRequis - trimestresPayes);
    const montantDu = trimestresManquants * 10000;

    // Déterminer le statut
    let statut: string;
    let estAJour: boolean;
    
    if (trimestresRequis === 0) {
      statut = 'À jour (nouveau membre)';
      estAJour = true;
    } else if (trimestresPayes >= trimestresRequis) {
      statut = 'À jour';
      estAJour = true;
    } else {
      statut = 'En retard';
      estAJour = false;
    }

    // Calculer le total payé
    const totalPaye = membre.cotisations
      .filter(c => c.statut === 'PAYEE')
      .reduce((sum, c) => {
        // Gérer tous les types possibles pour le montant
        let montant = 0;
        if (typeof c.montant === 'number') {
          montant = c.montant;
        } else if (typeof c.montant === 'string') {
          montant = parseFloat(c.montant) || 0;
        } else if (typeof c.montant === 'object' && c.montant !== null) {
          // Decimal Prisma
          if (typeof c.montant.toNumber === 'function') {
            montant = c.montant.toNumber();
          } else if (typeof (c.montant as any).valueOf === 'function') {
            montant = parseFloat((c.montant as any).valueOf()) || 0;
          }
        }
        return sum + montant;
      }, 0);

    return {
      membreId: membreId.toString(),
      trimestresRequis,
      trimestresPayes,
      trimestresManquants,
      montantDu,
      statut,
      estAJour,
      totalPaye,
      nombreCotisations: membre.cotisations.length,
      dateAdhesion: membre.dateAdhesion,
    };
  }

  // ==========================================
  // MEMBRES À RELANCER (EN RETARD DE PAIEMENT)
  // ==========================================
  async getMembresARelancer(query: { periode?: string; statut?: string }) {
    // Charger tous les membres avec leurs cotisations
    const membres = await this.prisma.membre.findMany({
      include: {
        cotisations: {
          include: { typeCotisation: true },
        },
      },
      orderBy: { nom: 'asc' },
    });

    const now = new Date();
    const trimestreActuel = now.getFullYear() * 4 + Math.floor(now.getMonth() / 3) + 1;

    // Calculer le statut de chaque membre
    const resultats = membres.map((membre) => {
      const dateAdhesion = new Date(membre.dateAdhesion);
      const trimestreAdhesion = dateAdhesion.getFullYear() * 4 + Math.floor(dateAdhesion.getMonth() / 3) + 1;
      const trimestresRequis = Math.max(0, trimestreActuel - trimestreAdhesion);

      const trimestresPayes = membre.cotisations.filter(
        c => c.statut === 'PAYEE' && 
            !c.typeCotisation.libelle.toLowerCase().includes('adhésion')
      ).length;

      const trimestresManquants = Math.max(0, trimestresRequis - trimestresPayes);
      const montantDu = trimestresManquants * 10000;

      let statut: string;
      if (trimestresRequis === 0) {
        statut = 'À jour (nouveau membre)';
      } else if (trimestresPayes >= trimestresRequis) {
        statut = 'À jour';
      } else {
        statut = 'En retard';
      }

      return {
        id: membre.id,
        matricule: membre.matricule,
        nom: membre.nom,
        prenom: membre.prenom,
        telephone: membre.telephone,
        email: membre.email,
        dateAdhesion: membre.dateAdhesion,
        trimestresRequis,
        trimestresPayes,
        trimestresManquants,
        montantDu,
        statut,
      };
    });

    // Filtrer selon le statut demandé (par défaut : en retard)
    const statutFiltre = query.statut || 'En retard';
    const membresFiltres = statutFiltre === 'TOUS' 
      ? resultats 
      : resultats.filter((m) => m.statut === statutFiltre);

    // Trier par montant dû décroissant
    return membresFiltres.sort((a, b) => b.montantDu - a.montantDu);
  }

  // ==========================================
  // DÉTAIL COMPLET D'UN MEMBRE
  // ==========================================
  async findOne(id: bigint) {
    const membre = await this.prisma.membre.findUnique({
      where: { id },
      include: {
        famille: {
          orderBy: { id: 'asc' },  
        },
        cotisations: {
          include: { typeCotisation: true },
          orderBy: { periode: 'desc' },  // 
        },
        prestations: {
          orderBy: { dateEvenement: 'desc' },  
        },
      },
    });

    if (!membre) {
      throw new NotFoundException(`Membre avec ID ${id} non trouvé`);
    }

    return membre;
  }

  // ==========================================
  // MODIFIER UN MEMBRE
  // ==========================================
  async update(id: bigint, dto: UpdateMembreDto) {
    // Vérifier que le membre existe
    const membre = await this.prisma.membre.findUnique({
      where: { id },
    });

    if (!membre) {
      throw new NotFoundException(`Membre avec ID ${id} non trouvé`);
    }

    // Vérifier l'email s'il est modifié
    if (dto.email && dto.email !== membre.email) {
      const existingEmail = await this.prisma.membre.findFirst({
        where: { email: dto.email },
      });
      if (existingEmail) {
        throw new ConflictException('Cet email est déjà utilisé par un autre membre');
      }
    }

    // Préparer les données de mise à jour
    const data: any = { ...dto };

    if (dto.dateNaissance) {
      data.dateNaissance = new Date(dto.dateNaissance);
    }

    if (dto.dateAdhesion) {
      data.dateAdhesion = new Date(dto.dateAdhesion);
    }

    return this.prisma.membre.update({
      where: { id },
      data,
      include: {
        famille: true,
        cotisations: {
          include: { typeCotisation: true },
        },
        prestations: true,
      },
    });
  }

  // ==========================================
  // SUPPRIMER UN MEMBRE
  // ==========================================
  async remove(id: bigint) {
    // Vérifier que le membre existe
    const membre = await this.prisma.membre.findUnique({
      where: { id },
      include: {
        cotisations: true,
        prestations: true,
      },
    });

    if (!membre) {
      throw new NotFoundException(`Membre avec ID ${id} non trouvé`);
    }

    // Vérifier s'il a des cotisations ou prestations
    if (membre.cotisations.length > 0 || membre.prestations.length > 0) {
      throw new BadRequestException(
        'Impossible de supprimer ce membre car il a des cotisations ou prestations associées. ' +
        'Vous pouvez le suspendre ou le radier à la place.',
      );
    }

    return this.prisma.membre.delete({
      where: { id },
    });
  }
  // ==========================================
  // AJOUTER UN AYANT DROIT (FAMILLE)
  // ==========================================
  async addFamille(membreId: bigint, dto: any) {
    // Vérifier que le membre existe
    const membre = await this.prisma.membre.findUnique({
      where: { id: membreId },
    });

    if (!membre) {
      throw new NotFoundException(`Membre avec ID ${membreId} non trouvé`);
    }

    return this.prisma.membreFamille.create({
      data: {
        membreId,
        nom: dto.nom,
        prenom: dto.prenom,
        lienParente: dto.lienParente,
        dateNaissance: dto.dateNaissance ? new Date(dto.dateNaissance) : null,
        telephone: dto.telephone,
      },
    });
  }

  // ==========================================
  // LISTER LA FAMILLE D'UN MEMBRE
  // ==========================================
  async getFamille(membreId: bigint) {
    const membre = await this.prisma.membre.findUnique({
      where: { id: membreId },
    });

    if (!membre) {
      throw new NotFoundException(`Membre avec ID ${membreId} non trouvé`);
    }

    return this.prisma.membreFamille.findMany({
      where: { membreId },
      orderBy: { id: 'asc' },
    });
  }

  // ==========================================
  // MODIFIER UN AYANT DROIT
  // ==========================================
  async updateFamille(familleId: bigint, dto: any) {
    const famille = await this.prisma.membreFamille.findUnique({
      where: { id: familleId },
    });

    if (!famille) {
      throw new NotFoundException(`Membre de la famille avec ID ${familleId} non trouvé`);
    }

    return this.prisma.membreFamille.update({
      where: { id: familleId },
      data: {
        nom: dto.nom,
        prenom: dto.prenom,
        lienParente: dto.lienParente,
        dateNaissance: dto.dateNaissance ? new Date(dto.dateNaissance) : null,
        telephone: dto.telephone,
      },
    });
  }

  // ==========================================
  // SUPPRIMER UN AYANT DROIT
  // ==========================================
  async removeFamille(familleId: bigint) {
    const famille = await this.prisma.membreFamille.findUnique({
      where: { id: familleId },
    });

    if (!famille) {
      throw new NotFoundException(`Membre de la famille avec ID ${familleId} non trouvé`);
    }

    return this.prisma.membreFamille.delete({
      where: { id: familleId },
    });
  }
 
    // IMPORT EN LOT DE MEMBRES
    // ==========================================
    async importMembres(dto: ImportMembresDto) {
      const MAX_MEMBRES = 500;
      if (dto.membres.length > MAX_MEMBRES) {
        throw new BadRequestException(
          `Trop de membres à importer (${dto.membres.length}). Maximum autorisé : ${MAX_MEMBRES}. ` +
          `Veuillez diviser votre fichier en plusieurs imports.`
        );
      }

      const resultats = {
        total: dto.membres.length,
        importes: 0,
        ignores: 0,
        erreurs: [] as string[],
      };

      // Récupérer les types de cotisation
      const typeAdhesion = await this.prisma.typeCotisation.findFirst({
        where: { libelle: { contains: 'adhésion', mode: 'insensitive' } },
      });
      const typeTrimestriel = await this.prisma.typeCotisation.findFirst({
        where: { libelle: { contains: 'trimestrielle', mode: 'insensitive' } },
      });

      for (const row of dto.membres) {
        try {
          // Vérifier si le membre existe déjà
          const existe = await this.prisma.membre.findFirst({
            where: {
              OR: [
                row.email ? { email: row.email } : {},
                { nom: row.nom, prenom: row.prenom },
              ],
            },
          });

          if (existe) {
            resultats.ignores++;
            resultats.erreurs.push(`${row.nom} ${row.prenom} existe déjà`);
            continue;
          }

          // Générer le matricule
          const matricule = await this.generateMatricule();

          // Créer le membre
          const membre = await this.prisma.membre.create({
            data: {
              nom: row.nom,
              prenom: row.prenom,
              sexe: (row.sexe === 'F' || row.sexe === 'f') ? 'F' : 'M',
              dateNaissance: row.dateNaissance ? new Date(row.dateNaissance) : new Date('1990-01-01'),
              dateAdhesion: new Date(row.dateAdhesion),
              telephone: row.telephone || '',
              email: row.email || '',
              profession: row.profession || '',
              adresse: row.adresse || '',
              matricule,
              statut: 'ACTIF',
            },
          });

          // Créer le droit d'adhésion (5000 FCFA)
          if (typeAdhesion) {
            await this.prisma.cotisation.create({
              data: {
                membreId: membre.id,
                typeCotisationId: typeAdhesion.id,
                montant: 5000,
                periode: row.dateAdhesion.slice(0, 7),
                statut: 'PAYEE',
                datePaiement: new Date(row.dateAdhesion),
                modePaiement: 'ESPECES',
                reference: `ADH-${Date.now()}`,
              },
            });
          }

          // Créer les cotisations trimestrielles payées
          if (typeTrimestriel && row.paiements && row.paiements.length > 0) {
            const cotisationsData = row.paiements.map((periode) => ({
              membreId: membre.id,
              typeCotisationId: typeTrimestriel.id,
              montant: 10000,
              periode,
              statut: 'PAYEE' as const,
              datePaiement: new Date(row.dateAdhesion),
              modePaiement: 'ESPECES' as const,
            }));

            await this.prisma.cotisation.createMany({
              data: cotisationsData,
            });
          }

          resultats.importes++;
        } catch (error: any) {
          resultats.erreurs.push(`${row.nom} ${row.prenom}: ${error.message}`);
        }
      }

      return resultats;
    }

    // ==========================================
    // IMPORTER DES MEMBRES DEPUIS UN FICHIER CSV
    // ==========================================
    async importMembresFromFile(file: any) {
      try {
        // Lire le contenu du fichier
        const content = file.buffer.toString('utf-8');

        // Parser manuellement le CSV
        const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');

        if (lines.length < 2) {
          throw new BadRequestException('Le fichier CSV est vide ou ne contient pas de données');
        }

        // Détecter le séparateur (; ou ,)
        const firstLine = lines[0];
        const separator = firstLine.includes(';') ? ';' : ',';

        // Extraire les en-têtes
        const headers = firstLine.split(separator).map(h => h.trim().replace(/^"|"$/g, ''));

        // Parser les lignes de données
        const membres: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(separator).map(v => v.trim().replace(/^"|"$/g, ''));

          if (values.length < 2) continue;

          const membre: any = {};

          headers.forEach((header, index) => {
            const key = header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            membre[key] = values[index] || '';
          });

          membres.push(membre);
        }

        if (membres.length === 0) {
          throw new BadRequestException('Aucun membre valide trouvé dans le fichier CSV');
        }

        // Transformer au format attendu par importMembres
        const membresFormates = membres.map(m => ({
          matricule: m.matricule || '',
          nom: m.nom || '',
          prenom: m.prenom || '',
          sexe: this.normaliserSexe(m.sexe),
          dateNaissance: this.normaliserDate(m.datenaissance || m.date_naissance),
          profession: m.profession || '',
          telephone: m.telephone || '',
          email: m.email || '',
          dateAdhesion: this.normaliserDate(m.dateadhesion || m.date_adhesion) || new Date().toISOString().split('T')[0],
          statut: m.statut || 'ACTIF',
        })).filter(m => m.nom && m.prenom);

        // Appeler la méthode existante
        return await this.importMembres({ membres: membresFormates });

      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        console.error('Erreur lors du parsing CSV:', error);
        throw new BadRequestException('Erreur lors de la lecture du fichier CSV');
      }
    }

    // ==========================================
    // HELPER : Normaliser le sexe
    // ==========================================
    private normaliserSexe(sexe: string): string {
      if (!sexe) return 'M';
      const s = sexe.trim().toUpperCase();
      if (s.startsWith('F') || s === 'FEMME' || s === 'FEMININ') return 'F';
      return 'M';
    }

    // ==========================================
    // HELPER : Normaliser une date
    // ==========================================
    private normaliserDate(dateStr: string): string | null {
      if (!dateStr) return null;

      // Format DD/MM/YYYY → YYYY-MM-DD
      const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (match) {
        return `${match[3]}-${match[2]}-${match[1]}`;
      }

      // Déjà au format ISO
      if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return dateStr.substring(0, 10);
      }

      return null;
    }
    async getStatutComplet(membreId: bigint) {
      const membre = await this.prisma.membre.findUnique({
        where: { id: membreId },
        include: {
          cotisations: {
            where: { statut: { in: ['EN_ATTENTE', 'EN_RETARD'] } },
            select: { id: true, statut: true, periode: true, montant: true },
          },
        },
      });

      if (!membre) {
        throw new NotFoundException(`Membre ${membreId} non trouvé`);
      }

      // Calculer les trimestres requis et payés (même logique que getStatutCotisations)
      const now = new Date();
      const dateAdhesion = new Date(membre.dateAdhesion);
      const trimestreActuel = now.getFullYear() * 4 + Math.floor(now.getMonth() / 3) + 1;
      const trimestreAdhesion = dateAdhesion.getFullYear() * 4 + Math.floor(dateAdhesion.getMonth() / 3) + 1;
      const trimestresRequis = Math.max(0, trimestreActuel - trimestreAdhesion);

      const toutesCotisations = await this.prisma.cotisation.findMany({
        where: { 
          membreId, 
          statut: 'PAYEE',
          typeCotisation: {
            libelle: { not: { contains: 'adhésion' } },
          },
        },
      });

      const trimestresPayes = toutesCotisations.length;
      const trimestresManquants = Math.max(0, trimestresRequis - trimestresPayes);
      const estAJour = trimestresManquants === 0;

      return {
        membre: {
          id: membre.id.toString(),
          matricule: membre.matricule,
          nom: membre.nom,
          prenom: membre.prenom,
          statut: membre.statut,
          telephone: membre.telephone,
          email: membre.email,
          dateAdhesion: membre.dateAdhesion,
        },
        cotisations: {
          estAJour,
          trimestresRequis,
          trimestresPayes,
          trimestresManquants,
          montantDu: trimestresManquants * 10000,
          cotisationsImpayees: membre.cotisations.length,
        },
      };
    }
    
  }
