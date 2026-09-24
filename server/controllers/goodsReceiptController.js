const GoodsReceipt = require('../models/GoodsReceipt');
const PurchaseOrder = require('../models/PurchaseOrder');
const { logAudit } = require('../services/auditService');
const { notifyRoles } = require('../services/notificationService');

// Helper to generate next GR number
const generateGRNumber = async () => {
  const currentYear = new Date().getFullYear();
  const latestGR = await GoodsReceipt.findOne({
    receiptNumber: new RegExp(`^GR-${currentYear}-`),
  }).sort({ receiptNumber: -1 });

  let seq = 1;
  if (latestGR && latestGR.receiptNumber) {
    const parts = latestGR.receiptNumber.split('-');
    if (parts.length === 3) {
      seq = parseInt(parts[2], 10) + 1;
    }
  }
  return `GR-${currentYear}-${String(seq).padStart(4, '0')}`;
};

// @desc   Get all goods receipts
// @route  GET /api/receipts
// @access Private (Warehouse, Purchase Manager, Finance, Admin)
const getReceipts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.poId) {
      query.poId = req.query.poId;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.receiptNumber = searchRegex;
    }

    const total = await GoodsReceipt.countDocuments(query);
    const receipts = await GoodsReceipt.find(query)
      .populate({
        path: 'poId',
        select: 'poNumber vendorId status totalAmount',
        populate: { path: 'vendorId', select: 'name vendorCode' },
      })
      .populate('receivedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: receipts,
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

// @desc   Get single goods receipt
// @route  GET /api/receipts/:id
// @access Private
const getReceiptById = async (req, res, next) => {
  try {
    const receipt = await GoodsReceipt.findById(req.params.id)
      .populate({
        path: 'poId',
        populate: [{ path: 'vendorId' }, { path: 'prId' }],
      })
      .populate('receivedBy', 'name email');

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Goods receipt not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Record new goods receipt
// @route  POST /api/receipts
// @access Private (Warehouse, Admin)
const createReceipt = async (req, res, next) => {
  try {
    const { poId, receivedItems, receivedDate, condition, remarks } = req.body;

    if (!poId || !receivedItems || !Array.isArray(receivedItems) || receivedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'PO ID and receivedItems array are required.',
      });
    }

    const po = await PurchaseOrder.findById(poId).populate('vendorId');
    if (!po) {
      return res.status(404).json({
        success: false,
        message: 'Referenced Purchase Order not found.',
      });
    }

    // Must be in a receivable status
    const allowedStatuses = [
      'SENT',
      'ACKNOWLEDGED',
      'IN_TRANSIT',
      'PARTIALLY_RECEIVED',
      'DELIVERED',
    ];
    if (!allowedStatuses.includes(po.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot record receipt for PO in status '${po.status}'. PO must be dispatched/in transit.`,
      });
    }

    // Fetch previous receipts to calculate already received quantities
    const existingReceipts = await GoodsReceipt.find({ poId: po._id });
    const previouslyReceivedMap = {};
    existingReceipts.forEach((r) => {
      r.receivedItems.forEach((it) => {
        const k = it.itemName.trim().toLowerCase();
        previouslyReceivedMap[k] = (previouslyReceivedMap[k] || 0) + it.receivedQuantity;
      });
    });

    // Validate quantities against ordered quantities
    const processedItems = [];
    for (const item of receivedItems) {
      const recQty = Number(item.receivedQuantity || 0);
      const damQty = Number(item.damagedQuantity || 0);
      const k = item.itemName.trim().toLowerCase();

      const poItem = po.items.find((p) => p.itemName.trim().toLowerCase() === k);
      if (!poItem) {
        return res.status(400).json({
          success: false,
          message: `Item '${item.itemName}' was not found in Purchase Order ${po.poNumber}.`,
        });
      }

      const previouslyReceived = previouslyReceivedMap[k] || 0;
      const totalCumulative = previouslyReceived + recQty;

      // Rule 10: Received quantity cannot exceed ordered quantity
      if (totalCumulative > poItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Received quantity for '${item.itemName}' (${totalCumulative}) exceeds ordered quantity (${poItem.quantity}). Previously received: ${previouslyReceived}, Current: ${recQty}.`,
        });
      }

      processedItems.push({
        itemName: poItem.itemName,
        orderedQuantity: poItem.quantity,
        receivedQuantity: recQty,
        damagedQuantity: damQty,
      });
    }

    const receiptNumber = await generateGRNumber();

    const receipt = await GoodsReceipt.create({
      receiptNumber,
      poId: po._id,
      receivedBy: req.user._id,
      receivedItems: processedItems,
      receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
      condition: condition || 'GOOD',
      remarks: remarks || '',
    });

    // Check if PO is now fully received or partially received
    let isFullyReceived = true;
    po.items.forEach((poItem) => {
      const k = poItem.itemName.trim().toLowerCase();
      const prior = previouslyReceivedMap[k] || 0;
      const current = processedItems.find((p) => p.itemName.trim().toLowerCase() === k)?.receivedQuantity || 0;
      if (prior + current < poItem.quantity) {
        isFullyReceived = false;
      }
    });

    // Update PO status
    po.status = isFullyReceived ? 'DELIVERED' : 'PARTIALLY_RECEIVED';
    await po.save();

    await logAudit({
      userId: req.user._id,
      action: 'RECORD_RECEIPT',
      entityType: 'GoodsReceipt',
      entityId: receipt._id,
      description: `Goods receipt ${receipt.receiptNumber} recorded for PO ${po.poNumber}. Resulting PO status: ${po.status}.`,
      ipAddress: req.ip,
    });

    // Dispatch notifications to Purchase Manager and Finance
    await notifyRoles(['PURCHASE_MANAGER', 'FINANCE'], {
      type: 'GOODS_RECEIVED',
      title: isFullyReceived ? 'Goods Fully Received' : 'Partial Delivery Received',
      message: `Warehouse recorded goods receipt ${receipt.receiptNumber} for PO ${po.poNumber}. Delivery status is now ${po.status}.`,
      relatedEntity: 'GoodsReceipt',
      relatedEntityId: receipt._id,
    });

    res.status(201).json({
      success: true,
      message: `Goods receipt ${receipt.receiptNumber} recorded successfully.`,
      data: {
        receipt,
        poStatus: po.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReceipts,
  getReceiptById,
  createReceipt,
};
