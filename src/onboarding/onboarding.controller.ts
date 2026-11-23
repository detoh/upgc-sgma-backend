import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { RegisterOrganisationDto } from './dto/register-organisation.dto';

@Controller('onboarding')
export class OnboardingController {
  constructor(private onboardingService: OnboardingService) {}

  // Route PUBLIQUE : aucun guard JWT ici
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterOrganisationDto) {
    return this.onboardingService.register(dto);
  }
}