import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  UseGuards, HttpCode, HttpStatus, ParseIntPipe, BadRequestException
} from '@nestjs/common';
import { ActivitesService } from './activites.service';
import { CreateActiviteDto } from './dto/create-activite.dto';
import { UpdateActiviteDto } from './dto/update-activite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleUtilisateur } from '@prisma/client';
import { SubscriptionGuard } from '../billing/guards/subscription.guard';

@Controller('activites')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class ActivitesController {
  constructor(private activitesService: ActivitesService) {}

  private getOrganisationId(user: any): bigint {
    if (!user.organisationId) throw new BadRequestException('Aucune organisation associée à cet utilisateur');
    return BigInt(user.organisationId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE)
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: any, @Body() dto: CreateActiviteDto) {
    return this.activitesService.create(this.getOrganisationId(user), dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER, RoleUtilisateur.MEMBRE)
  async findAll(@CurrentUser() user: any) {
    return this.activitesService.findAll(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user));
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER, RoleUtilisateur.MEMBRE)
  async findOne(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.activitesService.findOne(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), BigInt(id));
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE)
  async update(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActiviteDto,
  ) {
    return this.activitesService.update(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), BigInt(id), dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN) // 🆕 Correction du doublon SUPER_ADMIN
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.activitesService.remove(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), BigInt(id));
  }
}