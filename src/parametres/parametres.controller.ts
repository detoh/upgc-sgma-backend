import { Controller, Get, Patch, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ParametresService } from './parametres.service';
import { UpdateParametresDto } from './dto/update-parametres.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleUtilisateur } from '@prisma/client';

@Controller('parametres')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN)
export class ParametresController {
  constructor(private parametresService: ParametresService) {}

  private getOrganisationId(user: any): bigint {
    if (!user.organisationId) throw new BadRequestException('Aucune organisation associée');
    return BigInt(user.organisationId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN)
  async get(@CurrentUser() user: any) {
    return this.parametresService.get(this.getOrganisationId(user));
  }

  @Patch()
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN, RoleUtilisateur.ADMIN)
  async update(@CurrentUser() user: any, @Body() dto: UpdateParametresDto) {
    return this.parametresService.update(this.getOrganisationId(user), dto);
  }
}