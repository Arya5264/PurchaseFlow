const PurchaseOrder = require('../models/PurchaseOrder');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const { logAudit } = require('../services/auditService');
const { notifyUser, notifyRoles } = require('../services/notificationService');
const { generatePurchaseOrderPDF } = require('../services/pdfService');

// Helper to generate next PO number
const generatePONumber = async () => {
  const currentYear = new Date().getFullYear();
  const latestPO = await PurchaseOrder.findOne({
    poNumber: new RegExp(`^PO-${currentYear}-`),
  }).sort({ poNumber: -1 });

  let seq = 1;
  if (latestPO && latestPO.poNumber) {
    const parts = latestPO.poNumber.split('-');
    if (parts.length === 3) {
      seq = parseInt(parts[2], 10) + 1;
    }
  }
  return `PO-${currentYear}-${String(seq).padStart(4, '0')}`;
};

// @desc   Get purchase orders with filtering & vendor isolation
// @route  GET /api/purchase-orders
// @access Private
const getPurchaseOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    // Vendor Ownership Isolation: Vendors ONLY see their own POs
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

    if (req.query.status) {
      query.status = req.query.status.toUpperCase();
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.poNumber = searchRegex;
    }

    const total = await PurchaseOrder.countDocuments(query);
    const orders = await PurchaseOrder.find(query)
      .populate('prId', 'prNumber department itemName')
      .populate('vendorId', 'name vendorCode email phone')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: orders,
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

