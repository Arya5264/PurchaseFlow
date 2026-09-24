const mongoose = require('mongoose');

const approvalSchema = new mongoose.Schema(
  {
    prId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseRequisition',
      required: [true, 'Purchase Requisition reference is required'],
    },
    approverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Approver reference is required'],
    },
    decision: {
      type: String,
      enum: ['APPROVED', 'REJECTED'],
      required: [true, 'Decision is required'],
    },
    remarks: {
      type: String,
      default: '',
    },
    decisionDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

approvalSchema.index({ prId: 1 });
approvalSchema.index({ approverId: 1 });

const Approval = mongoose.model('Approval', approvalSchema);
module.exports = Approval;
