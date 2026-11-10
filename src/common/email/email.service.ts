import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private mode: string;

  constructor() {
    this.mode = process.env.EMAIL_MODE || 'DEMO';

    if (this.mode === 'PROD') {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false, // true pour port 465, false pour 587
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      // Vérifier la connexion SMTP
      this.transporter.verify((error) => {
        if (error) {
          console.error('❌ Erreur connexion SMTP:', error);
        } else {
          console.log('✅ Serveur SMTP prêt à envoyer des emails');
        }
      });
    } else {
      console.log('📧 Mode EMAIL DEMO activé (aucun email réel envoyé)');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (this.mode === 'DEMO') {
        // Mode démo : afficher dans la console
        console.log('\n═══════════════════════════════════════');
        console.log('📧 EMAIL DE DEMO (non envoyé réellement)');
        console.log('═══════════════════════════════════════');
        console.log(`📮 Destinataire : ${options.to}`);
        console.log(`📌 Sujet : ${options.subject}`);
        console.log('📄 Contenu HTML :');
        console.log(options.html.substring(0, 500) + '...');
        console.log('═══════════════════════════════════════\n');
        return true;
      }

      // Mode production : envoyer réellement
      if (!this.transporter) {
        console.error('❌ Transporter SMTP non configuré');
        return false;
      }

      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'UPGC Mutuelle <noreply@upgc.com>',
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      console.log(`✅ Email envoyé à : ${options.to}`);
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
      return false;
    }
  }
}