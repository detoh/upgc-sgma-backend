import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RapportsService } from './rapports.service';
import PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';

@Injectable()
export class RapportsExportService {
  private readonly logger = new Logger(RapportsExportService.name);

  constructor(
    private prisma: PrismaService,
    private rapportsService: RapportsService,
  ) {}

  // ==========================================
  // HELPERS COMMUNS
  // ==========================================
  private async getMutuelleInfo(organisationId: bigint | null) {
    const where = organisationId === null ? {} : { organisationId };
    const parametres = await this.prisma.parametre.findFirst({ where });
    return {
      nom: parametres?.nomMutuelle || 'Mutuelle',
      devise: parametres?.devise || 'XOF',
      adresse: parametres?.adresse || '',
      telephone: parametres?.telephone || '',
      email: parametres?.email || '',
    };
  }

  private fmt(montant: number, devise: string): string {
    return `${montant.toLocaleString('fr-FR')} ${devise}`;
  }

  private entetePdf(doc: any, mutuelle: any, titre: string, sousTitre: string) {
    doc.fontSize(18).fillColor('#1d4ed8').text(mutuelle.nom, 50, 45);
    const coords = [mutuelle.adresse, mutuelle.telephone, mutuelle.email]
      .filter(Boolean)
      .join('  •  ');
    if (coords) doc.fontSize(9).fillColor('#6b7280').text(coords, 50, 68);
    doc.fontSize(14).fillColor('#111111').text(titre, 50, 92);
    doc.fontSize(10).fillColor('#374151').text(sousTitre, 50, 110);
    doc
      .fontSize(8)
      .fillColor('#9ca3af')
      .text(
        `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} par SGMA`,
        50,
        126,
      );
    doc.y = 150;
  }

  private drawTable(doc: any, columns: any[], rows: any[], startX = 50) {
    const rowHeight = 20;
    const totalWidth = columns.reduce((s, c) => s + c.width, 0);
    const pageBottom = doc.page.height - 60;
    let y = doc.y;

    const drawHeader = () => {
      let x = startX;
      doc.rect(startX, y, totalWidth, rowHeight).fill('#2563eb');
      columns.forEach((col) => {
        doc
          .fillColor('#ffffff')
          .fontSize(8)
          .text(col.header, x + 3, y + 6, { width: col.width - 6, lineBreak: false });
        x += col.width;
      });
      y += rowHeight;
    };

    drawHeader();

    rows.forEach((row, i) => {
      if (y + rowHeight > pageBottom) {
        doc.addPage();
        y = 50;
        drawHeader();
      }

      if (i % 2 === 0) {
        doc.rect(startX, y, totalWidth, rowHeight).fill('#f3f4f6');
      }

      let x = startX;
      columns.forEach((col) => {
        const valeur = row[col.key];
        doc
          .fillColor(row._bold ? '#111111' : '#374151')
          .fontSize(8)
          .text(valeur === undefined || valeur === null ? '' : String(valeur), x + 3, y + 6, {
            width: col.width - 6,
            lineBreak: false,
            align: col.align || 'left',
          });
        x += col.width;
      });
      y += rowHeight;
    });

    doc.fillColor('#000000');
    doc.y = y + 12;
  }

