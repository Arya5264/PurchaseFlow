const mongoose = require('mongoose');

const purchaseRequisitionSchema = new mongoose.Schema(
  {
    prNumber: {
      type: String,
      required: [true, 'PR Number is required'],
      unique: true,
      trim: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requester is required'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    estimatedCost: {
      type: Number,
      required: [true, 'Estimated cost is required'],
      min: [0, 'Estimated cost cannot be negative'],
    },
    requiredDate: {
      type: Date,
      required: [true, 'Required date is required'],
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PO_GENERATED', 'CANCELLED'],
      default: 'DRAFT',
    },
    remarks: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

purchaseRequisitionSchema.index({ status: 1 });
purchaseRequisitionSchema.index({ requestedBy: 1 });

const PurchaseRequisition = mongoose.model('PurchaseRequisition', purchaseRequisitionSchema);
module.exports = PurchaseRequisition;
