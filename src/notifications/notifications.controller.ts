import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RelanceDto, MembreRelanceDto } from './dto/relance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post('relance')
  async envoyerRelances(@Body() dto: RelanceDto) {
    return this.notificationsService.envoyerRelances(dto);
  }

  @Post('previsualiser')
  async previsualiser(@Body() body: { membre: MembreRelanceDto; type: 'EMAIL' | 'SMS' }) {
    return {
      message: this.notificationsService.previsualiserMessage(body.membre, body.type),
    };
  }

  @Get('historique')
  async getHistorique() {
    return this.notificationsService.getHistorique();
  }
}