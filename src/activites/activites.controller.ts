import { 
  Controller, Get, Post, Patch, Delete, Body, Param, 
  UseGuards, HttpCode, HttpStatus, ParseIntPipe 
} from '@nestjs/common';
import { ActivitesService } from './activites.service';
import { CreateActiviteDto } from './dto/create-activite.dto';
import { UpdateActiviteDto } from './dto/update-activite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleUtilisateur } from '@prisma/client';

@Controller('activites')
@UseGuards(JwtAuthGuard)
export class ActivitesController {
  constructor(private activitesService: ActivitesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateActiviteDto) {
    return this.activitesService.create(dto);
  }

  @Get()
  async findAll() {
    return this.activitesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.activitesService.findOne(BigInt(id));
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActiviteDto,
  ) {
    return this.activitesService.update(BigInt(id), dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.activitesService.remove(BigInt(id));
  }
}