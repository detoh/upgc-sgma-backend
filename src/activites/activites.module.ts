import { Module } from '@nestjs/common';
import { ActivitesController } from './activites.controller';
import { ActivitesService } from './activites.service';

@Module({
  controllers: [ActivitesController],
  providers: [ActivitesService],
  exports: [ActivitesService],
})
export class ActivitesModule {}