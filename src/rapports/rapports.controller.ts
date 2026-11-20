import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { RapportsService } from './rapports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleUtilisateur } from '@prisma/client';

@Controller('rapports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE)
export class RapportsController {
  constructor(private rapportsService: RapportsService) {}

  private getOrganisationId(user: any): bigint {
    if (!user.organisationId) throw new BadRequestException('Aucune organisation associée');
    return BigInt(user.organisationId);
  }

  @Get('financier-annuel')
  async getRapportFinancierAnnuel(@CurrentUser() user: any, @Query('annee') annee: number) {
    const anneeNum = Number(annee) || new Date().getFullYear();
    return this.rapportsService.getRapportFinancierAnnuel(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), anneeNum);
  }

  @Get('cotisations')
  async getRapportCotisations(@CurrentUser() user: any, @Query('dateDebut') dateDebut: string, @Query('dateFin') dateFin: string) {
    return this.rapportsService.getRapportCotisations(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), dateDebut, dateFin);
  }

  @Get('prestations')
  async getRapportPrestations(@CurrentUser() user: any, @Query('dateDebut') dateDebut: string, @Query('dateFin') dateFin: string) {
    return this.rapportsService.getRapportPrestations(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), dateDebut, dateFin);
  }

  @Get('dons')
  async getRapportDons(@CurrentUser() user: any, @Query('dateDebut') dateDebut: string, @Query('dateFin') dateFin: string) {
    return this.rapportsService.getRapportDons(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), dateDebut, dateFin);
  }

  @Get('ag')
  async getRapportGeneralAG(@CurrentUser() user: any, @Query('annee') annee: number) {
    const anneeNum = Number(annee) || new Date().getFullYear();
    return this.rapportsService.getRapportGeneralAG(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), anneeNum);
  }

  @Get('etats-paiements')
  async getEtatPaiements(@CurrentUser() user: any, @Query('annee') annee: number) {
    const anneeNum = Number(annee) || new Date().getFullYear();
    return this.rapportsService.getEtatPaiements(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), anneeNum);
  }
}