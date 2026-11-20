import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { UtilisateursService } from './utilisateurs.service';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';
import { UpdateUtilisateurDto } from './dto/update-utilisateur.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleUtilisateur } from '@prisma/client';

@Controller('utilisateurs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN)
export class UtilisateursController {
  constructor(private utilisateursService: UtilisateursService) {}

  private getOrganisationId(user: any): bigint {
    if (!user.organisationId) throw new BadRequestException('Aucune organisation associée');
    return BigInt(user.organisationId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: any, @Body() dto: CreateUtilisateurDto) {
    return this.utilisateursService.create(this.getOrganisationId(user), dto);
  }

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.utilisateursService.findAll(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user));
  }

  @Get(':id')
  async findOne(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.utilisateursService.findOne(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), BigInt(id));
  }

  @Patch(':id')
  async update(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUtilisateurDto) {
    return this.utilisateursService.update(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), BigInt(id), dto);
  }

  @Patch(':id/toggle-actif')
  async toggleActif(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.utilisateursService.toggleActif(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), BigInt(id));
  }

  @Patch(':id/reset-password')
  async resetPassword(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number, @Body('motDePasse') motDePasse: string) {
    return this.utilisateursService.resetPassword(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), BigInt(id), motDePasse);

  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.utilisateursService.remove(user.role === 'SUPER_ADMIN' ? null : this.getOrganisationId(user), BigInt(id));
  }
}