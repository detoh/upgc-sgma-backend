import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleUtilisateur } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleUtilisateur.SUPER_ADMIN)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('organisations')
  async getOrganisations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('statut') statut?: string,
    @Query('recherche') recherche?: string,
  ) {
    return this.adminService.getOrganisations({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      statut,
      recherche,
    });
  }

  @Get('organisations/:id')
  async getOrganisationDetail(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getOrganisationDetail(BigInt(id));
  }

  @Patch('organisations/:id/suspendre')
  async suspendreOrganisation(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { motif?: string },
  ) {
    return this.adminService.suspendreOrganisation(BigInt(id), body.motif);
  }

  @Patch('organisations/:id/reactiver')
  async reactiverOrganisation(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { joursOfferts?: number },
  ) {
    return this.adminService.reactiverOrganisation(BigInt(id), body.joursOfferts || 30);
  }
}