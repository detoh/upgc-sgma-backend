import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

@Global() // Module global pour être accessible partout
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}