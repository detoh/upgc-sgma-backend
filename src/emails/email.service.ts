import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('⚠️ RESEND_API_KEY non configurée - emails désactivés');
      this.resend = null;
    } else {
      this.resend = new Resend(apiKey);
      this.logger.log('✅ Service email Resend initialisé');
    }

    this.fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL', 'onboarding@resend.dev');
    this.fromName = this.configService.get<string>('RESEND_FROM_NAME', 'SGMA');
  }

  /**
   * Envoyer un email simple
   */
  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
  }) {
    if (!this.resend) {
      this.logger.warn(`📧 [SIMULATION] Email non envoyé (Resend non configuré)`);
      this.logger.warn(`   À: ${params.to}`);
      this.logger.warn(`   Sujet: ${params.subject}`);
      return { success: false, message: 'Service email non configuré' };
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });

      if (error) {
        this.logger.error(`❌ Erreur envoi email: ${error.message}`);
        return { success: false, message: error.message };
      }

      this.logger.log(`📧 Email envoyé à ${params.to} (ID: ${data.id})`);
      return { success: true, id: data.id };
    } catch (error) {
      this.logger.error(`❌ Erreur envoi email: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Email de rappel d'expiration
   */
  async sendExpirationReminder(params: {
    to: string;
    nomOrganisation: string;
    joursRestants: number;
    dateExpiration: Date;
    lienRenouvellement: string;
  }) {
    const { to, nomOrganisation, joursRestants, dateExpiration, lienRenouvellement } = params;

    const subject = `⚠️ Votre abonnement expire dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .alert { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SGMA - Gestion Mutuelles</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      
      <p>Nous vous informons que l'abonnement de votre organisation <strong>${nomOrganisation}</strong> va expirer dans <strong>${joursRestants} jour${joursRestants > 1 ? 's' : ''}</strong>, soit le <strong>${dateExpiration.toLocaleDateString('fr-FR')}</strong>.</p>
      
      <div class="alert">
        <strong>⚠️ Important :</strong> Pour éviter toute interruption de service et la suspension de votre compte, veuillez renouveler votre abonnement dès maintenant.
      </div>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="${lienRenouvellement}" class="button">Renouveler mon abonnement</a>
      </p>
      
      <p>Si vous avez des questions ou besoin d'assistance, n'hésitez pas à nous contacter.</p>
      
      <p>Cordialement,<br>L'équipe SGMA</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par SGMA.<br>
      Ne répondez pas à cet email.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Email de confirmation de paiement
   */
  async sendPaymentConfirmation(params: {
    to: string;
    nomOrganisation: string;
    montant: number;
    plan: string;
    periode: string;
    dateExpiration: Date;
  }) {
    const { to, nomOrganisation, montant, plan, periode, dateExpiration } = params;

    const subject = `✅ Paiement confirmé - Abonnement ${plan}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .success { background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
    .details { background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0; }
    .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .details-row:last-child { border-bottom: none; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Paiement confirmé</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      
      <p>Nous avons le plaisir de vous confirmer que votre paiement a bien été reçu et votre abonnement activé.</p>
      
      <div class="success">
        <strong>Votre abonnement est maintenant actif !</strong>
      </div>
      
      <div class="details">
        <div class="details-row">
          <span><strong>Organisation :</strong></span>
          <span>${nomOrganisation}</span>
        </div>
        <div class="details-row">
          <span><strong>Plan :</strong></span>
          <span>${plan}</span>
        </div>
        <div class="details-row">
          <span><strong>Période :</strong></span>
          <span>${periode}</span>
        </div>
        <div class="details-row">
          <span><strong>Montant :</strong></span>
          <span>${montant.toLocaleString()} XOF</span>
        </div>
        <div class="details-row">
          <span><strong>Valide jusqu'au :</strong></span>
          <span>${dateExpiration.toLocaleDateString('fr-FR')}</span>
        </div>
      </div>
      
      <p>Merci pour votre confiance. Nous restons à votre disposition pour toute question.</p>
      
      <p>Cordialement,<br>L'équipe SGMA</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par SGMA.<br>
      Ne répondez pas à cet email.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Email de suspension
   */
  async sendSuspensionNotice(params: {
    to: string;
    nomOrganisation: string;
    lienRenouvellement: string;
  }) {
    const { to, nomOrganisation, lienRenouvellement } = params;

    const subject = `🚫 Votre abonnement a été suspendu`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .alert { background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SGMA - Gestion Mutuelles</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      
      <p>Nous vous informons que l'abonnement de votre organisation <strong>${nomOrganisation}</strong> a été <strong>suspendu</strong> suite à l'expiration de votre période d'abonnement.</p>
      
      <div class="alert">
        <strong>🚫 Accès suspendu :</strong> Vous ne pouvez plus accéder aux fonctionnalités de la plateforme. Vos données sont conservées en sécurité.
      </div>
      
      <p>Pour réactiver votre compte et retrouver l'accès à toutes vos données, veuillez renouveler votre abonnement dès maintenant.</p>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="${lienRenouvellement}" class="button">Réactiver mon compte</a>
      </p>
      
      <p>Si vous avez des questions ou besoin d'assistance, n'hésitez pas à nous contacter.</p>
      
      <p>Cordialement,<br>L'équipe SGMA</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par SGMA.<br>
      Ne répondez pas à cet email.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({ to, subject, html });
  }
}