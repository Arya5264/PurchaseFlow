const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
});

const discrepancySchema = new mongoose.Schema({
  field: { type: String, required: true },
  expected: { type: mongoose.Schema.Types.Mixed },
  actual: { type: mongoose.Schema.Types.Mixed },
  message: { type: String, required: true },
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      trim: true,
    },
    poId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: [true, 'Purchase Order reference is required'],
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor reference is required'],
    },
    invoiceDate: {
      type: Date,
      required: [true, 'Invoice date is required'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Invoice amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    items: [invoiceItemSchema],
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    matchStatus: {
      type: String,
      enum: ['PENDING', 'MATCHED', 'MISMATCHED', 'UNDER_REVIEW'],
      default: 'PENDING',
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID'],
      default: 'PENDING',
    },
    discrepancyDetails: [discrepancySchema],
    remarks: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ invoiceNumber: 1, vendorId: 1 }, { unique: true });
invoiceSchema.index({ poId: 1 });
invoiceSchema.index({ vendorId: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ matchStatus: 1 });
invoiceSchema.index({ paymentStatus: 1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);
module.exports = Invoice;