  // ==========================================
  // EXPORT RAPPORT FINANCIER ANNUEL — PDF
  // ==========================================
  async exportRapportFinancierPdf(organisationId: bigint | null, annee: number, res: any) {
    const rapport = await this.rapportsService.getRapportFinancierAnnuel(organisationId, annee);
    const mutuelle = await this.getMutuelleInfo(organisationId);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rapport-financier-${annee}.pdf"`);
    doc.pipe(res);

    this.entetePdf(doc, mutuelle, `Rapport financier annuel ${annee}`, 'Synthèse des recettes, dépenses et solde de l\'exercice');

    // Tableau principal
    const rows = [
      { libelle: 'Cotisations payées', montant: this.fmt(rapport.cotisations.totalPayees, mutuelle.devise) },
      { libelle: `Dons reçus (${rapport.dons.nombre} don(s))`, montant: this.fmt(rapport.dons.total, mutuelle.devise) },
      { libelle: 'TOTAL RECETTES', montant: this.fmt(rapport.resume.totalRecettes, mutuelle.devise), _bold: true },
      { libelle: 'Prestations payées', montant: this.fmt(rapport.prestations.totalPayees, mutuelle.devise) },
      { libelle: 'TOTAL DÉPENSES', montant: this.fmt(rapport.resume.totalDepenses, mutuelle.devise), _bold: true },
      { libelle: `SOLDE DE L'EXERCICE ${annee}`, montant: this.fmt(rapport.resume.solde, mutuelle.devise), _bold: true },
    ];

    this.drawTable(doc, [
      { header: 'Libellé', width: 330, key: 'libelle' },
      { header: 'Montant', width: 165, key: 'montant', align: 'right' },
    ], rows);

    // Indicateurs
    doc.fontSize(12).fillColor('#111111').text('Indicateurs', 50, doc.y);
    doc.moveDown(0.4);

    const indicateurs = [
      { libelle: 'Membres actifs', valeur: String(rapport.membres.totalActifs) },
      { libelle: `Nouveaux membres en ${annee}`, valeur: String(rapport.membres.nouveaux) },
      { libelle: 'Cotisations payées / total', valeur: `${rapport.cotisations.nombrePayees} / ${rapport.cotisations.nombre}` },
      { libelle: 'Cotisations en attente / retard', valeur: this.fmt(rapport.cotisations.totalEnAttente, mutuelle.devise) },
      { libelle: 'Prestations en attente', valeur: this.fmt(rapport.prestations.totalEnAttente, mutuelle.devise) },
    ];

    this.drawTable(doc, [
      { header: 'Indicateur', width: 330, key: 'libelle' },
      { header: 'Valeur', width: 165, key: 'valeur', align: 'right' },
    ], indicateurs);

    doc
      .fontSize(8)
      .fillColor('#9ca3af')
      .text('Document généré automatiquement par SGMA - sgma-mutuelle.com', 50, doc.page.height - 40, {
        width: 495,
        align: 'center',
      });

    doc.end();
    this.logger.log(`📄 Export PDF rapport financier ${annee}`);
  }

  // ==========================================
  // EXPORT RAPPORT FINANCIER ANNUEL — EXCEL
  // ==========================================
  async exportRapportFinancierExcel(organisationId: bigint | null, annee: number, res: any) {
    const rapport = await this.rapportsService.getRapportFinancierAnnuel(organisationId, annee);
    const mutuelle = await this.getMutuelleInfo(organisationId);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SGMA';

    const ws = workbook.addWorksheet(`Financier ${annee}`);
    ws.columns = [
      { header: 'Libellé', key: 'libelle', width: 45 },
      { header: 'Valeur', key: 'valeur', width: 25 },
    ];

    const lignes = [
      { libelle: 'Mutuelle', valeur: mutuelle.nom },
      { libelle: 'Exercice', valeur: annee },
      { libelle: '', valeur: '' },
      { libelle: 'RECETTES', valeur: '' },
      { libelle: 'Cotisations payées', valeur: rapport.cotisations.totalPayees },
      { libelle: 'Dons reçus', valeur: rapport.dons.total },
      { libelle: 'TOTAL RECETTES', valeur: rapport.resume.totalRecettes },
      { libelle: '', valeur: '' },
      { libelle: 'DÉPENSES', valeur: '' },
      { libelle: 'Prestations payées', valeur: rapport.prestations.totalPayees },
      { libelle: 'TOTAL DÉPENSES', valeur: rapport.resume.totalDepenses },
      { libelle: '', valeur: '' },
      { libelle: `SOLDE DE L'EXERCICE`, valeur: rapport.resume.solde },
      { libelle: '', valeur: '' },
      { libelle: 'Membres actifs', valeur: rapport.membres.totalActifs },
      { libelle: `Nouveaux membres ${annee}`, valeur: rapport.membres.nouveaux },
      { libelle: 'Cotisations payées / total', valeur: `${rapport.cotisations.nombrePayees} / ${rapport.cotisations.nombre}` },
      { libelle: 'Cotisations en attente / retard', valeur: rapport.cotisations.totalEnAttente },
      { libelle: 'Prestations en attente', valeur: rapport.prestations.totalEnAttente },
    ];

    lignes.forEach((l) => ws.addRow(l));

    // Styles
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    [4, 7, 9, 11, 13].forEach((n) => {
      ws.getRow(n).font = { bold: true };
    });
    ws.getRow(13).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };

