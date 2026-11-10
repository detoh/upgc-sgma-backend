// ==========================================
// TEMPLATE : PRESTATION VALIDÉE
// ==========================================
export function templatePrestationValidee(data: {
  membrePrenom: string;
  membreNom: string;
  typePrestation: string;
  montant: number;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { padding: 30px 20px; background: #f9fafb; border-radius: 0 0 12px 12px; }
    .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .montant { font-size: 28px; font-weight: bold; color: #059669; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Prestation validée</h1>
      <p>UPGC Mutuelle</p>
    </div>
    <div class="content">
      <p>Cher(e) <strong>${data.membrePrenom} ${data.membreNom}</strong>,</p>

      <div class="success-box">
        <p><strong>Bonne nouvelle !</strong></p>
        <p>Votre demande de prestation a été <strong>validée</strong> par le bureau de la mutuelle.</p>
      </div>

      <p><strong>Détails de la prestation :</strong></p>
      <ul>
        <li>Type : <strong>${data.typePrestation}</strong></li>
        <li>Montant : <span class="montant">${data.montant.toLocaleString()} XOF</span></li>
      </ul>

      <p>Le paiement sera effectué prochainement. Vous recevrez une notification dès que le versement sera effectué.</p>

      <p>Cordialement,<br><strong>Le Bureau de la Mutuelle UPGC</strong></p>
    </div>
    <div class="footer">
      <p>Ceci est un message automatique, merci de ne pas y répondre.</p>
      <p>UPGC Mutuelle © 2026</p>
    </div>
  </div>
</body>
</html>`;
}

// ==========================================
// TEMPLATE : PRESTATION PAYÉE
// ==========================================
export function templatePrestationPayee(data: {
  membrePrenom: string;
  membreNom: string;
  typePrestation: string;
  montant: number;
  modePaiement: string;
  reference?: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { padding: 30px 20px; background: #f9fafb; border-radius: 0 0 12px 12px; }
    .success-box { background: #ede9fe; border-left: 4px solid #a855f7; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .montant { font-size: 28px; font-weight: bold; color: #7c3aed; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Prestation payée</h1>
      <p>UPGC Mutuelle</p>
    </div>
    <div class="content">
      <p>Cher(e) <strong>${data.membrePrenom} ${data.membreNom}</strong>,</p>

      <div class="success-box">
        <p><strong>Votre prestation a été payée !</strong></p>
      </div>

      <p><strong>Détails du paiement :</strong></p>
      <ul>
        <li>Type : <strong>${data.typePrestation}</strong></li>
        <li>Montant : <span class="montant">${data.montant.toLocaleString()} XOF</span></li>
        <li>Mode de paiement : <strong>${data.modePaiement}</strong></li>
        ${data.reference ? `<li>Référence : <strong>${data.reference}</strong></li>` : ''}
      </ul>

      <p>Merci pour votre confiance. Nous restons à votre disposition pour toute question.</p>

      <p>Cordialement,<br><strong>Le Bureau de la Mutuelle UPGC</strong></p>
    </div>
    <div class="footer">
      <p>Ceci est un message automatique, merci de ne pas y répondre.</p>
      <p>UPGC Mutuelle © 2026</p>
    </div>
  </div>
</body>
</html>`;
}

// ==========================================
// TEMPLATE : PRESTATION REJETÉE
// ==========================================
export function templatePrestationRejetee(data: {
  membrePrenom: string;
  membreNom: string;
  typePrestation: string;
  motif?: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { padding: 30px 20px; background: #f9fafb; border-radius: 0 0 12px 12px; }
    .error-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ Prestation rejetée</h1>
      <p>UPGC Mutuelle</p>
    </div>
    <div class="content">
      <p>Cher(e) <strong>${data.membrePrenom} ${data.membreNom}</strong>,</p>

      <div class="error-box">
        <p><strong>Votre demande de prestation a été rejetée.</strong></p>
        ${data.motif ? `<p><strong>Motif :</strong> ${data.motif}</p>` : ''}
      </div>

      <p>Type de demande : <strong>${data.typePrestation}</strong></p>

      <p>Si vous estimez que cette décision est injustifiée, vous pouvez contacter le bureau de la mutuelle pour plus d'informations.</p>

      <p>Cordialement,<br><strong>Le Bureau de la Mutuelle UPGC</strong></p>
    </div>
    <div class="footer">
      <p>Ceci est un message automatique, merci de ne pas y répondre.</p>
      <p>UPGC Mutuelle © 2026</p>
    </div>
  </div>
</body>
</html>`;
}