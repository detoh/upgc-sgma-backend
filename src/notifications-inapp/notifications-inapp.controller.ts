import { Controller, Get, Post, Patch, Delete, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { NotificationsInAppService } from './notifications-inapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notifications-inapp')
@UseGuards(JwtAuthGuard)
export class NotificationsInAppController {
  constructor(private notificationsInAppService: NotificationsInAppService) {}

  @Get()
  async getMesNotifications(@CurrentUser() user: any) {
    const [notifications, countNonLues] = await Promise.all([
      this.notificationsInAppService.findAllForUser(user.id),
      this.notificationsInAppService.countNonLues(user.id),
    ]);

    return {
      notifications,
      countNonLues,
    };
  }

  @Patch(':id/lue')
  async marquerCommeLue(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.notificationsInAppService.marquerCommeLue(BigInt(id), user.id);
  }

  @Patch('tout-lire')
  async marquerToutCommeLu(@CurrentUser() user: any) {
    return this.notificationsInAppService.marquerToutesCommeLues(user.id);
  }

  @Delete(':id')
  async supprimer(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.notificationsInAppService.supprimer(BigInt(id), user.id);
  }
}