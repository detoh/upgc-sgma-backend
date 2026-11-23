import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CinetpayService {
  private readonly logger = new Logger(CinetpayService.name);
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly siteId: string;
  private readonly baseUrl: string;
  private readonly notifyUrl: string;
  private readonly returnUrl: string;
  private readonly isSandbox: boolean;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('CINETPAY_API_KEY', '');
    this.secretKey = this.configService.get<string>('CINETPAY_SECRET_KEY', '');
    this.siteId = this.configService.get<string>('CINETPAY_SITE_ID', '');
    this.baseUrl = this.configService.get<string>('CINETPAY_BASE_URL', 'https://api-sandbox.cinetpay.com/v1');
    this.notifyUrl = this.configService.get<string>('CINETPAY_NOTIFY_URL', 'http://localhost:3000/billing/cinetpay/webhook');
    this.returnUrl = this.configService.get<string>('CINETPAY_RETURN_URL', 'http://localhost:3001/dashboard/billing/historique');
    
    // Mode simulation si pas de clés API
    this.isSandbox = !this.apiKey || !this.secretKey || !this.siteId;
    
    if (this.isSandbox) {
      this.logger.warn('⚠️ CinetPay en MODE SIMULATION (clés API non configurées)');
    } else {
      this.logger.log('✅ CinetPay configuré avec clés API réelles');
    }
  }

  /**
   * Initialiser un paiement Mobile Money
   */
  async initializePayment(params: {
    transactionId: string;
    montant: number;
    description: string;
    numeroTelephone: string;
    currency: string;
  }) {
    const { transactionId, montant, description, numeroTelephone, currency } = params;

    this.logger.log(`📱 Initialisation paiement: ${transactionId} - ${montant} ${currency}`);

    // MODE SIMULATION
    if (this.isSandbox) {
      this.logger.log('🎭 [SIMULATION] Paiement simulé avec succès');
      
      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        paymentUrl: `http://localhost:3001/dashboard/billing/simuler-paiement?ref=${transactionId}&montant=${montant}`,
        transactionId: transactionId,
      };
    }

    // MODE RÉEL (quand tu auras tes clés)
    try {
      const axios = require('axios');
      
      const payload = {
        apikey: this.apiKey,
        site_id: this.siteId,
        transaction_id: transactionId,
        amount: montant.toString(),
        currency: currency,
        description: description,
        notify_url: this.notifyUrl,
        return_url: this.returnUrl,
        customer_name: 'Client',
        customer_phone_number: numeroTelephone,
        channels: 'MOBILE_MONEY',
      };

      const response = await axios.post(`${this.baseUrl}/payment`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.data.code === '00') {
        return {
          success: true,
          paymentUrl: response.data.data.payment_url,
          transactionId: response.data.data.transaction_id,
        };
      } else {
        throw new BadRequestException(response.data.message || 'Erreur CinetPay');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error('Erreur CinetPay:', message);
      throw new BadRequestException('Erreur de communication avec CinetPay');
    }
  }

  /**
   * Simuler la confirmation d'un paiement (pour les tests)
   */
  async simulatePaymentConfirmation(transactionId: string) {
    this.logger.log(`🎭 [SIMULATION] Confirmation du paiement: ${transactionId}`);
    
    return {
      success: true,
      status: 'ACCEPTED',
      transactionId,
    };
  }
}