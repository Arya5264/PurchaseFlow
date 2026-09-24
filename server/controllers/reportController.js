const User = require('../models/User');
const Vendor = require('../models/Vendor');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const PurchaseOrder = require('../models/PurchaseOrder');
const GoodsReceipt = require('../models/GoodsReceipt');
const Invoice = require('../models/Invoice');
const Approval = require('../models/Approval');

// @desc   Get role-tailored dashboard metrics
// @route  GET /api/reports/dashboard
// @access Private
const getDashboardMetrics = async (req, res, next) => {
  try {
    const role = req.user.role;
    let metrics = {};

    switch (role) {
      case 'ADMIN': {
        const [
          totalUsers,
          totalVendors,
          totalPRs,
          totalPOs,
          totalInvoices,
          pendingApprovals,
          pendingPayments,
          poSpend,
        ] = await Promise.all([
          User.countDocuments(),
          Vendor.countDocuments(),
          PurchaseRequisition.countDocuments(),
          PurchaseOrder.countDocuments(),
          Invoice.countDocuments(),
          PurchaseRequisition.countDocuments({ status: 'PENDING_APPROVAL' }),
          Invoice.countDocuments({ status: 'APPROVED', paymentStatus: 'PENDING' }),
          PurchaseOrder.aggregate([
            { $match: { status: { $nin: ['CANCELLED'] } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } },
          ]),
        ]);

        metrics = {
          totalUsers,
          totalVendors,
          totalPRs,
          totalPOs,
          totalInvoices,
          pendingApprovals,
          pendingPayments,
          totalPurchaseValue: poSpend[0]?.total || 0,
        };
        break;
      }

      case 'PURCHASE_MANAGER': {
        const [
          totalPRs,
          pendingApprovals,
          approvedPRs,
          rejectedPRs,
          activePOs,
          pendingDeliveries,
          recentPRs,
        ] = await Promise.all([
          PurchaseRequisition.countDocuments(),
          PurchaseRequisition.countDocuments({ status: 'PENDING_APPROVAL' }),
          PurchaseRequisition.countDocuments({ status: 'APPROVED' }),
          PurchaseRequisition.countDocuments({ status: 'REJECTED' }),
          PurchaseOrder.countDocuments({ status: { $in: ['GENERATED', 'SENT', 'ACKNOWLEDGED', 'IN_TRANSIT'] } }),
          PurchaseOrder.countDocuments({ status: { $in: ['SENT', 'ACKNOWLEDGED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED'] } }),
          PurchaseRequisition.find().sort({ createdAt: -1 }).limit(5),
        ]);

        metrics = {
          totalPRs,
          pendingApprovals,
          approvedPRs,
          rejectedPRs,
          activePOs,
          pendingDeliveries,
          recentPRs,
        };
        break;
      }

      case 'APPROVER': {
        const [pendingApprovals, approvedCount, rejectedCount, recentRequests] = await Promise.all([
          PurchaseRequisition.countDocuments({ status: 'PENDING_APPROVAL' }),
          Approval.countDocuments({ approverId: req.user._id, decision: 'APPROVED' }),
          Approval.countDocuments({ approverId: req.user._id, decision: 'REJECTED' }),
          PurchaseRequisition.find({ status: 'PENDING_APPROVAL' })
            .populate('requestedBy', 'name email department')
            .sort({ createdAt: -1 })
            .limit(5),
        ]);

        metrics = {
          pendingApprovals,
          approved: approvedCount,
          rejected: rejectedCount,
          recentRequests,
        };
        break;
      }

      case 'VENDOR': {
        const vendorId = req.user.vendorId ? req.user.vendorId._id || req.user.vendorId : null;
        if (!vendorId) {
          metrics = { totalPOs: 0, pendingAcknowledgement: 0, activeOrders: 0, completedOrders: 0, pendingInvoices: 0 };
        } else {
          const [totalPOs, pendingAck, activeOrders, completedOrders, pendingInvoices] = await Promise.all([
            PurchaseOrder.countDocuments({ vendorId }),
            PurchaseOrder.countDocuments({ vendorId, status: 'SENT' }),
            PurchaseOrder.countDocuments({ vendorId, status: { $in: ['ACKNOWLEDGED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED'] } }),
            PurchaseOrder.countDocuments({ vendorId, status: { $in: ['PAID', 'CLOSED'] } }),
            Invoice.countDocuments({ vendorId, paymentStatus: 'PENDING' }),
          ]);

          metrics = {
            totalPOs,
            pendingAcknowledgement: pendingAck,
            activeOrders,
            completedOrders,
            pendingInvoices,
          };
        }
        break;
      }

      case 'WAREHOUSE': {
        const [expectedDeliveries, pendingReceipts, partialReceipts, completedReceipts] = await Promise.all([
          PurchaseOrder.countDocuments({ status: { $in: ['SENT', 'ACKNOWLEDGED', 'IN_TRANSIT'] } }),
          PurchaseOrder.countDocuments({ status: 'IN_TRANSIT' }),
          PurchaseOrder.countDocuments({ status: 'PARTIALLY_RECEIVED' }),
          GoodsReceipt.countDocuments(),
        ]);

        metrics = {
          expectedDeliveries,
          pendingReceipts,
          partialReceipts,
          completedReceipts,
        };
        break;
      }

      case 'FINANCE': {
        const [
          pendingInvoices,
          matchedCount,
          mismatchedCount,
          approvedCount,
          paidCount,
          payableSum,
        ] = await Promise.all([
          Invoice.countDocuments({ status: 'PENDING' }),
          Invoice.countDocuments({ matchStatus: 'MATCHED' }),
          Invoice.countDocuments({ matchStatus: 'MISMATCHED' }),
          Invoice.countDocuments({ status: 'APPROVED', paymentStatus: 'PENDING' }),
          Invoice.countDocuments({ paymentStatus: 'PAID' }),
          Invoice.aggregate([
            { $match: { paymentStatus: 'PENDING' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ]),
        ]);

        metrics = {
          pendingInvoices,
          matched: matchedCount,
          mismatched: mismatchedCount,
          approved: approvedCount,
          paid: paidCount,
          totalPayable: payableSum[0]?.total || 0,
        };
        break;
      }

      default:
        metrics = {};
    }

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get comprehensive purchase reports
// @route  GET /api/reports/purchases
// @access Private (Admin, Purchase Manager, Finance)
const getPurchaseReports = async (req, res, next) => {
  try {
    // 1. Monthly Purchase Spend
    const monthlySpend = await PurchaseOrder.aggregate([
      { $match: { status: { $nin: ['CANCELLED'] } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 2. Spend by Vendor
    const spendByVendor = await PurchaseOrder.aggregate([
      { $match: { status: { $nin: ['CANCELLED'] } } },
      {
        $group: {
          _id: '$vendorId',
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'vendors',
          localField: '_id',
          foreignField: '_id',
          as: 'vendor',
        },
      },
      { $unwind: '$vendor' },
      {
        $project: {
          vendorName: '$vendor.name',
          vendorCode: '$vendor.vendorCode',
          totalAmount: 1,
          count: 1,
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    // 3. Requisitions by Department
    const requisitionsByDept = await PurchaseRequisition.aggregate([
      {
        $group: {
          _id: '$department',
          totalEstimatedCost: { $sum: '$estimatedCost' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalEstimatedCost: -1 } },
    ]);

    // 4. Status Distributions
    const [prStatuses, poStatuses, invoiceStatuses] = await Promise.all([
      PurchaseRequisition.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      PurchaseOrder.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Invoice.aggregate([{ $group: { _id: '$matchStatus', count: { $sum: 1 } } }]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        monthlySpend: monthlySpend.map((m) => ({ month: m._id, amount: m.totalAmount, count: m.count })),
        spendByVendor,
        requisitionsByDept: requisitionsByDept.map((d) => ({ department: d._id, cost: d.totalEstimatedCost, count: d.count })),
        prStatuses: prStatuses.map((s) => ({ status: s._id, count: s.count })),
        poStatuses: poStatuses.map((s) => ({ status: s._id, count: s.count })),
        invoiceStatuses: invoiceStatuses.map((s) => ({ status: s._id, count: s.count })),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardMetrics,
  getPurchaseReports,
};
