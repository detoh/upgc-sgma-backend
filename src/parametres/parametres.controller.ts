import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ParametresService } from './parametres.service';
import { UpdateParametresDto } from './dto/update-parametres.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleUtilisateur } from '@prisma/client';

@Controller('parametres')
@UseGuards(JwtAuthGuard)
export class ParametresController {
  constructor(private parametresService: ParametresService) {}

  @Get()
  async get() {
    return this.parametresService.get();
  }

  @Patch()
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN)
  async update(@Body() dto: UpdateParametresDto) {
    return this.parametresService.update(dto);
  }
}