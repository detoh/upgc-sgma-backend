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
  Request,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('membres')
@UseGuards(JwtAuthGuard)
@UseInterceptors(BigIntInterceptor)
export class MembresController {
  constructor(private readonly membresService: MembresService) {}

  // Helper pour extraire organisationId
  private getOrganisationId(user: any): bigint {
    if (!user.organisationId) {
      throw new BadRequestException('Aucune organisation associée à cet utilisateur');
    }
    return BigInt(user.organisationId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
  findAll(@CurrentUser() user: any, @Query() query: QueryMembreDto) {
    const cleanedQuery: any = { page: query.page, limit: query.limit };
    if (query.search && query.search.trim() !== '') cleanedQuery.search = query.search;
    if (query.statut && query.statut.trim() !== '') cleanedQuery.statut = query.statut;
    if (query.sexe && query.sexe.trim() !== '') cleanedQuery.sexe = query.sexe;

    return this.membresService.findAll(this.getOrganisationId(user), cleanedQuery);
  }

  @Get('a-relancer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
  getMembresARelancer(@CurrentUser() user: any, @Query() query: { periode?: string; statut?: string }) {
    return this.membresService.getMembresARelancer(this.getOrganisationId(user), query);
  }

  @Get(':id/statut-complet')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
  async getStatutComplet(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.membresService.getStatutComplet(this.getOrganisationId(user), BigInt(id));
  }

  @Get(':id/statut-cotisations')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
  getStatutCotisations(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.membresService.getStatutCotisations(this.getOrganisationId(user), BigInt(id));
  }

  @Get(':id/famille')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
  async getFamille(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.membresService.getFamille(BigInt(id));
  }

  @Get('me')
  async getMyMembre(@CurrentUser() user: any) {
    return this.membresService.getMembreByUtilisateurId(BigInt(user.id));
  }

  @Post('me/famille')
  async addMyFamille(@CurrentUser() user: any, @Body() dto: any) {
    return this.membresService.addFamilleToCurrentMembre(BigInt(user.id), dto);
  }

  @Get('me/famille')
  async getMyFamille(@CurrentUser() user: any) {
    return this.membresService.getFamilleByUtilisateurId(BigInt(user.id));
  }

  @Patch('me/famille/:id')
  async updateMyFamille(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.membresService.updateFamilleOwner(BigInt(user.id), BigInt(id), dto);
  }

  @Delete('me/famille/:id')
  async removeMyFamille(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.membresService.removeFamilleOwner(BigInt(user.id), BigInt(id));
  }

  @Post(':id/famille')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
  async addFamille(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.membresService.addFamille(BigInt(id), dto);
  }

  @Patch(':id/famille/:familleId')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
  async updateFamille(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Param('familleId', ParseIntPipe) familleId: number,
    @Body() dto: any,
  ) {
    return this.membresService.updateFamille(BigInt(familleId), dto);
  }

  @Delete(':id/famille/:familleId')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
  async removeFamille(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Param('familleId', ParseIntPipe) familleId: number,
  ) {
    return this.membresService.removeFamille(BigInt(familleId));
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
  findOne(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.membresService.findOne(this.getOrganisationId(user), BigInt(id));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
  create(@CurrentUser() user: any, @Body() createMembreDto: CreateMembreDto) {
    return this.membresService.create(this.getOrganisationId(user), createMembreDto);
  }

  @Post('import')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
  @UseInterceptors(FileInterceptor('file'))
  async importMembres(@CurrentUser() user: any, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Aucun fichier fourni');
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Le fichier doit être au format CSV');
    }
    return this.membresService.importMembresFromFile(this.getOrganisationId(user), file);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE)
  update(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMembreDto: UpdateMembreDto,
  ) {
    return this.membresService.update(this.getOrganisationId(user), BigInt(id), updateMembreDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN)
  remove(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.membresService.remove(this.getOrganisationId(user), BigInt(id));
  }
}