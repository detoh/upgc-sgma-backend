import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    console.log('✅ Connexion Prisma établie avec succès');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🔌 Connexion Prisma fermée');
  }
}