    // Format monétaire
    ws.getColumn(2).numFmt = '#,##0';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="rapport-financier-${annee}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
    this.logger.log(`📊 Export Excel rapport financier ${annee}`);
  }
    // ==========================================
  // 5. RAPPORT COTISATIONS — PDF
  // ==========================================
  async exportRapportCotisationsPdf(organisationId: bigint | null, dateDebut: string, dateFin: string, res: any) {
    const rapport = await this.rapportsService.getRapportCotisations(organisationId, dateDebut, dateFin);
    const mutuelle = await this.getMutuelleInfo(organisationId);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rapport-cotisations-${dateDebut}_a_${dateFin}.pdf"`);
    doc.pipe(res);

    this.entetePdf(
      doc,
      mutuelle,
      'Rapport des cotisations',
      `Période du ${new Date(dateDebut).toLocaleDateString('fr-FR')} au ${new Date(dateFin).toLocaleDateString('fr-FR')}`,
    );

    // --- Tableau récap par statut ---
    const resume = [
      { statut: 'Cotisations payées', nombre: String(rapport.parStatut.PAYEE.nombre), montant: this.fmt(rapport.parStatut.PAYEE.montant, mutuelle.devise) },
      { statut: 'En attente', nombre: String(rapport.parStatut.EN_ATTENTE.nombre), montant: this.fmt(rapport.parStatut.EN_ATTENTE.montant, mutuelle.devise) },
      { statut: 'En retard', nombre: String(rapport.parStatut.EN_RETARD.nombre), montant: this.fmt(rapport.parStatut.EN_RETARD.montant, mutuelle.devise) },
      { statut: 'TOTAL', nombre: String(rapport.total), montant: this.fmt(rapport.totalMontant, mutuelle.devise), _bold: true },
    ];

    this.drawTable(doc, [
      { header: 'Statut', width: 200, key: 'statut' },
      { header: 'Nombre', width: 100, key: 'nombre', align: 'center' },
      { header: 'Montant', width: 195, key: 'montant', align: 'right' },
    ], resume);

    // --- Répartition par mode de paiement ---
    doc.fontSize(11).fillColor('#111111').text('Répartition par mode de paiement', 50, doc.y);
    doc.moveDown(0.3);

    const modes = Object.entries(rapport.parModePaiement).map(([mode, montant]: any) => ({
      mode,
      montant: this.fmt(montant, mutuelle.devise),
    }));
    if (modes.length === 0) {
      doc.fontSize(9).fillColor('#6b7280').text('Aucun paiement enregistré sur cette période');
      doc.moveDown(1);
    } else {
      this.drawTable(doc, [
        { header: 'Mode de paiement', width: 250, key: 'mode' },
        { header: 'Montant', width: 245, key: 'montant', align: 'right' },
      ], modes);
    }

    // --- Liste détaillée (limitée à 50 lignes pour lisibilité) ---
    doc.fontSize(11).fillColor('#111111').text('Détail des cotisations', 50, doc.y);
    doc.moveDown(0.3);

    const lignes = rapport.details.slice(0, 50).map((c: any) => ({
      membre: `${c.membre.prenom} ${c.membre.nom}`,
      type: c.typeCotisation.libelle,
      periode: c.periode,
      montant: `${Number(c.montant).toLocaleString('fr-FR')}`,
      statut: c.statut,
    }));

    this.drawTable(doc, [
      { header: 'Membre', width: 140, key: 'membre' },
      { header: 'Type', width: 110, key: 'type' },
      { header: 'Période', width: 80, key: 'periode' },
      { header: 'Montant', width: 90, key: 'montant', align: 'right' },
      { header: 'Statut', width: 75, key: 'statut' },
    ], lignes);

    if (rapport.details.length > 50) {
      doc.fontSize(8).fillColor('#6b7280').text(`... et ${rapport.details.length - 50} cotisation(s) non affichée(s) (utilisez l'export Excel pour la liste complète)`);
    }

    doc.end();
    this.logger.log(`📄 Export PDF cotisations (${rapport.total} cotisations)`);
  }

  // ==========================================
  // 6. RAPPORT COTISATIONS — EXCEL
  // ==========================================
  async exportRapportCotisationsExcel(organisationId: bigint | null, dateDebut: string, dateFin: string, res: any) {
    const rapport = await this.rapportsService.getRapportCotisations(organisationId, dateDebut, dateFin);
    const mutuelle = await this.getMutuelleInfo(organisationId);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SGMA';

    // Feuille 1 : Détail
    const ws = workbook.addWorksheet('Cotisations', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = [
      { header: 'N°', key: 'num', width: 6 },
      { header: 'Matricule', key: 'matricule', width: 14 },
      { header: 'Membre', key: 'membre', width: 28 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Période', key: 'periode', width: 12 },
      { header: 'Montant', key: 'montant', width: 14 },
      { header: 'Mode', key: 'mode', width: 14 },
      { header: 'Date paiement', key: 'date', width: 14 },
      { header: 'Statut', key: 'statut', width: 12 },
    ];

    rapport.details.forEach((c: any, i: number) =>
      ws.addRow({
        num: i + 1,
        matricule: c.membre.matricule || '-',
        membre: `${c.membre.prenom} ${c.membre.nom}`,
        type: c.typeCotisation.libelle,
        periode: c.periode,
        montant: Number(c.montant),
        mode: c.modePaiement || '-',
        date: c.datePaiement ? new Date(c.datePaiement).toLocaleDateString('fr-FR') : '-',
        statut: c.statut,
      }),
    );

    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    ws.getColumn(6).numFmt = '#,##0';
    ws.autoFilter = { from: 'A1', to: 'I1' };

    // Feuille 2 : Résumé
    const ws2 = workbook.addWorksheet('Résumé');
    ws2.columns = [
      { header: 'Libellé', key: 'libelle', width: 35 },
      { header: 'Valeur', key: 'valeur', width: 20 },
    ];
    ws2.addRow({ libelle: 'Mutuelle', valeur: mutuelle.nom });
    ws2.addRow({ libelle: 'Période', valeur: `${dateDebut} au ${dateFin}` });
    ws2.addRow({ libelle: '', valeur: '' });
    ws2.addRow({ libelle: 'Cotisations payées', valeur: rapport.parStatut.PAYEE.montant });
    ws2.addRow({ libelle: 'Cotisations en attente', valeur: rapport.parStatut.EN_ATTENTE.montant });
    ws2.addRow({ libelle: 'Cotisations en retard', valeur: rapport.parStatut.EN_RETARD.montant });
    ws2.addRow({ libelle: 'TOTAL', valeur: rapport.totalMontant });
    ws2.addRow({ libelle: '', valeur: '' });
    ws2.addRow({ libelle: 'Nombre total de cotisations', valeur: rapport.total });

    ws2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    ws2.getRow(8).font = { bold: true };
    ws2.getRow(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    ws2.getColumn(2).numFmt = '#,##0';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="rapport-cotisations-${dateDebut}_a_${dateFin}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
    this.logger.log(`📊 Export Excel cotisations (${rapport.total} cotisations)`);
  }

  // ==========================================
  // 7. RAPPORT PRESTATIONS — PDF
  // ==========================================
  async exportRapportPrestationsPdf(organisationId: bigint | null, dateDebut: string, dateFin: string, res: any) {
    const rapport = await this.rapportsService.getRapportPrestations(organisationId, dateDebut, dateFin);
    const mutuelle = await this.getMutuelleInfo(organisationId);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rapport-prestations-${dateDebut}_a_${dateFin}.pdf"`);
    doc.pipe(res);

    this.entetePdf(
      doc,
      mutuelle,
      'Rapport des prestations',
      `Période du ${new Date(dateDebut).toLocaleDateString('fr-FR')} au ${new Date(dateFin).toLocaleDateString('fr-FR')}`,
    );

    // Résumé par statut
    const resume = [
      { statut: 'En attente', nombre: String(rapport.parStatut.EN_ATTENTE), montant: '-' },
      { statut: 'Validées', nombre: String(rapport.parStatut.VALIDEE), montant: '-' },
      { statut: 'Rejetées', nombre: String(rapport.parStatut.REJETEE), montant: '-' },
      { statut: 'Payées', nombre: String(rapport.parStatut.PAYEE), montant: '-' },
      { statut: 'TOTAL', nombre: String(rapport.total), montant: this.fmt(rapport.totalMontant, mutuelle.devise), _bold: true },
    ];
    this.drawTable(doc, [
      { header: 'Statut', width: 250, key: 'statut' },
      { header: 'Nombre', width: 100, key: 'nombre', align: 'center' },
      { header: 'Montant', width: 145, key: 'montant', align: 'right' },
    ], resume);

    // Répartition par type
    doc.fontSize(11).fillColor('#111111').text('Répartition par type de prestation', 50, doc.y);
    doc.moveDown(0.3);

    const types = Object.entries(rapport.parType).map(([type, data]: any) => ({
      type,
      nombre: String(data.nombre),
      montant: this.fmt(data.montant, mutuelle.devise),
    }));
    if (types.length === 0) {
      doc.fontSize(9).fillColor('#6b7280').text('Aucune prestation enregistrée');
      doc.moveDown(1);
    } else {
      this.drawTable(doc, [
        { header: 'Type', width: 250, key: 'type' },
        { header: 'Nombre', width: 100, key: 'nombre', align: 'center' },
        { header: 'Montant', width: 145, key: 'montant', align: 'right' },
      ], types);
    }

    // Liste détaillée
    doc.fontSize(11).fillColor('#111111').text('Détail des prestations', 50, doc.y);
    doc.moveDown(0.3);

    const lignes = rapport.details.slice(0, 50).map((p: any) => ({
      membre: `${p.membre.prenom} ${p.membre.nom}`,
      type: p.typePrestation,
      date: new Date(p.dateEvenement).toLocaleDateString('fr-FR'),
      montant: `${Number(p.montant).toLocaleString('fr-FR')}`,
      statut: p.statut,
    }));

    this.drawTable(doc, [
      { header: 'Membre', width: 140, key: 'membre' },
      { header: 'Type', width: 110, key: 'type' },
      { header: 'Date', width: 80, key: 'date' },
      { header: 'Montant', width: 90, key: 'montant', align: 'right' },
      { header: 'Statut', width: 75, key: 'statut' },
    ], lignes);

    if (rapport.details.length > 50) {
      doc.fontSize(8).fillColor('#6b7280').text(`... et ${rapport.details.length - 50} prestation(s) non affichée(s)`);
    }

    doc.end();
    this.logger.log(`📄 Export PDF prestations (${rapport.total} prestations)`);
  }

  // ==========================================
  // 8. RAPPORT PRESTATIONS — EXCEL
  // ==========================================
  async exportRapportPrestationsExcel(organisationId: bigint | null, dateDebut: string, dateFin: string, res: any) {
    const rapport = await this.rapportsService.getRapportPrestations(organisationId, dateDebut, dateFin);
    const mutuelle = await this.getMutuelleInfo(organisationId);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SGMA';

    const ws = workbook.addWorksheet('Prestations', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = [
      { header: 'N°', key: 'num', width: 6 },
      { header: 'Matricule', key: 'matricule', width: 14 },
      { header: 'Membre', key: 'membre', width: 28 },
      { header: 'Type', key: 'type', width: 22 },
      { header: 'Date événement', key: 'date', width: 14 },
      { header: 'Montant', key: 'montant', width: 14 },
      { header: 'Statut', key: 'statut', width: 12 },
    ];

    rapport.details.forEach((p: any, i: number) =>
      ws.addRow({
        num: i + 1,
        matricule: p.membre.matricule || '-',
        membre: `${p.membre.prenom} ${p.membre.nom}`,
        type: p.typePrestation,
        date: new Date(p.dateEvenement).toLocaleDateString('fr-FR'),
        montant: Number(p.montant),
        statut: p.statut,
      }),
    );

    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    ws.getColumn(6).numFmt = '#,##0';
    ws.autoFilter = { from: 'A1', to: 'G1' };

    // Feuille résumé
    const ws2 = workbook.addWorksheet('Résumé');
    ws2.columns = [
      { header: 'Libellé', key: 'libelle', width: 35 },
      { header: 'Valeur', key: 'valeur', width: 20 },
    ];
    ws2.addRow({ libelle: 'Mutuelle', valeur: mutuelle.nom });
    ws2.addRow({ libelle: 'Période', valeur: `${dateDebut} au ${dateFin}` });
    ws2.addRow({ libelle: '', valeur: '' });
    ws2.addRow({ libelle: 'En attente', valeur: rapport.parStatut.EN_ATTENTE });
    ws2.addRow({ libelle: 'Validées', valeur: rapport.parStatut.VALIDEE });
    ws2.addRow({ libelle: 'Rejetées', valeur: rapport.parStatut.REJETEE });
    ws2.addRow({ libelle: 'Payées', valeur: rapport.parStatut.PAYEE });
    ws2.addRow({ libelle: 'TOTAL', valeur: rapport.total });
    ws2.addRow({ libelle: '', valeur: '' });
    ws2.addRow({ libelle: 'Montant total', valeur: rapport.totalMontant });

    ws2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    ws2.getRow(10).font = { bold: true };
    ws2.getRow(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="rapport-prestations-${dateDebut}_a_${dateFin}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
    this.logger.log(`📊 Export Excel prestations (${rapport.total} prestations)`);
  }

  // ==========================================
  // 9. RAPPORT DONS — PDF
  // ==========================================
  async exportRapportDonsPdf(organisationId: bigint | null, dateDebut: string, dateFin: string, res: any) {
    const rapport = await this.rapportsService.getRapportDons(organisationId, dateDebut, dateFin);
    const mutuelle = await this.getMutuelleInfo(organisationId);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rapport-dons-${dateDebut}_a_${dateFin}.pdf"`);
    doc.pipe(res);

    this.entetePdf(
      doc,
      mutuelle,
      'Rapport des dons',
      `Période du ${new Date(dateDebut).toLocaleDateString('fr-FR')} au ${new Date(dateFin).toLocaleDateString('fr-FR')}`,
    );

    // Résumé
    const resume = [
      { libelle: 'Nombre total de dons', valeur: String(rapport.total) },
      { libelle: 'Montant total reçu', valeur: this.fmt(rapport.totalMontant, mutuelle.devise), _bold: true },
    ];
    this.drawTable(doc, [
      { header: 'Indicateur', width: 280, key: 'libelle' },
      { header: 'Valeur', width: 215, key: 'valeur', align: 'right' },
    ], resume);

    // Liste détaillée
    doc.fontSize(11).fillColor('#111111').text('Détail des dons', 50, doc.y);
    doc.moveDown(0.3);

    const lignes = rapport.details.slice(0, 50).map((d: any) => ({
      donateur: d.structureDonatrice || '-',
      date: new Date(d.dateDon).toLocaleDateString('fr-FR'),
      mode: d.modePaiement || '-',
      montant: `${Number(d.montant).toLocaleString('fr-FR')}`,
    }));

    this.drawTable(doc, [
      { header: 'Donateur', width: 200, key: 'donateur' },
      { header: 'Date', width: 100, key: 'date' },
      { header: 'Mode', width: 100, key: 'mode' },
      { header: 'Montant', width: 95, key: 'montant', align: 'right' },
    ], lignes);

    if (rapport.details.length > 50) {
      doc.fontSize(8).fillColor('#6b7280').text(`... et ${rapport.details.length - 50} don(s) non affiché(s)`);
    }

    doc.end();
    this.logger.log(`📄 Export PDF dons (${rapport.total} dons)`);
  }

  // ==========================================
  // 10. RAPPORT DONS — EXCEL
  // ==========================================
  async exportRapportDonsExcel(organisationId: bigint | null, dateDebut: string, dateFin: string, res: any) {
    const rapport = await this.rapportsService.getRapportDons(organisationId, dateDebut, dateFin);
    const mutuelle = await this.getMutuelleInfo(organisationId);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SGMA';

    const ws = workbook.addWorksheet('Dons', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = [
      { header: 'N°', key: 'num', width: 6 },
      { header: 'Donateur', key: 'donateur', width: 35 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Mode de paiement', key: 'mode', width: 20 },
      { header: 'Montant', key: 'montant', width: 14 },
    ];

    rapport.details.forEach((d: any, i: number) =>
      ws.addRow({
        num: i + 1,
        donateur: d.structureDonatrice || '-',
        date: new Date(d.dateDon).toLocaleDateString('fr-FR'),
        mode: d.modePaiement || '-',
        montant: Number(d.montant),
      }),
    );

    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    ws.getColumn(5).numFmt = '#,##0';
    ws.autoFilter = { from: 'A1', to: 'E1' };

    // Ligne total
    const totalRow = ws.addRow({
      num: '',
      donateur: 'TOTAL',
      date: '',
      mode: '',
      montant: rapport.totalMontant,
    });
    totalRow.font = { bold: true };
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="rapport-dons-${dateDebut}_a_${dateFin}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
    this.logger.log(`📊 Export Excel dons (${rapport.total} dons)`);
  }
}