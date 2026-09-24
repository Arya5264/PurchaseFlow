const Invoice = require('../models/Invoice');
const PurchaseOrder = require('../models/PurchaseOrder');
const { logAudit } = require('../services/auditService');
const { notifyUser, notifyRoles } = require('../services/notificationService');
const User = require('../models/User');

// @desc   Get all processed payments
// @route  GET /api/payments
// @access Private (Finance, Admin)
const getPayments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = { paymentStatus: 'PAID' };

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.invoiceNumber = searchRegex;
    }

    const total = await Invoice.countDocuments(query);
    const payments = await Invoice.find(query)
      .populate('poId', 'poNumber status totalAmount deliveryDate')
      .populate('vendorId', 'name vendorCode email gstNumber bankDetails')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Process payment for an approved invoice
// @route  POST /api/invoices/:id/pay
// @access Private (Finance, Admin)
const processPayment = async (req, res, next) => {
  try {
    const { paymentMethod, transactionReference, notes } = req.body;
    const invoice = await Invoice.findById(req.params.id)
      .populate('poId')
      .populate('vendorId');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found.',
      });
    }

    // Rule 14: Rejected invoice cannot be paid
    if (invoice.status === 'REJECTED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot process payment for a REJECTED invoice.',
      });
    }

    // Must be approved
    if (invoice.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: `Cannot pay unapproved invoice. Invoice status is '${invoice.status}'. Invoice must be APPROVED first.`,
      });
    }

    // Rule 15: Already paid invoice cannot be paid again
    if (invoice.paymentStatus === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'Payment has already been processed for this invoice.',
      });
    }

    // Rule 13: Mismatched invoice cannot automatically proceed to payment
    if (invoice.matchStatus === 'MISMATCHED' && !req.body.overrideMismatch) {
      return res.status(400).json({
        success: false,
        message: 'Payment blocked: Invoice has 3-way matching discrepancies (MISMATCHED). Discrepancies must be resolved or explicitly overridden with documented justification before payment.',
      });
    }

    invoice.paymentStatus = 'PAID';
    invoice.remarks = `${invoice.remarks ? invoice.remarks + ' | ' : ''}Payment processed via ${paymentMethod || 'BANK_TRANSFER'}. Ref: ${transactionReference || 'TXN-' + Date.now()}`;
    await invoice.save();

    // Update Purchase Order to CLOSED
    let updatedPO = null;
    if (invoice.poId) {
      const po = await PurchaseOrder.findById(invoice.poId._id);
      if (po) {
        po.status = 'CLOSED';
        await po.save();
        updatedPO = po;
      }
    }

    await logAudit({
      userId: req.user._id,
      action: 'PROCESS_PAYMENT',
      entityType: 'Invoice',
      entityId: invoice._id,
      description: `Payment of ₹${invoice.amount.toLocaleString()} processed for Invoice ${invoice.invoiceNumber}. PO ${invoice.poId?.poNumber} closed.`,
      ipAddress: req.ip,
    });

    // Notify vendor users
    const vendorUsers = await User.find({ vendorId: invoice.vendorId._id });
    for (const vUser of vendorUsers) {
      await notifyUser({
        userId: vUser._id,
        type: 'PAYMENT_PROCESSED',
        title: 'Payment Processed',
        message: `Payment of ₹${invoice.amount.toLocaleString()} for Invoice ${invoice.invoiceNumber} has been successfully disbursed.`,
        relatedEntity: 'Invoice',
        relatedEntityId: invoice._id,
      });
    }

    // Notify Purchase Manager that PO is now closed
    await notifyRoles(['PURCHASE_MANAGER'], {
      type: 'PO_CLOSED',
      title: 'Purchase Order Closed',
      message: `Purchase Order ${invoice.poId?.poNumber} is now CLOSED following invoice settlement.`,
      relatedEntity: 'PurchaseOrder',
      relatedEntityId: invoice.poId?._id,
    });

    res.status(200).json({
      success: true,
      message: `Payment of ₹${invoice.amount.toLocaleString()} processed successfully. Purchase Order ${invoice.poId?.poNumber} is now CLOSED.`,
      data: {
        invoice,
        purchaseOrder: updatedPO,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPayments,
  processPayment,
};
