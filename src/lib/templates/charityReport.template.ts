import PDFDocument from 'pdfkit';
import { Buffer } from 'buffer';
import { getFormattedDate } from '../helpers/getFormattedDate';
import { getFormattedTime } from '../helpers/getFormattedTime';

interface ICharityReport {
  date: string;
  time: string;
  amount: number;
  firstName: string;
  lastName: string;
  orderId: string;
  transactionId: number;
}

export async function getCharityReportTemplate(
  email: string,
  transactions: ICharityReport[],
): Promise<Buffer> {
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalCount = transactions.length;

  const doc = new PDFDocument({ margin: 40 });
  const buffers: Buffer[] = [];

  doc.on('data', (chunk) => buffers.push(chunk));
  doc.on('end', () => Buffer.concat(buffers));

  // Header
  doc.fontSize(20).fillColor('#1f4e79').text('Donation Report', { align: 'center' });
  doc.moveDown();

  // Summary Box
  const boxX = doc.page.margins.left;
  const boxY = doc.y;
  const boxWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const boxHeight = 65;

  doc
    .rect(boxX, boxY, boxWidth, boxHeight)
    .fill('#f9f9f9')
    .strokeColor('#ccc')
    .lineWidth(0.5)
    .stroke();

  doc
    .fillColor('black')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('Email:', boxX + 10, boxY + 10, { continued: true })
    .font('Helvetica')
    .text(` ${email}`);

  doc
    .font('Helvetica-Bold')
    .text('Total Transactions:', { continued: true })
    .font('Helvetica')
    .text(` ${totalCount}`);

  doc
    .font('Helvetica-Bold')
    .text('Total Amount:', { continued: true })
    .font('Helvetica')
    .text(` PKR ${totalAmount.toFixed(2)}`);

  doc.moveDown(2);

  // Table Setup
  const tableX = doc.page.margins.left;
  const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  const columnWidths = {
    no: tableWidth * 0.06,
    date: tableWidth * 0.17,
    time: tableWidth * 0.12,
    amount: tableWidth * 0.15,
    merchant: tableWidth * 0.3,
    txnId: tableWidth * 0.2,
  };
  const rowHeight = 22;

  const drawRow = (y: number, row: string[], isHeader = false) => {
    let x = tableX;

    Object.entries(columnWidths).forEach(([_, width], i) => {
      if (isHeader) {
        doc.rect(x, y, width, rowHeight).fillAndStroke('#f0f0f0', '#ccc');
      } else {
        doc.rect(x, y, width, rowHeight).stroke('#e0e0e0');
      }

      doc
        .fillColor('black')
        .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(9)
        .text(row[i] || '', x + 4, y + 6, {
          width: width - 8,
          height: rowHeight,
          ellipsis: true,
        });

      x += width;
    });
  };

  let rowY = doc.y;
  drawRow(rowY, ['#', 'Date', 'Time', 'Amount', 'Merchant', 'Txn ID'], true);
  rowY += rowHeight;

  transactions.forEach((t, i) => {
    const fullDateStr = `${t.date} ${t.time}`;
    const formattedDate = getFormattedDate(fullDateStr);
    const formattedTime = getFormattedTime(fullDateStr);

    drawRow(rowY, [
      `${i + 1}`,
      formattedDate,
      formattedTime,
      `PKR ${t.amount.toFixed(2)}`,
      `${t.firstName} ${t.lastName}`,
      String(t.transactionId),
    ]);

    rowY += rowHeight;
  });

  // Footer at bottom of page
  const generatedAt = new Date();
  const genDate = getFormattedDate(generatedAt.toISOString());
  const genTime = getFormattedTime(generatedAt.toISOString());
  const footerY = doc.page.height - doc.page.margins.bottom - 40;

  doc
    .fontSize(8)
    .fillColor('#666')
    .text(
      "Note: Time and date shown may vary depending on the recipient's local timezone.",
      doc.page.margins.left,
      footerY,
      {
        width: tableWidth,
        align: 'left',
      },
    );

  doc
    .fontSize(8)
    .fillColor('#666')
    .text(`Generated on: ${genDate}, ${genTime}`, doc.page.margins.left, footerY + 14, {
      width: tableWidth,
      align: 'left',
    });

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
}
