import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { statementBalanceLabel, statementMoney, type CreditStatement } from './credit-statement';
import { displayDate } from './date-format';

export async function buildCreditStatementPdf(statement: CreditStatement) {
  const doc = await PDFDocument.create();
  doc.setTitle('Estado de cuenta | Copy Print');
  doc.setAuthor('Copy Print');
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(.12, .17, .25);
  const paymentInk = rgb(.08, .38, .23);
  let page = doc.addPage([595.28, 841.89]);
  let y = 806;

  function write(value: string, size = 10, heading = false, color = ink) {
    const font = heading ? bold : regular;
    const clean = value.normalize('NFC').replace(/[^\x20-\x7e\u00a0-\u00ff]/g, ' ').replace(/\s+/g, ' ').trim();
    const lines: string[] = [];
    let line = '';
    for (const char of clean) {
      if (line && font.widthOfTextAtSize(line + char, size) > 518) {
        const space = line.lastIndexOf(' ');
        lines.push(space > 0 ? line.slice(0, space) : line);
        line = space > 0 ? line.slice(space + 1) : '';
      }
      line += char;
    }
    if (line) lines.push(line);
    for (const text of lines) {
      if (y < 48) {
        page = doc.addPage([595.28, 841.89]);
        y = 806;
      }
      page.drawText(text.trim(), {x: 38, y, size, font, color});
      y -= size + 6;
    }
  }

  write('COPY PRINT', 12, true);
  write('Estado de cuenta', 23, true);
  write(statement.name, 14, true);
  y -= 8;
  const {totals} = statement;
  write(`Total de créditos: ${statementMoney(totals.total)}`);
  write(`Total de pagos: ${statementMoney(totals.paid)}`);
  write(`${statementBalanceLabel(totals.balance)}: ${statementMoney(Math.abs(totals.balance))}`, 12, true);
  y -= 14;
  write('Movimientos de la cuenta', 14, true);
  if (!statement.movements.length) write('Todavía no hay movimientos registrados.');
  for (const movement of statement.movements) {
    const date = movement.date ? displayDate(movement.date) : 'Sin fecha';
    const payment = movement.type === 'Pago';
    write([date, movement.type, movement.description, statementMoney(movement.amount)].filter(Boolean).join(' | '),
      10, payment, payment ? paymentInk : ink);
  }
  const pages = doc.getPages();
  pages.forEach((sheet, index) => sheet.drawText(`Copy Print  |  Página ${index + 1} de ${pages.length}`, {
    x: 38, y: 24, size: 9, font: regular, color: ink,
  }));
  return doc.save();
}
