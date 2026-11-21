import {
  Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus, BadRequestException
} from '@nestjs/common';
import { DonsService } from './dons.service';
import { CreateDonDto } from './dto/create-don.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleUtilisateur } from '@prisma/client';
import { SubscriptionGuard } from '../billing/guards/subscription.guard';

@Controller('dons')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class DonsController {
  constructor(private donsService: DonsService) {}

  private getOrganisationId(user: any): bigint {
    if (!user.organisationId) throw new BadRequestException('Aucune organisation associée à cet utilisateur');
    return BigInt(user.organisationId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateDonDto, @CurrentUser() user: any) {
    return this.donsService.create(this.getOrganisationId(user), dto, user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
  async findAll(@CurrentUser() user: any) {
    return this.donsService.findAll(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user));
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
  async getStats(@CurrentUser() user: any) {
    return this.donsService.getStats(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user));
  }
}