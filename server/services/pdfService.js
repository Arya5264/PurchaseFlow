const PDFDocument = require('pdfkit');

/**
 * Generates a professional Purchase Order PDF document.
 * @param {Object} po - Populated Purchase Order document
 * @param {Stream} res - Express response stream
 */
const generatePurchaseOrderPDF = (po, res) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  doc.pipe(res);

  // Header Banner
  doc.rect(40, 40, 515, 60).fill('#0f766e');
  doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('PURCHASEFLOW', 55, 52);
  doc.fontSize(10).font('Helvetica').text('Enterprise Procurement & Supply Chain Management', 55, 78);
  doc.fontSize(16).font('Helvetica-Bold').text('PURCHASE ORDER', 370, 60, { align: 'right', width: 170 });

  doc.moveDown(2);
  let currentY = 120;

  // Metadata Box (Left: Order Info, Right: Vendor Info)
  doc.fillColor('#1e293b');
  doc.fontSize(11).font('Helvetica-Bold').text('ORDER DETAILS', 40, currentY);
  doc.text('VENDOR INFORMATION', 300, currentY);

  currentY += 16;
  doc.fontSize(9).font('Helvetica');
  doc.text(`PO Number: ${po.poNumber}`, 40, currentY);
  doc.text(`Vendor: ${po.vendorId?.name || 'N/A'} (${po.vendorId?.vendorCode || ''})`, 300, currentY);

  currentY += 14;
  doc.text(`PR Reference: ${po.prId?.prNumber || 'N/A'}`, 40, currentY);
  doc.text(`Contact: ${po.vendorId?.contactPerson || 'N/A'}`, 300, currentY);

  currentY += 14;
  doc.text(`Issued Date: ${new Date(po.createdAt).toLocaleDateString()}`, 40, currentY);
  doc.text(`Email: ${po.vendorId?.email || 'N/A'}`, 300, currentY);

  currentY += 14;
  doc.text(`Expected Delivery: ${new Date(po.deliveryDate).toLocaleDateString()}`, 40, currentY);
  doc.text(`GST No: ${po.vendorId?.gstNumber || 'N/A'}`, 300, currentY);

  currentY += 14;
  doc.text(`Status: ${po.status}`, 40, currentY);
  doc.text(`Address: ${po.vendorId?.address || 'N/A'}`, 300, currentY, { width: 240 });

  currentY += 35;

  // Items Table Header
  doc.rect(40, currentY, 515, 22).fill('#f1f5f9');
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9);
  doc.text('#', 45, currentY + 6);
  doc.text('Item Description', 70, currentY + 6);
  doc.text('Qty', 290, currentY + 6, { width: 40, align: 'right' });
  doc.text('Unit Price', 345, currentY + 6, { width: 65, align: 'right' });
  doc.text('Tax', 420, currentY + 6, { width: 45, align: 'right' });
  doc.text('Total (INR)', 475, currentY + 6, { width: 70, align: 'right' });

  currentY += 24;
  doc.font('Helvetica').fontSize(9);

  po.items.forEach((item, index) => {
    // Row background alternate
    if (index % 2 === 1) {
      doc.rect(40, currentY - 2, 515, 20).fill('#f8fafc');
    }
    doc.fillColor('#334155');
    doc.text(String(index + 1), 45, currentY + 2);
    doc.text(`${item.itemName} ${item.description ? '- ' + item.description : ''}`, 70, currentY + 2, { width: 215, height: 16 });
    doc.text(String(item.quantity), 290, currentY + 2, { width: 40, align: 'right' });
    doc.text(`₹${item.unitPrice.toLocaleString('en-IN')}`, 345, currentY + 2, { width: 65, align: 'right' });
    doc.text(`${item.taxRate || 0}%`, 420, currentY + 2, { width: 45, align: 'right' });
    doc.text(`₹${item.totalPrice.toLocaleString('en-IN')}`, 475, currentY + 2, { width: 70, align: 'right' });

    currentY += 20;
  });

  // Divider line
  currentY += 10;
  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, currentY).lineTo(555, currentY).stroke();

  // Summary Totals Box
  currentY += 12;
  const totalsX = 350;
  doc.font('Helvetica').fontSize(9).fillColor('#475569');
  doc.text('Subtotal:', totalsX, currentY);
  doc.text(`₹${po.subtotal.toLocaleString('en-IN')}`, 450, currentY, { width: 95, align: 'right' });

  currentY += 15;
  doc.text('Tax Amount:', totalsX, currentY);
  doc.text(`₹${po.tax.toLocaleString('en-IN')}`, 450, currentY, { width: 95, align: 'right' });

  currentY += 18;
  doc.rect(totalsX - 10, currentY - 4, 215, 24).fill('#f0fdfa');
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f766e');
  doc.text('Grand Total:', totalsX, currentY + 2);
  doc.text(`₹${po.totalAmount.toLocaleString('en-IN')}`, 450, currentY + 2, { width: 95, align: 'right' });

  // Terms and Conditions
  currentY += 45;
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text('Terms & Conditions', 40, currentY);
  currentY += 14;
  doc.font('Helvetica').fontSize(8).fillColor('#64748b');
  doc.text('1. Goods must be delivered in sound condition according to agreed specifications on or before the specified delivery date.', 40, currentY);
  currentY += 11;
  doc.text('2. Please reference this Purchase Order number on all delivery notes, packages, and invoices.', 40, currentY);
  currentY += 11;
  doc.text('3. Invoices will undergo automated three-way matching against warehouse goods receipt before payment is scheduled.', 40, currentY);

  // Signature lines
  currentY += 40;
  doc.strokeColor('#94a3b8').lineWidth(1);
  doc.moveTo(60, currentY).lineTo(200, currentY).stroke();
  doc.moveTo(380, currentY).lineTo(520, currentY).stroke();

  currentY += 6;
  doc.fontSize(8).fillColor('#475569');
  doc.text('Prepared / Authorized By', 80, currentY);
  doc.text('Vendor Acceptance Signature', 390, currentY);

  doc.end();
};

module.exports = { generatePurchaseOrderPDF };
