import { Injectable, BadRequestException } from '@nestjs/common';
import { RelanceDto, MembreRelanceDto } from './dto/relance.dto';

// Configuration (à modifier pour le mode réel)
const CONFIG = {
  MODE_DEMO: true, // 👈 Passer à false pour activer l'envoi réel
  NOM_MUTUELLE: 'UPGC MUTUELLE',
  TELEPHONE_MUTUELLE: '+225 07 00 00 00 00',
  EMAIL_MUTUELLE: 'contact@upgc-mutuelle.ci',
  EMAIL_EXPEDITEUR: 'noreply@upgc-mutuelle.ci',
};

@Injectable()
export class NotificationsService {
  // Historique des envois (en mémoire pour le mode démo)
  private historique: any[] = [];

  // ==========================================
  // GÉNÉRER LE MESSAGE EMAIL
  // ==========================================
  genererMessageEmail(membre: MembreRelanceDto): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; background: #f9fafb; border-radius: 0 0 8px 8px; }
    .alert { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; border-radius: 4px; }
    .montant { font-size: 24px; font-weight: bold; color: #dc2626; }
    .footer { text-align: center; padding: 15px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${CONFIG.NOM_MUTUELLE}</h1>
      <p>Rappel de paiement de cotisations</p>
    </div>
    <div class="content">
      <p>Cher(e) <strong>${membre.prenom} ${membre.nom}</strong>,</p>
      
      <p>Nous espérons que vous vous portez bien. Nous nous permettons de vous contacter concernant vos cotisations à la mutuelle.</p>
      
      <div class="alert">
        <p><strong>⚠️ Situation de votre compte :</strong></p>
        <ul>
          <li>Trimestres impayés : <strong>${membre.trimestresManquants}</strong></li>
          <li>Montant total dû : <span class="montant">${membre.montantDu.toLocaleString()} FCFA</span></li>
        </ul>
      </div>
      
      <p>Nous vous invitons à régulariser votre situation dans les plus brefs délais afin de continuer à bénéficier des prestations de la mutuelle.</p>
      
      <p><strong>Modalités de paiement :</strong></p>
      <ul>
        <li>📍 Au siège de la mutuelle</li>
        <li>📞 Contact : ${CONFIG.TELEPHONE_MUTUELLE}</li>
        <li>✉️ Email : ${CONFIG.EMAIL_MUTUELLE}</li>
      </ul>
      
      <p>Merci de votre compréhension et de votre fidélité.</p>
      
      <p>Cordialement,<br><strong>Le Bureau de la Mutuelle</strong></p>
    </div>
    <div class="footer">
      <p>Ceci est un message automatique, merci de ne pas y répondre.</p>
      <p>${CONFIG.NOM_MUTUELLE} - ${CONFIG.EMAIL_MUTUELLE}</p>
    </div>
  </div>
</body>
</html>`;
  }

  // ==========================================
  // GÉNÉRER LE MESSAGE SMS
  // ==========================================
  genererMessageSMS(membre: MembreRelanceDto): string {
    return `Cher(e) ${membre.prenom} ${membre.nom}, ` +
      `votre compte ${CONFIG.NOM_MUTUELLE} présente ${membre.trimestresManquants} trimestre(s) impayé(s) ` +
      `pour un montant de ${membre.montantDu.toLocaleString()} FCFA. ` +
      `Merci de régulariser votre situation. ` +
      `Contact: ${CONFIG.TELEPHONE_MUTUELLE}`;
  }

  // ==========================================
  // ENVOYER LES RELANCES
  // ==========================================
  async envoyerRelances(dto: RelanceDto) {
    if (!dto.membres || dto.membres.length === 0) {
      throw new BadRequestException('Aucun membre sélectionné');
    }

    const resultats = {
      total: dto.membres.length,
      emailsEnvoyes: 0,
      smsEnvoyes: 0,
      erreurs: [] as string[],
      modeDemo: CONFIG.MODE_DEMO,
    };

    for (const membre of dto.membres) {
      try {
        // Envoi EMAIL
        if (dto.type === 'EMAIL' || dto.type === 'LES_DEUX') {
          if (!membre.email) {
            resultats.erreurs.push(`${membre.nom} ${membre.prenom} : pas d'email`);
          } else {
            await this.envoyerEmail(membre);
            resultats.emailsEnvoyes++;
          }
        }

