const Invoice = require('../models/Invoice');
const PurchaseOrder = require('../models/PurchaseOrder');
const GoodsReceipt = require('../models/GoodsReceipt');
const { performThreeWayMatch } = require('../services/matchingService');
const { logAudit } = require('../services/auditService');
const { notifyRoles, notifyUser } = require('../services/notificationService');
const User = require('../models/User');

// @desc   Get invoices with filtering & vendor isolation
// @route  GET /api/invoices
// @access Private
const getInvoices = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    // Vendor isolation
    if (req.user.role === 'VENDOR') {
      if (!req.user.vendorId) {
        return res.status(403).json({
          success: false,
          message: 'Vendor user is not associated with any vendor profile.',
        });
      }
      query.vendorId = req.user.vendorId._id || req.user.vendorId;
    } else if (req.query.vendorId) {
      query.vendorId = req.query.vendorId;
    }

    if (req.query.status) query.status = req.query.status.toUpperCase();
    if (req.query.matchStatus) query.matchStatus = req.query.matchStatus.toUpperCase();
    if (req.query.paymentStatus) query.paymentStatus = req.query.paymentStatus.toUpperCase();
    if (req.query.poId) query.poId = req.query.poId;

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.invoiceNumber = searchRegex;
    }

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate('poId', 'poNumber totalAmount status deliveryDate')
      .populate('vendorId', 'name vendorCode email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: invoices,
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

// @desc   Get single invoice by ID with comparison data
// @route  GET /api/invoices/:id
// @access Private
const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate({
        path: 'poId',
        populate: [{ path: 'vendorId' }, { path: 'prId' }, { path: 'createdBy', select: 'name email' }],
      })
      .populate('vendorId');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found.',
      });
    }

    // Vendor ownership verification
    if (req.user.role === 'VENDOR') {
      const userVendorId = (req.user.vendorId?._id || req.user.vendorId || '').toString();
      const invoiceVendorId = (invoice.vendorId?._id || invoice.vendorId).toString();
      if (userVendorId !== invoiceVendorId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. You cannot access invoices of other vendors.',
        });
      }
    }

    // Fetch related goods receipts
    const receipts = await GoodsReceipt.find({ poId: invoice.poId?._id }).populate('receivedBy', 'name email');

    // Perform real-time 3-way match comparison
    const matchResult = await performThreeWayMatch(invoice, invoice.poId);

    res.status(200).json({
      success: true,
      data: {
        invoice,
        receipts,
        matchComparison: matchResult.comparison,
        discrepancyDetails: matchResult.discrepancyDetails,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Create / Submit invoice (Vendor or Finance)
// @route  POST /api/invoices
// @access Private (Vendor, Finance, Admin)
const createInvoice = async (req, res, next) => {
  try {
    const { invoiceNumber, poId, invoiceDate, dueDate, amount, items, remarks } = req.body;

    if (!invoiceNumber || !poId || !invoiceDate || !dueDate || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Invoice number, PO ID, invoice date, due date, and amount are required.',
      });
    }

    const po = await PurchaseOrder.findById(poId).populate('vendorId');
    if (!po) {
      return res.status(404).json({
        success: false,
        message: 'Referenced Purchase Order not found.',
      });
    }

    // Determine vendorId: if caller is vendor, enforce logged in vendorId; else use po.vendorId
    let vendorId = po.vendorId?._id || po.vendorId;
    if (req.user.role === 'VENDOR') {
      const userVendorId = (req.user.vendorId?._id || req.user.vendorId || '').toString();
      const poVendorId = vendorId.toString();

      // Rule 12: Invoice vendor must match PO vendor
      if (userVendorId !== poVendorId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. You can only submit invoices for Purchase Orders issued to your vendor organization.',
        });
      }
      vendorId = userVendorId;
    }

    // Check duplicate invoice number for this vendor
    const existingInvoice = await Invoice.findOne({
      invoiceNumber: invoiceNumber.trim(),
      vendorId,
    });
    if (existingInvoice) {
      return res.status(409).json({
        success: false,
        message: `An invoice with number '${invoiceNumber}' has already been submitted by this vendor.`,
      });
    }

    // Process line items if provided, or default from PO
    const processedItems =
      items && Array.isArray(items) && items.length > 0
        ? items.map((i) => ({
            itemName: i.itemName,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            totalPrice: Number(i.totalPrice || Number(i.quantity) * Number(i.unitPrice)),
          }))
        : po.items.map((i) => ({
            itemName: i.itemName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
          }));

    const invoice = new Invoice({
      invoiceNumber: invoiceNumber.trim(),
      poId: po._id,
      vendorId,
      invoiceDate: new Date(invoiceDate),
      dueDate: new Date(dueDate),
      amount: Number(amount),
      items: processedItems,
      status: 'PENDING',
      remarks: remarks || '',
    });

    // Run automated three-way matching
    const matchResult = await performThreeWayMatch(invoice, po);
    invoice.matchStatus = matchResult.matchStatus;
    invoice.discrepancyDetails = matchResult.discrepancyDetails;

    await invoice.save();

    // Update PO status to INVOICE_PENDING if currently delivered or partially received
    if (['DELIVERED', 'PARTIALLY_RECEIVED', 'IN_TRANSIT'].includes(po.status)) {
      po.status = 'INVOICE_PENDING';
      await po.save();
    }

    await logAudit({
      userId: req.user._id,
      action: 'SUBMIT_INVOICE',
      entityType: 'Invoice',
      entityId: invoice._id,
      description: `Invoice ${invoice.invoiceNumber} submitted for PO ${po.poNumber}. Initial Match Status: ${invoice.matchStatus}.`,
      ipAddress: req.ip,
    });

    // Notify Finance team
    await notifyRoles(['FINANCE', 'ADMIN'], {
      type: invoice.matchStatus === 'MATCHED' ? 'INVOICE_MATCHED' : 'INVOICE_MISMATCHED',
      title: `Invoice ${invoice.invoiceNumber} Submitted (${invoice.matchStatus})`,
      message: `Invoice ${invoice.invoiceNumber} for ₹${invoice.amount.toLocaleString()} was submitted for PO ${po.poNumber}. 3-Way Match: ${invoice.matchStatus}.`,
      relatedEntity: 'Invoice',
      relatedEntityId: invoice._id,
    });

    res.status(201).json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} submitted successfully. Match status: ${invoice.matchStatus}.`,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Run or re-evaluate Three-Way Match for an invoice
// @route  POST /api/invoices/:id/match
// @access Private (Finance, Admin)
const matchInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('poId');
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found.',
      });
    }

    const matchResult = await performThreeWayMatch(invoice, invoice.poId);

    invoice.matchStatus = matchResult.matchStatus;
    invoice.discrepancyDetails = matchResult.discrepancyDetails;
    await invoice.save();

    await logAudit({
      userId: req.user._id,
      action: 'RUN_THREE_WAY_MATCH',
      entityType: 'Invoice',
      entityId: invoice._id,
      description: `Executed 3-way match on Invoice ${invoice.invoiceNumber}. Result: ${invoice.matchStatus}.`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `Three-way matching completed. Result: ${invoice.matchStatus}.`,
      data: {
        invoice,
        comparison: matchResult.comparison,
        discrepancyDetails: matchResult.discrepancyDetails,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Approve invoice
// @route  POST /api/invoices/:id/approve
// @access Private (Finance, Admin)
const approveInvoice = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const invoice = await Invoice.findById(req.params.id).populate('poId');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found.',
      });
    }

    if (invoice.status === 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'Invoice is already approved.',
      });
    }

    invoice.status = 'APPROVED';
    if (remarks) invoice.remarks = remarks;
    await invoice.save();

    // Update PO to PAYMENT_PENDING
    if (invoice.poId && invoice.poId.status !== 'PAID' && invoice.poId.status !== 'CLOSED') {
      const po = await PurchaseOrder.findById(invoice.poId._id);
      if (po) {
        po.status = 'PAYMENT_PENDING';
        await po.save();
      }
    }

    await logAudit({
      userId: req.user._id,
      action: 'APPROVE_INVOICE',
      entityType: 'Invoice',
      entityId: invoice._id,
      description: `Invoice ${invoice.invoiceNumber} approved by Finance. Remarks: ${remarks || 'None'}`,
      ipAddress: req.ip,
    });

    // Notify vendor users
    const vendorUsers = await User.find({ vendorId: invoice.vendorId });
    for (const vUser of vendorUsers) {
      await notifyUser({
        userId: vUser._id,
        type: 'INVOICE_APPROVED',
        title: 'Invoice Approved',
        message: `Your invoice ${invoice.invoiceNumber} for ₹${invoice.amount.toLocaleString()} has been approved by Finance and queued for payment.`,
        relatedEntity: 'Invoice',
        relatedEntityId: invoice._id,
      });
    }

    res.status(200).json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} approved successfully.`,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Reject invoice
