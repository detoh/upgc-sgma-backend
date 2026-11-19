import { Controller, Get, Post, Patch, Delete, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { NotificationsInAppService } from './notifications-inapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleUtilisateur } from '@prisma/client';

@Controller('notifications-inapp')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleUtilisateur.SUPER_ADMIN,RoleUtilisateur.ADMIN, RoleUtilisateur.GESTIONNAIRE, RoleUtilisateur.CAISSIER, RoleUtilisateur.MEMBRE)
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