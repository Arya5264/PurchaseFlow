const mongoose = require('mongoose');

const receivedItemSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
    trim: true,
  },
  orderedQuantity: {
    type: Number,
    required: true,
    min: 0,
  },
  receivedQuantity: {
    type: Number,
    required: true,
    min: 0,
  },
  damagedQuantity: {
    type: Number,
    default: 0,
    min: 0,
  },
});

const goodsReceiptSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: [true, 'Receipt Number is required'],
      unique: true,
      trim: true,
    },
    poId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: [true, 'Purchase Order reference is required'],
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Received by User is required'],
    },
    receivedItems: [receivedItemSchema],
    receivedDate: {
      type: Date,
      default: Date.now,
    },
    condition: {
      type: String,
      enum: ['EXCELLENT', 'GOOD', 'DAMAGED', 'PARTIAL'],
      default: 'GOOD',
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

goodsReceiptSchema.index({ poId: 1 });
goodsReceiptSchema.index({ receivedDate: -1 });

const GoodsReceipt = mongoose.model('GoodsReceipt', goodsReceiptSchema);
module.exports = GoodsReceipt;