// @route  POST /api/invoices/:id/reject
// @access Private (Finance, Admin)
const rejectInvoice = async (req, res, next) => {
  try {
    const { remarks } = req.body;

    if (!remarks || remarks.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Rejection remarks are mandatory. Please provide a reason for rejecting the invoice.',
      });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found.',
      });
    }

    invoice.status = 'REJECTED';
    invoice.remarks = remarks;
    await invoice.save();

    await logAudit({
      userId: req.user._id,
      action: 'REJECT_INVOICE',
      entityType: 'Invoice',
      entityId: invoice._id,
      description: `Invoice ${invoice.invoiceNumber} rejected by Finance. Reason: ${remarks}`,
      ipAddress: req.ip,
    });

    // Notify vendor users
    const vendorUsers = await User.find({ vendorId: invoice.vendorId });
    for (const vUser of vendorUsers) {
      await notifyUser({
        userId: vUser._id,
        type: 'INVOICE_REJECTED',
        title: 'Invoice Rejected',
        message: `Your invoice ${invoice.invoiceNumber} was rejected by Finance. Reason: ${remarks}`,
        relatedEntity: 'Invoice',
        relatedEntityId: invoice._id,
      });
    }

    res.status(200).json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} rejected.`,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  matchInvoice,
  approveInvoice,
  rejectInvoice,
};
