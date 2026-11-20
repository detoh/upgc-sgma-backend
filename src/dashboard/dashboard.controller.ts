import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleUtilisateur } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  // Helper pour extraire organisationId (null si SUPER_ADMIN)
  private getOrganisationId(user: any): bigint | null {
    return user.role === 'SUPER_ADMIN' ? null : BigInt(user.organisationId);
  }

  @Get('resume')
  async getResume(@CurrentUser() user: any) {
    return this.dashboardService.getResume(this.getOrganisationId(user));
  }

  @Get('stats')
  async getStats(@CurrentUser() user: any) {
    return this.dashboardService.getStats(this.getOrganisationId(user));
  }

  @Get('membres')
  async getMembres(
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('statut') statut?: string,
    @Query('limit') limit?: number,
  ) {
    return this.dashboardService.getMembres(this.getOrganisationId(user), { search, statut, limit });
  }

  @Get('cotisations-impayees')
  async getCotisationsImpayees(@CurrentUser() user: any) {
    return this.dashboardService.getCotisationsImpayees(this.getOrganisationId(user));
  }

  @Get('prestations-en-attente')
  async getPrestationsEnAttente(@CurrentUser() user: any) {
    return this.dashboardService.getPrestationsEnAttente(this.getOrganisationId(user));
  }

  @Get('activites-a-venir')
  async getActivitesAVenir(@CurrentUser() user: any) {
    return this.dashboardService.getActivitesAVenir(this.getOrganisationId(user));
  }
}