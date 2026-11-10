import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto, TypeNotification } from './dto/create-notification.dto';

@Injectable()
export class NotificationsInAppService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateNotificationDto) {
    return this.prisma.notificationInApp.create({
      data: {
        userId: BigInt(dto.userId),
        titre: dto.titre,
        message: dto.message,
        type: dto.type,
        lien: dto.lien,
      },
    });
  }

  async createForMultipleUsers(userIds: number[], titre: string, message: string, type: TypeNotification, lien?: string) {
    const notifications = userIds.map(userId => ({
      userId: BigInt(userId),
      titre,
      message,
      type,
      lien,
    }));

    return this.prisma.notificationInApp.createMany({
      data: notifications,
    });
  }

  async findAllForUser(userId: bigint, limit = 20) {
    return this.prisma.notificationInApp.findMany({
      where: { userId },
      orderBy: { dateCreation: 'desc' },
      take: limit,
    });
  }

  async countNonLues(userId: bigint) {
    return this.prisma.notificationInApp.count({
      where: { userId, lue: false },
    });
  }

  async marquerCommeLue(id: bigint, userId: bigint) {
    return this.prisma.notificationInApp.updateMany({
      where: { id, userId },
      data: { lue: true, dateLecture: new Date() },
    });
  }

  async marquerToutesCommeLues(userId: bigint) {
    return this.prisma.notificationInApp.updateMany({
      where: { userId, lue: false },
      data: { lue: true, dateLecture: new Date() },
    });
  }

  async supprimer(id: bigint, userId: bigint) {
    return this.prisma.notificationInApp.deleteMany({
      where: { id, userId },
    });
  }
}