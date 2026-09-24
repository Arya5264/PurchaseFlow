const mongoose = require('mongoose');

const poLineItemSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  unitPrice: {
    type: Number,
    required: true,
    min: [0, 'Unit price cannot be negative'],
  },
  taxRate: {
    type: Number,
    default: 0,
    min: [0, 'Tax rate cannot be negative'],
  },
  totalPrice: {
    type: Number,
    required: true,
  },
});

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      required: [true, 'PO Number is required'],
      unique: true,
      trim: true,
    },
    prId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseRequisition',
      required: [true, 'Purchase Requisition reference is required'],
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor reference is required'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
    items: [poLineItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryDate: {
      type: Date,
      required: [true, 'Delivery date is required'],
    },
    status: {
      type: String,
      enum: [
        'GENERATED',
        'SENT',
        'ACKNOWLEDGED',
        'IN_TRANSIT',
        'PARTIALLY_RECEIVED',
        'DELIVERED',
        'INVOICE_PENDING',
        'PAYMENT_PENDING',
        'PAID',
        'CLOSED',
        'CANCELLED',
      ],
      default: 'GENERATED',
    },
    sentAt: {
      type: Date,
    },
    acknowledgedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

purchaseOrderSchema.index({ vendorId: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ prId: 1 });

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
module.exports = PurchaseOrder;
