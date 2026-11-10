import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MembresService } from './membres.service';
import { CreateMembreDto } from './dto/create-membre.dto';
import { UpdateMembreDto } from './dto/update-membre.dto';
import { QueryMembreDto } from './dto/query-membre.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleUtilisateur } from '@prisma/client';
import { BigIntInterceptor } from '../common/interceptors/bigint.interceptor';

@Controller('membres')
@UseGuards(JwtAuthGuard)
@UseInterceptors(BigIntInterceptor)
export class MembresController {
  constructor(private readonly membresService: MembresService) {}

  // ==========================================
  // LISTE DES MEMBRES (avec pagination, filtres, recherche)
  // ==========================================
  @Get()
  findAll(@Query() query: QueryMembreDto) {
    // Nettoyer les chaînes vides pour éviter les erreurs 400
    const cleanedQuery: any = {
      page: query.page,
      limit: query.limit,
    };

    if (query.search && query.search.trim() !== '') {
      cleanedQuery.search = query.search;
    }
    if (query.statut && query.statut.trim() !== '') {
      cleanedQuery.statut = query.statut;
    }
    if (query.sexe && query.sexe.trim() !== '') {
      cleanedQuery.sexe = query.sexe;
    }

    return this.membresService.findAll(cleanedQuery);
  }

  // ==========================================
  // MEMBRES À RELANCER (en retard de paiement)
  // ==========================================
  @Get('a-relancer')
  getMembresARelancer(@Query() query: { periode?: string; statut?: string }) {
    return this.membresService.getMembresARelancer(query);
  }

  // ==========================================
  // STATUT COMPLET D'UN MEMBRE (avec cotisations)
  // ==========================================
  @Get(':id/statut-complet')
  async getStatutComplet(@Param('id', ParseIntPipe) id: number) {
    return this.membresService.getStatutComplet(BigInt(id));
  }

  // ==========================================
  // STATUT DES COTISATIONS D'UN MEMBRE
  // ==========================================
  @Get(':id/statut-cotisations')
  getStatutCotisations(@Param('id', ParseIntPipe) id: number) {
    return this.membresService.getStatutCotisations(BigInt(id));
  }
  // ==========================================
  // FAMILLE D'UN MEMBRE (ayants droit)
  // ==========================================
  @Get(':id/famille')
  async getFamille(@Param('id', ParseIntPipe) id: number) {
    return this.membresService.getFamille(BigInt(id));
  }
  // ==========================================
  // DÉTAIL D'UN MEMBRE
  // ==========================================
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.membresService.findOne(BigInt(id));
  }

  // ==========================================
  // CRÉER UN MEMBRE
  // ==========================================
  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE)
  create(@Body() createMembreDto: CreateMembreDto) {
    return this.membresService.create(createMembreDto);
  }

  // ==========================================
  // IMPORTER DES MEMBRES (CSV)
  // ==========================================
  @Post('import')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE)
  @UseInterceptors(FileInterceptor('file'))
  async importMembres(@UploadedFile() file: any) {  // ✅ Utiliser 'any' au lieu de Express.Multer.File
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Le fichier doit être au format CSV');
    }

    return this.membresService.importMembresFromFile(file);
  }

  // ==========================================
  // MODIFIER UN MEMBRE
  // ==========================================
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMembreDto: UpdateMembreDto,
  ) {
    return this.membresService.update(BigInt(id), updateMembreDto);
  }

  // ==========================================
  // SUPPRIMER UN MEMBRE
  // ==========================================
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.membresService.remove(BigInt(id));
  }
}