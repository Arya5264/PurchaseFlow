const PurchaseRequisition = require('../models/PurchaseRequisition');
const { logAudit } = require('../services/auditService');
const { notifyRoles } = require('../services/notificationService');

// Helper to generate next PR number
const generatePRNumber = async () => {
  const currentYear = new Date().getFullYear();
  const latestPR = await PurchaseRequisition.findOne({
    prNumber: new RegExp(`^PR-${currentYear}-`),
  }).sort({ prNumber: -1 });

  let seq = 1;
  if (latestPR && latestPR.prNumber) {
    const parts = latestPR.prNumber.split('-');
    if (parts.length === 3) {
      seq = parseInt(parts[2], 10) + 1;
    }
  }
  return `PR-${currentYear}-${String(seq).padStart(4, '0')}`;
};

// @desc   Get all requisitions
// @route  GET /api/requisitions
// @access Private
const getRequisitions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { prNumber: searchRegex },
        { itemName: searchRegex },
        { department: searchRegex },
        { description: searchRegex },
      ];
    }

    if (req.query.status) {
      query.status = req.query.status.toUpperCase();
    }

    if (req.query.department) {
      query.department = new RegExp(req.query.department, 'i');
    }

    const total = await PurchaseRequisition.countDocuments(query);
    const requisitions = await PurchaseRequisition.find(query)
      .populate('requestedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: requisitions,
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

// @desc   Get single requisition
// @route  GET /api/requisitions/:id
// @access Private
const getRequisitionById = async (req, res, next) => {
  try {
    const requisition = await PurchaseRequisition.findById(req.params.id).populate(
      'requestedBy',
      'name email role'
    );

    if (!requisition) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Requisition not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: requisition,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Create new Purchase Requisition
// @route  POST /api/requisitions
// @access Private (Purchase Manager, Admin)
const createRequisition = async (req, res, next) => {
  try {
    const { department, itemName, description, quantity, estimatedCost, requiredDate, submitDirectly } = req.body;

    if (!department || !itemName || quantity === undefined || estimatedCost === undefined || !requiredDate) {
      return res.status(400).json({
        success: false,
        message: 'Department, item name, quantity, estimated cost, and required date are required.',
      });
    }

    if (Number(quantity) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than zero.',
      });
    }

    if (Number(estimatedCost) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Estimated cost cannot be negative.',
      });
    }

    const prNumber = await generatePRNumber();
    const initialStatus = submitDirectly ? 'PENDING_APPROVAL' : 'DRAFT';

    const requisition = await PurchaseRequisition.create({
      prNumber,
      requestedBy: req.user._id,
      department,
      itemName,
      description: description || '',
      quantity: Number(quantity),
      estimatedCost: Number(estimatedCost),
      requiredDate: new Date(requiredDate),
      status: initialStatus,
    });

    await logAudit({
      userId: req.user._id,
      action: 'CREATE_REQUISITION',
      entityType: 'PurchaseRequisition',
      entityId: requisition._id,
      description: `Created requisition ${requisition.prNumber} (${requisition.itemName}) in status ${initialStatus}.`,
      ipAddress: req.ip,
    });

    if (initialStatus === 'PENDING_APPROVAL') {
      await notifyRoles(['APPROVER', 'ADMIN'], {
        type: 'PR_SUBMITTED',
        title: 'New Requisition Submitted',
        message: `Requisition ${requisition.prNumber} for ${requisition.itemName} (₹${requisition.estimatedCost.toLocaleString()}) awaits your approval.`,
        relatedEntity: 'PurchaseRequisition',
        relatedEntityId: requisition._id,
      });
    }

    res.status(201).json({
      success: true,
      message: submitDirectly
        ? 'Purchase Requisition submitted for approval.'
        : 'Purchase Requisition saved as draft.',
      data: requisition,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Update draft requisition
// @route  PUT /api/requisitions/:id
// @access Private (Purchase Manager, Admin)
const updateRequisition = async (req, res, next) => {
  try {
    const requisition = await PurchaseRequisition.findById(req.params.id);

    if (!requisition) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Requisition not found.',
      });
    }

    if (requisition.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit requisition in '${requisition.status}' status. Only DRAFT requisitions can be edited.`,
      });
    }

    const { department, itemName, description, quantity, estimatedCost, requiredDate } = req.body;

    if (department) requisition.department = department;
    if (itemName) requisition.itemName = itemName;
    if (description !== undefined) requisition.description = description;
    if (quantity !== undefined) requisition.quantity = Number(quantity);
    if (estimatedCost !== undefined) requisition.estimatedCost = Number(estimatedCost);
    if (requiredDate) requisition.requiredDate = new Date(requiredDate);

    await requisition.save();

    await logAudit({
      userId: req.user._id,
      action: 'UPDATE_REQUISITION',
      entityType: 'PurchaseRequisition',
      entityId: requisition._id,
      description: `Updated draft requisition ${requisition.prNumber}.`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Purchase Requisition updated successfully.',
      data: requisition,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Submit draft requisition for approval
// @route  POST /api/requisitions/:id/submit
// @access Private (Purchase Manager, Admin)
const submitRequisition = async (req, res, next) => {
  try {
    const requisition = await PurchaseRequisition.findById(req.params.id);

    if (!requisition) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Requisition not found.',
      });
    }

    if (requisition.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: `Only DRAFT requisitions can be submitted. Current status is '${requisition.status}'.`,
      });
    }

    requisition.status = 'PENDING_APPROVAL';
    await requisition.save();

    await logAudit({
      userId: req.user._id,
      action: 'SUBMIT_REQUISITION',
      entityType: 'PurchaseRequisition',
      entityId: requisition._id,
      description: `Submitted requisition ${requisition.prNumber} for approval.`,
      ipAddress: req.ip,
    });

    await notifyRoles(['APPROVER', 'ADMIN'], {
      type: 'PR_SUBMITTED',
      title: 'Requisition Submitted for Approval',
      message: `Requisition ${requisition.prNumber} for ${requisition.itemName} is pending review.`,
      relatedEntity: 'PurchaseRequisition',
      relatedEntityId: requisition._id,
    });

    res.status(200).json({
      success: true,
      message: 'Purchase Requisition submitted for approval.',
      data: requisition,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Cancel requisition
// @route  POST /api/requisitions/:id/cancel
// @access Private (Purchase Manager, Admin)
const cancelRequisition = async (req, res, next) => {
  try {
    const requisition = await PurchaseRequisition.findById(req.params.id);

    if (!requisition) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Requisition not found.',
      });
    }

    if (['APPROVED', 'PO_GENERATED', 'CANCELLED'].includes(requisition.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel requisition in '${requisition.status}' status.`,
      });
    }

    requisition.status = 'CANCELLED';
    requisition.remarks = req.body.remarks || 'Cancelled by user';
    await requisition.save();

    await logAudit({
      userId: req.user._id,
      action: 'CANCEL_REQUISITION',
      entityType: 'PurchaseRequisition',
      entityId: requisition._id,
      description: `Cancelled requisition ${requisition.prNumber}.`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Purchase Requisition cancelled successfully.',
      data: requisition,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRequisitions,
  getRequisitionById,
  createRequisition,
  updateRequisition,
  submitRequisition,
  cancelRequisition,
};
