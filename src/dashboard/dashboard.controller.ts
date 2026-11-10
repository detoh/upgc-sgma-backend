import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleUtilisateur } from '@prisma/client';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('resume')
  async getResume() {
    return this.dashboardService.getResume();
  }

  @Get('stats')
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Get('membres')
  async getMembres(
    @Query('search') search?: string,
    @Query('statut') statut?: string,
    @Query('limit') limit?: number,
  ) {
    return this.dashboardService.getMembres({ search, statut, limit });
  }

  @Get('cotisations-impayees')
  async getCotisationsImpayees() {
    return this.dashboardService.getCotisationsImpayees();
  }

  @Get('prestations-en-attente')
  async getPrestationsEnAttente() {
    return this.dashboardService.getPrestationsEnAttente();
  }

  @Get('activites-a-venir')
  async getActivitesAVenir() {
    return this.dashboardService.getActivitesAVenir();
  }
}