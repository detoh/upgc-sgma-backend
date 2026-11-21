import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, ParseIntPipe, Request, BadRequestException
} from '@nestjs/common';
import { PrestationsService } from './prestations.service';
import { CreatePrestationDto } from './dto/create-prestation.dto';
import { ValiderPrestationDto } from './dto/valider-prestation.dto';
import { PayerPrestationDto } from './dto/payer-prestation.dto';
import { QueryPrestationDto } from './dto/query-prestation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleUtilisateur } from '@prisma/client';
import { SubscriptionGuard } from '../billing/guards/subscription.guard';

@Controller('prestations')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class PrestationsController {
  constructor(private prestationsService: PrestationsService) {}

  private getOrganisationId(user: any): bigint {
    if (!user.organisationId) throw new BadRequestException('Aucune organisation associée à cet utilisateur');
    return BigInt(user.organisationId);
  }

  @Get('me')
  async getMyPrestations(@Request() req) {
    return this.prestationsService.getPrestationsByUtilisateurId(BigInt(req.user.id));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.MEMBRE)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePrestationDto, @CurrentUser() user: any) {
    return this.prestationsService.create(this.getOrganisationId(user), dto, user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.MEMBRE)
  async findAll(@CurrentUser() user: any, @Query() query: QueryPrestationDto) {
    return this.prestationsService.findAll(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), query);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.MEMBRE)
  async getStats(@CurrentUser() user: any) {
    return this.prestationsService.getStats(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user));
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.MEMBRE)
  async findOne(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.prestationsService.findOne(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), BigInt(id));
  }

  @Patch(':id/valider')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.MEMBRE)
  async valider(@Param('id', ParseIntPipe) id: number, @Body() dto: ValiderPrestationDto, @CurrentUser() user: any) {
    return this.prestationsService.valider(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), BigInt(id), dto, user.id);
  }

  @Patch(':id/payer')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
  async payer(@Param('id', ParseIntPipe) id: number, @Body() dto: PayerPrestationDto, @CurrentUser() user: any) {
    return this.prestationsService.payer(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), BigInt(id), dto, user.id);
  }
}