import { Module } from '@nestjs/common';
import { RapportsController } from './rapports.controller';
import { RapportsService } from './rapports.service';
import { RapportsExportService } from './rapports-export.service';
import { PrismaModule } from '../prisma/prisma.module';


@Module({
  imports: [PrismaModule],
  controllers: [RapportsController],
  providers: [RapportsService, RapportsExportService],
})
export class RapportsModule {}