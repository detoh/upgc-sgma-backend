import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, ParseIntPipe, BadRequestException
} from '@nestjs/common';
import { CotisationsService } from './cotisations.service';
import { CreateTypeCotisationDto } from './dto/create-type-cotisation.dto';
import { CreateCotisationDto } from './dto/create-cotisation.dto';
import { UpdateCotisationDto } from './dto/update-cotisation.dto';
import { PayerCotisationDto } from './dto/payer-cotisation.dto';
import { QueryCotisationDto } from './dto/query-cotisation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleUtilisateur } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SubscriptionGuard } from '../billing/guards/subscription.guard';
@Controller('cotisations')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class CotisationsController {
  constructor(private cotisationsService: CotisationsService) {}

  private getOrganisationId(user: any): bigint {
    if (!user.organisationId) throw new BadRequestException('Aucune organisation associée à cet utilisateur');
    return BigInt(user.organisationId);
  }

  @Post('types')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE)
  @HttpCode(HttpStatus.CREATED)
  async createType(@CurrentUser() user: any, @Body() dto: CreateTypeCotisationDto) {
    return this.cotisationsService.createType(this.getOrganisationId(user), dto);
  }

  @Get('types')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE)
  async findAllTypes(@CurrentUser() user: any) {
    return this.cotisationsService.findAllTypes(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: any, @Body() dto: CreateCotisationDto) {
    return this.cotisationsService.create(this.getOrganisationId(user), dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
  async findAll(@CurrentUser() user: any, @Query() query: QueryCotisationDto) {
    return this.cotisationsService.findAll(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), query);
  }

  @Get('stats/membre/:membreId')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
  async getStatsByMembre(@CurrentUser() user: any, @Param('membreId', ParseIntPipe) membreId: number) {
    return this.cotisationsService.getStatsByMembre(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), BigInt(membreId));
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
  async findOne(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.cotisationsService.findOne(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), BigInt(id));
  }

  @Patch(':id/payer')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
  async payer(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number, @Body() dto: PayerCotisationDto) {
    return this.cotisationsService.payer(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), BigInt(id), dto);
  }

  @Patch(':id/annuler')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
  async annuler(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.cotisationsService.annuler(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), BigInt(id));
  }
}