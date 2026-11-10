import { 
  Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus 
} from '@nestjs/common';
import { DonsService } from './dons.service';
import { CreateDonDto } from './dto/create-don.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleUtilisateur } from '@prisma/client';

@Controller('dons')
@UseGuards(JwtAuthGuard)
export class DonsController {
  constructor(private donsService: DonsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.CAISSIER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateDonDto,
    @CurrentUser() user: any,
  ) {
    return this.donsService.create(dto, user.id);
  }

  @Get()
  async findAll() {
    return this.donsService.findAll();
  }

  @Get('stats')
  async getStats() {
    return this.donsService.getStats();
  }
}