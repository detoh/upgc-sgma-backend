import { 
  Controller, Get, Post, Patch, Body, Param, Query, 
  UseGuards, HttpCode, HttpStatus, ParseIntPipe 
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

@Controller('cotisations')
@UseGuards(JwtAuthGuard)
export class CotisationsController {
  constructor(private cotisationsService: CotisationsService) {}

  // ==========================================
  // TYPES DE COTISATION
  // ==========================================
  
  @Post('types')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE)
  @HttpCode(HttpStatus.CREATED)
  async createType(@Body() dto: CreateTypeCotisationDto) {
    return this.cotisationsService.createType(dto);
  }

  @Get('types')
  async findAllTypes() {
    return this.cotisationsService.findAllTypes();
  }

  // ==========================================
  // COTISATIONS
  // ==========================================
  
  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCotisationDto) {
    return this.cotisationsService.create(dto);
  }

  @Get()
  async findAll(@Query() query: QueryCotisationDto) {
    return this.cotisationsService.findAll(query);
  }

  @Get('stats/membre/:membreId')
  async getStatsByMembre(@Param('membreId', ParseIntPipe) membreId: number) {
    return this.cotisationsService.getStatsByMembre(BigInt(membreId));
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cotisationsService.findOne(BigInt(id));
  }

  @Patch(':id/payer')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.CAISSIER)
  async payer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PayerCotisationDto,
  ) {
    return this.cotisationsService.payer(BigInt(id), dto);
  }

  @Patch(':id/annuler')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE)
  async annuler(@Param('id', ParseIntPipe) id: number) {
    return this.cotisationsService.annuler(BigInt(id));
  }
}