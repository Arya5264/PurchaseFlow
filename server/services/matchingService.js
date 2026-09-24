const GoodsReceipt = require('../models/GoodsReceipt');
const PurchaseOrder = require('../models/PurchaseOrder');

/**
 * Executes a thorough 3-Way Match between:
 * 1. Purchase Order
 * 2. Goods Receipts (aggregated across all partial/full deliveries for this PO)
 * 3. Invoice
 */
const performThreeWayMatch = async (invoice, purchaseOrder = null) => {
  const discrepancies = [];

  const po = purchaseOrder || (await PurchaseOrder.findById(invoice.poId).populate('vendorId'));
  if (!po) {
    discrepancies.push({
      field: 'PurchaseOrder',
      expected: 'Valid Purchase Order reference',
      actual: null,
      message: 'Referenced Purchase Order does not exist.',
    });
    return {
      matchStatus: 'MISMATCHED',
      discrepancyDetails: discrepancies,
      comparison: null,
    };
  }

  // 1. Vendor check
  const poVendorId = po.vendorId?._id ? po.vendorId._id.toString() : po.vendorId.toString();
  const invVendorId = invoice.vendorId?._id ? invoice.vendorId._id.toString() : invoice.vendorId.toString();

  if (poVendorId !== invVendorId) {
    discrepancies.push({
      field: 'Vendor',
      expected: poVendorId,
      actual: invVendorId,
      message: 'Invoice vendor does not match Purchase Order vendor.',
    });
  }

  // 2. Goods Receipts aggregation
  const receipts = await GoodsReceipt.find({ poId: po._id });
  if (!receipts || receipts.length === 0) {
    discrepancies.push({
      field: 'GoodsReceipt',
      expected: 'At least one recorded Goods Receipt',
      actual: 0,
      message: 'No goods receipt recorded for this Purchase Order yet. Items have not been received.',
    });
  }

  // Aggregate received items by itemName
  const receivedQtyMap = {};
  receipts.forEach((rcpt) => {
    rcpt.receivedItems.forEach((item) => {
      const key = item.itemName.trim().toLowerCase();
      receivedQtyMap[key] = (receivedQtyMap[key] || 0) + item.receivedQuantity;
    });
  });

  // Calculate total PO quantity vs received vs invoiced
  let totalPoQty = 0;
  po.items.forEach((item) => {
    totalPoQty += item.quantity;
  });

  let totalReceivedQty = 0;
  Object.values(receivedQtyMap).forEach((qty) => {
    totalReceivedQty += qty;
  });

  let totalInvoicedQty = 0;
  if (invoice.items && invoice.items.length > 0) {
    invoice.items.forEach((item) => {
      totalInvoicedQty += item.quantity;
    });
  } else {
    // If invoice items array was not provided item-by-item, fallback to PO item quantity assumption
    totalInvoicedQty = totalPoQty;
  }

  // Check Item Quantities (PO vs Receipt vs Invoice)
  po.items.forEach((poItem) => {
    const key = poItem.itemName.trim().toLowerCase();
    const receivedQty = receivedQtyMap[key] || 0;

    // Find in invoice items if provided
    const invItem = invoice.items?.find((i) => i.itemName.trim().toLowerCase() === key);
    const invoicedQty = invItem ? invItem.quantity : poItem.quantity;

    // Check if received quantity meets invoiced quantity
    if (receivedQty < invoicedQty) {
      discrepancies.push({
        field: `Quantity (${poItem.itemName})`,
        expected: `Invoiced: ${invoicedQty} units`,
        actual: `Received: ${receivedQty} units`,
        message: `Quantity discrepancy: ${invoicedQty} units invoiced but only ${receivedQty} units received in warehouse.`,
      });
    }

    // Check if invoiced exceeds ordered quantity
    if (invoicedQty > poItem.quantity) {
      discrepancies.push({
        field: `Quantity (${poItem.itemName})`,
        expected: `Ordered: ${poItem.quantity} units`,
        actual: `Invoiced: ${invoicedQty} units`,
        message: `Invoiced quantity (${invoicedQty}) exceeds PO ordered quantity (${poItem.quantity}).`,
      });
    }
  });

  // 3. Amount check (allowing a tolerance of +/- 0.01 for minor floating point rounding)
  const amountDiff = Math.abs(invoice.amount - po.totalAmount);
  if (amountDiff > 1.0) {
    discrepancies.push({
      field: 'TotalAmount',
      expected: po.totalAmount,
      actual: invoice.amount,
      message: `Amount mismatch: Invoice amount (₹${invoice.amount.toLocaleString()}) does not match PO total (₹${po.totalAmount.toLocaleString()}). Difference: ₹${amountDiff.toLocaleString()}.`,
    });
  }

  const isMatched = discrepancies.length === 0;

  const comparison = {
    poNumber: po.poNumber,
    poTotalAmount: po.totalAmount,
    poTotalQuantity: totalPoQty,
    totalReceivedQuantity: totalReceivedQty,
    invoiceAmount: invoice.amount,
    invoiceTotalQuantity: totalInvoicedQty,
    receiptCount: receipts.length,
    isMatched,
    lineItemComparisons: po.items.map((poItem) => {
      const key = poItem.itemName.trim().toLowerCase();
      const rcptQty = receivedQtyMap[key] || 0;
      const invItem = invoice.items?.find((i) => i.itemName.trim().toLowerCase() === key);
      const invQty = invItem ? invItem.quantity : poItem.quantity;
      return {
        itemName: poItem.itemName,
        orderedQuantity: poItem.quantity,
        receivedQuantity: rcptQty,
        invoicedQuantity: invQty,
        unitPrice: poItem.unitPrice,
        isQuantityMatched: rcptQty >= invQty && invQty <= poItem.quantity,
      };
    }),
  };

  return {
    matchStatus: isMatched ? 'MATCHED' : 'MISMATCHED',
    discrepancyDetails: discrepancies,
    comparison,
  };
};

module.exports = { performThreeWayMatch };