// @desc   Get single purchase order
// @route  GET /api/purchase-orders/:id
// @access Private
const getPurchaseOrderById = async (req, res, next) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('prId')
      .populate('vendorId')
      .populate('createdBy', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Order not found.',
      });
    }

    // Vendor ownership verification
    if (req.user.role === 'VENDOR') {
      const userVendorId = req.user.vendorId ? (req.user.vendorId._id || req.user.vendorId).toString() : '';
      const orderVendorId = order.vendorId ? (order.vendorId._id || order.vendorId).toString() : '';
      if (userVendorId !== orderVendorId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. You cannot access purchase orders of other vendors.',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Generate purchase order from approved PR
// @route  POST /api/purchase-orders
// @access Private (Purchase Manager, Admin)
const createPurchaseOrder = async (req, res, next) => {
  try {
    const { prId, vendorId, items, deliveryDate } = req.body;

    if (!prId || !vendorId || !items || !Array.isArray(items) || items.length === 0 || !deliveryDate) {
      return res.status(400).json({
        success: false,
        message: 'Requisition ID, Vendor ID, items array, and delivery date are required.',
      });
    }

    // Rule 6: Only APPROVED PRs can generate PO
    const requisition = await PurchaseRequisition.findById(prId);
    if (!requisition) {
      return res.status(404).json({
        success: false,
        message: 'Referenced Purchase Requisition not found.',
      });
    }

    if (requisition.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: `Cannot generate PO for requisition in '${requisition.status}' status. Only APPROVED requisitions can generate POs.`,
      });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Referenced Vendor not found.',
      });
    }

    if (vendor.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: `Vendor is currently ${vendor.status}. PO can only be issued to an ACTIVE vendor.`,
      });
    }

    // Calculate line item totals and aggregate subtotal & tax
    let subtotal = 0;
    let totalTax = 0;

    const processedItems = items.map((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const taxRate = Number(item.taxRate || 0);

      if (quantity <= 0 || unitPrice < 0 || taxRate < 0) {
        throw new Error(`Invalid item values for ${item.itemName}`);
      }

      const lineTotal = quantity * unitPrice;
      const lineTax = (lineTotal * taxRate) / 100;

      subtotal += lineTotal;
      totalTax += lineTax;

      return {
        itemName: item.itemName,
        description: item.description || '',
        quantity,
        unitPrice,
        taxRate,
        totalPrice: lineTotal,
      };
    });

    const totalAmount = Math.round((subtotal + totalTax) * 100) / 100;
    const poNumber = await generatePONumber();

    const purchaseOrder = await PurchaseOrder.create({
      poNumber,
      prId: requisition._id,
      vendorId: vendor._id,
      createdBy: req.user._id,
      items: processedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(totalTax * 100) / 100,
      totalAmount,
      deliveryDate: new Date(deliveryDate),
      status: 'GENERATED',
    });

    // Update PR status to PO_GENERATED
    requisition.status = 'PO_GENERATED';
    await requisition.save();

    await logAudit({
      userId: req.user._id,
      action: 'GENERATE_PO',
      entityType: 'PurchaseOrder',
      entityId: purchaseOrder._id,
      description: `Generated Purchase Order ${purchaseOrder.poNumber} from ${requisition.prNumber} for ₹${purchaseOrder.totalAmount.toLocaleString()}.`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: `Purchase Order ${purchaseOrder.poNumber} generated successfully.`,
      data: purchaseOrder,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Send PO to Vendor
// @route  POST /api/purchase-orders/:id/send
// @access Private (Purchase Manager, Admin)
const sendPurchaseOrder = async (req, res, next) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('vendorId')
      .populate('prId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Order not found.',
      });
    }

    if (order.status !== 'GENERATED') {
      return res.status(400).json({
        success: false,
        message: `PO cannot be sent. Current status is '${order.status}'. Only GENERATED POs can be sent.`,
      });
    }

    order.status = 'SENT';
    order.sentAt = new Date();
    await order.save();

    await logAudit({
      userId: req.user._id,
      action: 'SEND_PO',
      entityType: 'PurchaseOrder',
      entityId: order._id,
      description: `Purchase Order ${order.poNumber} sent to vendor ${order.vendorId?.name}.`,
      ipAddress: req.ip,
    });

    // Find vendor user accounts linked to this vendor
    const vendorUsers = await User.find({ vendorId: order.vendorId._id });
    for (const vUser of vendorUsers) {
      await notifyUser({
        userId: vUser._id,
        type: 'PO_SENT',
        title: 'New Purchase Order Received',
        message: `Purchase Order ${order.poNumber} (₹${order.totalAmount.toLocaleString()}) has been issued to your organization. Please review and acknowledge.`,
        relatedEntity: 'PurchaseOrder',
        relatedEntityId: order._id,
      });
    }

    res.status(200).json({
      success: true,
      message: `Purchase Order ${order.poNumber} sent to vendor.`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Vendor acknowledges Purchase Order
// @route  POST /api/purchase-orders/:id/acknowledge
// @access Private (Vendor)
const acknowledgePurchaseOrder = async (req, res, next) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Order not found.',
      });
    }

    // Ownership check: vendor can acknowledge only their own PO
    if (req.user.role === 'VENDOR') {
      const userVendorId = (req.user.vendorId?._id || req.user.vendorId || '').toString();
      const orderVendorId = order.vendorId.toString();
      if (userVendorId !== orderVendorId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. You cannot acknowledge purchase orders of other vendors.',
        });
      }
    }

    if (order.status !== 'SENT') {
      return res.status(400).json({
        success: false,
        message: `Cannot acknowledge PO in '${order.status}' status. Only SENT purchase orders can be acknowledged.`,
      });
    }

    order.status = 'ACKNOWLEDGED';
    order.acknowledgedAt = new Date();
    await order.save();

    await logAudit({
      userId: req.user._id,
      action: 'ACKNOWLEDGE_PO',
      entityType: 'PurchaseOrder',
      entityId: order._id,
      description: `Vendor acknowledged Purchase Order ${order.poNumber}.`,
      ipAddress: req.ip,
    });

    // Notify Purchase Manager & Warehouse
    await notifyRoles(['PURCHASE_MANAGER', 'WAREHOUSE'], {
      type: 'PO_ACKNOWLEDGED',
      title: 'Purchase Order Acknowledged',
      message: `Vendor acknowledged PO ${order.poNumber}. Delivery expected by ${new Date(order.deliveryDate).toLocaleDateString()}.`,
      relatedEntity: 'PurchaseOrder',
      relatedEntityId: order._id,
    });

    res.status(200).json({
      success: true,
      message: `Purchase Order ${order.poNumber} acknowledged.`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Vendor marks order as In Transit
// @route  POST /api/purchase-orders/:id/in-transit
// @access Private (Vendor, Purchase Manager)
const markInTransit = async (req, res, next) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Order not found.',
      });
    }

    if (req.user.role === 'VENDOR') {
      const userVendorId = (req.user.vendorId?._id || req.user.vendorId || '').toString();
      if (userVendorId !== order.vendorId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. You do not own this purchase order.',
        });
      }
    }

    if (!['ACKNOWLEDGED', 'SENT'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot mark in-transit from status '${order.status}'.`,
      });
    }

    order.status = 'IN_TRANSIT';
    await order.save();

    await logAudit({
      userId: req.user._id,
      action: 'PO_IN_TRANSIT',
      entityType: 'PurchaseOrder',
      entityId: order._id,
      description: `PO ${order.poNumber} marked as IN_TRANSIT.`,
      ipAddress: req.ip,
    });

    await notifyRoles(['WAREHOUSE', 'PURCHASE_MANAGER'], {
      type: 'PO_IN_TRANSIT',
      title: 'Shipment In Transit',
      message: `Shipment for PO ${order.poNumber} is now in transit towards the warehouse.`,
      relatedEntity: 'PurchaseOrder',
      relatedEntityId: order._id,
    });

    res.status(200).json({
      success: true,
      message: `Purchase Order ${order.poNumber} status updated to IN_TRANSIT.`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Download Purchase Order PDF
// @route  GET /api/purchase-orders/:id/pdf
// @access Private (Authenticated)
const downloadPOReceiptPDF = async (req, res, next) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('vendorId')
      .populate('prId')
      .populate('createdBy', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Order not found.',
      });
    }

    // Ownership check for vendor
    if (req.user.role === 'VENDOR') {
      const userVendorId = (req.user.vendorId?._id || req.user.vendorId || '').toString();
      const orderVendorId = (order.vendorId?._id || order.vendorId).toString();
      if (userVendorId !== orderVendorId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. You cannot view PDFs of other vendors.',
        });
      }
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${order.poNumber}.pdf"`);

    generatePurchaseOrderPDF(order, res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  sendPurchaseOrder,
  acknowledgePurchaseOrder,
  markInTransit,
  downloadPOReceiptPDF,
};
