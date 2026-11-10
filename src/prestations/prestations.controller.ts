import { 
  Controller, Get, Post, Patch, Body, Param, Query, 
  UseGuards, HttpCode, HttpStatus, ParseIntPipe 
} from '@nestjs/common';
import { PrestationsService } from './prestations.service';
import { CreatePrestationDto } from './dto/create-prestation.dto';
import { UpdatePrestationDto } from './dto/update-prestation.dto';
import { ValiderPrestationDto } from './dto/valider-prestation.dto';
import { PayerPrestationDto } from './dto/payer-prestation.dto';
import { QueryPrestationDto } from './dto/query-prestation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleUtilisateur } from '@prisma/client';

@Controller('prestations')
@UseGuards(JwtAuthGuard)
export class PrestationsController {
  constructor(private prestationsService: PrestationsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.MEMBRE)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreatePrestationDto,
    @CurrentUser() user: any,
  ) {
    return this.prestationsService.create(dto, user.id);
  }

  @Get()
  async findAll(@Query() query: QueryPrestationDto) {
    return this.prestationsService.findAll(query);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE)
  async getStats() {
    return this.prestationsService.getStats();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.prestationsService.findOne(BigInt(id));
  }

  @Patch(':id/valider')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE)
  async valider(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ValiderPrestationDto,
    @CurrentUser() user: any,
  ) {
    return this.prestationsService.valider(BigInt(id), dto, user.id);
  }

  @Patch(':id/payer')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.CAISSIER)
  async payer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PayerPrestationDto,
    @CurrentUser() user: any,
  ) {
    return this.prestationsService.payer(BigInt(id), dto, user.id);
  }
}