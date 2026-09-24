const Approval = require('../models/Approval');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const { logAudit } = require('../services/auditService');
const { notifyUser, notifyRoles } = require('../services/notificationService');

// @desc   Get pending requisitions awaiting approval
// @route  GET /api/approvals/pending
// @access Private (Approver, Admin)
const getPendingApprovals = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = { status: 'PENDING_APPROVAL' };

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { prNumber: searchRegex },
        { itemName: searchRegex },
        { department: searchRegex },
      ];
    }

    const total = await PurchaseRequisition.countDocuments(query);
    const requisitions = await PurchaseRequisition.find(query)
      .populate('requestedBy', 'name email department')
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

// @desc   Get approval history
// @route  GET /api/approvals/history
// @access Private (Approver, Admin)
const getApprovalHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.user.role === 'APPROVER') {
      query.approverId = req.user._id;
    }

    const total = await Approval.countDocuments(query);
    const approvals = await Approval.find(query)
      .populate({
        path: 'prId',
        populate: { path: 'requestedBy', select: 'name email' },
      })
      .populate('approverId', 'name email role')
      .sort({ decisionDate: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: approvals,
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

// @desc   Approve a requisition
// @route  POST /api/approvals/:id/approve
// @access Private (Approver, Admin)
const approveRequisition = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const requisition = await PurchaseRequisition.findById(req.params.id);

    if (!requisition) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Requisition not found.',
      });
    }

    if (requisition.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({
        success: false,
        message: `Requisition cannot be approved. Current status is '${requisition.status}'. Requisition must be in 'PENDING_APPROVAL' state.`,
      });
    }

    requisition.status = 'APPROVED';
    requisition.remarks = remarks || requisition.remarks;
    await requisition.save();

    const approval = await Approval.create({
      prId: requisition._id,
      approverId: req.user._id,
      decision: 'APPROVED',
      remarks: remarks || 'Approved without additional remarks.',
      decisionDate: new Date(),
    });

    await logAudit({
      userId: req.user._id,
      action: 'APPROVE_REQUISITION',
      entityType: 'PurchaseRequisition',
      entityId: requisition._id,
      description: `Requisition ${requisition.prNumber} approved by ${req.user.name}. Remarks: ${remarks || 'None'}`,
      ipAddress: req.ip,
    });

    // Notify requester
    await notifyUser({
      userId: requisition.requestedBy,
      type: 'PR_APPROVED',
      title: 'Requisition Approved',
      message: `Your requisition ${requisition.prNumber} for ${requisition.itemName} has been approved.`,
      relatedEntity: 'PurchaseRequisition',
      relatedEntityId: requisition._id,
    });

    // Notify Purchase Managers to generate PO
    await notifyRoles(['PURCHASE_MANAGER'], {
      type: 'PR_APPROVED',
      title: 'Approved Requisition Ready for PO',
      message: `Requisition ${requisition.prNumber} (${requisition.itemName}) has been approved and is ready for PO generation.`,
      relatedEntity: 'PurchaseRequisition',
      relatedEntityId: requisition._id,
    });

    res.status(200).json({
      success: true,
      message: `Purchase Requisition ${requisition.prNumber} approved successfully.`,
      data: {
        requisition,
        approval,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Reject a requisition
// @route  POST /api/approvals/:id/reject
// @access Private (Approver, Admin)
const rejectRequisition = async (req, res, next) => {
  try {
    const { remarks } = req.body;

    if (!remarks || remarks.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Rejection remarks are mandatory. Please provide a reason for rejection.',
      });
    }

    const requisition = await PurchaseRequisition.findById(req.params.id);

    if (!requisition) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Requisition not found.',
      });
    }

    if (requisition.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({
        success: false,
        message: `Requisition cannot be rejected. Current status is '${requisition.status}'. Only PENDING_APPROVAL requisitions can be rejected.`,
      });
    }

    requisition.status = 'REJECTED';
    requisition.remarks = remarks;
    await requisition.save();

    const approval = await Approval.create({
      prId: requisition._id,
      approverId: req.user._id,
      decision: 'REJECTED',
      remarks,
      decisionDate: new Date(),
    });

    await logAudit({
      userId: req.user._id,
      action: 'REJECT_REQUISITION',
      entityType: 'PurchaseRequisition',
      entityId: requisition._id,
      description: `Requisition ${requisition.prNumber} rejected by ${req.user.name}. Reason: ${remarks}`,
      ipAddress: req.ip,
    });

    // Notify requester
    await notifyUser({
      userId: requisition.requestedBy,
      type: 'PR_REJECTED',
      title: 'Requisition Rejected',
      message: `Your requisition ${requisition.prNumber} was rejected. Reason: ${remarks}`,
      relatedEntity: 'PurchaseRequisition',
      relatedEntityId: requisition._id,
    });

    res.status(200).json({
      success: true,
      message: `Purchase Requisition ${requisition.prNumber} rejected.`,
      data: {
        requisition,
        approval,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPendingApprovals,
  getApprovalHistory,
  approveRequisition,
  rejectRequisition,
};