        // Envoi SMS
        if (dto.type === 'SMS' || dto.type === 'LES_DEUX') {
          if (!membre.telephone) {
            resultats.erreurs.push(`${membre.nom} ${membre.prenom} : pas de téléphone`);
          } else {
            await this.envoyerSMS(membre);
            resultats.smsEnvoyes++;
          }
        }
      } catch (error: any) {
        resultats.erreurs.push(`${membre.nom} ${membre.prenom} : ${error.message}`);
      }
    }

    // Enregistrer dans l'historique
    this.historique.unshift({
      date: new Date(),
      type: dto.type,
      total: resultats.total,
      emailsEnvoyes: resultats.emailsEnvoyes,
      smsEnvoyes: resultats.smsEnvoyes,
      erreurs: resultats.erreurs.length,
    });

    return resultats;
  }

  // ==========================================
  // ENVOYER UN EMAIL (MODE DÉMO OU RÉEL)
  // ==========================================
  private async envoyerEmail(membre: MembreRelanceDto): Promise<void> {
    const message = this.genererMessageEmail(membre);

    if (CONFIG.MODE_DEMO) {
      // Mode démo : simuler l'envoi
      console.log('═══════════════════════════════════════');
      console.log('📧 EMAIL DE RELANCE (MODE DÉMO)');
      console.log('═══════════════════════════════════════');
      console.log(`À : ${membre.email}`);
      console.log(`Sujet : Rappel de paiement - ${CONFIG.NOM_MUTUELLE}`);
      console.log(`Membre : ${membre.prenom} ${membre.nom}`);
      console.log(`Montant dû : ${membre.montantDu.toLocaleString()} FCFA`);
      console.log('═══════════════════════════════════════');
      
      // Simuler un délai d'envoi
      await new Promise(resolve => setTimeout(resolve, 500));
      return;
    }

    // Mode réel : envoyer via Nodemailer
    // const nodemailer = require('nodemailer');
    // const transporter = nodemailer.createTransport({
    //   host: 'smtp.gmail.com',
    //   port: 587,
    //   secure: false,
    //   auth: {
    //     user: process.env.EMAIL_USER,
    //     pass: process.env.EMAIL_PASSWORD,
    //   },
    // });
    // 
    // await transporter.sendMail({
    //   from: CONFIG.EMAIL_EXPEDITEUR,
    //   to: membre.email,
    //   subject: `Rappel de paiement - ${CONFIG.NOM_MUTUELLE}`,
    //   html: message,
    // });
  }

  // ==========================================
  // ENVOYER UN SMS (MODE DÉMO OU RÉEL)
  // ==========================================
  private async envoyerSMS(membre: MembreRelanceDto): Promise<void> {
    const message = this.genererMessageSMS(membre);

    if (CONFIG.MODE_DEMO) {
      // Mode démo : simuler l'envoi
      console.log('═══════════════════════════════════════');
      console.log('📱 SMS DE RELANCE (MODE DÉMO)');
      console.log('═══════════════════════════════════════');
      console.log(`À : ${membre.telephone}`);
      console.log(`Membre : ${membre.prenom} ${membre.nom}`);
      console.log(`Message : ${message}`);
      console.log('═══════════════════════════════════════');
      
      // Simuler un délai d'envoi
      await new Promise(resolve => setTimeout(resolve, 300));
      return;
    }

    // Mode réel : envoyer via Twilio ou Orange SMS API
    // Exemple avec Twilio :
    // const twilio = require('twilio');
    // const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    // 
    // await client.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_PHONE,
    //   to: membre.telephone,
    // });
  }

  // ==========================================
  // HISTORIQUE DES ENVOIS
  // ==========================================
  getHistorique() {
    return this.historique;
  }

  // ==========================================
  // PRÉVISUALISATION DU MESSAGE
  // ==========================================
  previsualiserMessage(membre: MembreRelanceDto, type: 'EMAIL' | 'SMS') {
    if (type === 'EMAIL') {
      return this.genererMessageEmail(membre);
    }
    return this.genererMessageSMS(membre);
  }
}