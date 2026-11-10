import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RapportsService } from './rapports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleUtilisateur } from '@prisma/client';

@Controller('rapports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE)
export class RapportsController {
  constructor(private rapportsService: RapportsService) {}

  @Get('financier-annuel')
  async getRapportFinancierAnnuel(@Query('annee') annee: number) {
    const anneeNum = Number(annee) || new Date().getFullYear();
    return this.rapportsService.getRapportFinancierAnnuel(anneeNum);
  }

  @Get('cotisations')
  async getRapportCotisations(
    @Query('dateDebut') dateDebut: string,
    @Query('dateFin') dateFin: string,
  ) {
    return this.rapportsService.getRapportCotisations(dateDebut, dateFin);
  }

  @Get('prestations')
  async getRapportPrestations(
    @Query('dateDebut') dateDebut: string,
    @Query('dateFin') dateFin: string,
  ) {
    return this.rapportsService.getRapportPrestations(dateDebut, dateFin);
  }

  @Get('dons')
  async getRapportDons(
    @Query('dateDebut') dateDebut: string,
    @Query('dateFin') dateFin: string,
  ) {
    return this.rapportsService.getRapportDons(dateDebut, dateFin);
  }

  @Get('ag')
  async getRapportGeneralAG(@Query('annee') annee: number) {
    const anneeNum = Number(annee) || new Date().getFullYear();
    return this.rapportsService.getRapportGeneralAG(anneeNum);
  }

  @Get('etats-paiements')
  async getEtatPaiements(@Query('annee') annee: number) {
    const anneeNum = Number(annee) || new Date().getFullYear();
    return this.rapportsService.getEtatPaiements(anneeNum);
  }
}