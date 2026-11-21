import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreatePaiementDto } from './dto/create-paiement.dto';
import { ValiderPaiementDto } from './dto/valider-paiement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleUtilisateur } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { SubscriptionCronService } from './cron/subscription-cron.service';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(
    private billingService: BillingService,
    private CronService: SubscriptionCronService,
  ) {}
  
  // Ajoute cette route (SUPER_ADMIN uniquement)
  @Post('cron/trigger')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN)
  async triggerCron() {
    return this.CronService.triggerManually();
  }
  // ==========================================
  // ROUTES PUBLIQUES (accessibles même si suspendu)
  // ==========================================

  @Get('plans')
  @Public() 
  async getPlans() {
    return this.billingService.getPlans();
  }

  @Get('statut')
  async getStatutAbonnement(@CurrentUser() user: any) {
    return this.billingService.getStatutAbonnement(BigInt(user.organisationId));
  }

  @Post('payer')
  @HttpCode(HttpStatus.CREATED)
  async createPaiement(@CurrentUser() user: any, @Body() dto: CreatePaiementDto) {
    return this.billingService.createPaiement(BigInt(user.organisationId), dto, BigInt(user.id));
  }

  @Get('historique')
  async getHistorique(@CurrentUser() user: any) {
    return this.billingService.getHistoriquePaiements(BigInt(user.organisationId));
  }

  // ==========================================
  // ROUTES SUPER_ADMIN (validation cash)
  // ==========================================

  @Get('paiements-en-attente')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN)
  async getPaiementsEnAttente() {
    return this.billingService.getPaiementsEnAttente();
  }

  @Patch('paiements/:id/valider')
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.SUPER_ADMIN)
  async validerPaiement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ValiderPaiementDto,
    @CurrentUser() user: any,
  ) {
    return this.billingService.validerPaiementCash(BigInt(id), dto, BigInt(user.id));
  }
}