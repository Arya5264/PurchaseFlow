import React from 'react';
import { CheckCircle2, AlertTriangle, FileText, PackageCheck, Receipt, ArrowRight } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

export default function ThreeWayMatchComparison({
  po,
  receipts = [],
  invoice,
  comparison,
  discrepancies = [],
}) {
  const isMatched = invoice?.matchStatus === 'MATCHED';

  // Aggregate received items across all receipts
  const receivedTotals = {};
  receipts.forEach((rcpt) => {
    rcpt.receivedItems?.forEach((item) => {
      const key = item.itemName.trim().toLowerCase();
      receivedTotals[key] = (receivedTotals[key] || 0) + item.receivedQuantity;
    });
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Status */}
      <div
        className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isMatched
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            : 'bg-rose-50/80 border-rose-200 text-rose-900'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`p-2.5 rounded-xl ${
              isMatched ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {isMatched ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base tracking-tight">
                {isMatched ? 'Three-Way Match Verified' : 'Three-Way Match Discrepancy Detected'}
              </h3>
              <StatusBadge status={invoice?.matchStatus || 'PENDING'} />
            </div>
            <p className="text-xs mt-0.5 opacity-90">
              {isMatched
                ? 'Purchase Order, warehouse goods receipts, and vendor invoice quantities & amounts match perfectly.'
                : 'Discrepancies found between PO, warehouse receipt, and invoice. Payment requires review or resolution.'}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-xs font-semibold uppercase tracking-wider block opacity-75">
            Invoice Total
          </span>
          <span className="text-xl font-extrabold">₹{Number(invoice?.amount || 0).toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Discrepancies Details List (if any) */}
      {discrepancies && discrepancies.length > 0 && (
        <div className="bg-white rounded-xl border border-rose-200 p-4 shadow-2xs">
          <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Detected Variances ({discrepancies.length})
          </h4>
          <ul className="space-y-2">
            {discrepancies.map((d, index) => (
              <li
                key={index}
                className="text-xs bg-rose-50/70 border border-rose-100 rounded-lg p-3 text-rose-800 flex items-start justify-between gap-3"
              >
                <div>
                  <span className="font-bold">{d.field}:</span> {d.message}
                </div>
                {d.expected !== undefined && d.actual !== undefined && (
                  <div className="shrink-0 text-[11px] font-mono bg-white px-2 py-1 rounded border border-rose-200 text-slate-700">
                    Exp: {String(d.expected)} | Act: {String(d.actual)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Three Columns Visual Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Purchase Order Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2 text-slate-800">
              <FileText className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-bold uppercase tracking-wider">Purchase Order</span>
            </div>
            <StatusBadge status={po?.status || 'GENERATED'} />
          </div>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">PO Number:</span>
              <span className="font-semibold text-slate-800">{po?.poNumber || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Vendor:</span>
              <span className="font-semibold text-slate-800">{po?.vendorId?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Amount:</span>
              <span className="font-semibold text-slate-800">₹{Number(po?.totalAmount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Items Ordered:</span>
              <span className="font-semibold text-slate-800">{po?.items?.length || 0} line items</span>
            </div>
          </div>
        </div>

        {/* 2. Goods Receipts Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2 text-slate-800">
              <PackageCheck className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-bold uppercase tracking-wider">Goods Receipts</span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {receipts.length} Recorded
            </span>
          </div>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">Receipts Found:</span>
              <span className="font-semibold text-slate-800">{receipts.length} deliveries</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Latest Receipt:</span>
              <span className="font-semibold text-slate-800">
                {receipts[0]?.receiptNumber || 'None yet'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Inspection Condition:</span>
              <span className="font-semibold text-slate-800">{receipts[0]?.condition || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Received Date:</span>
              <span className="font-semibold text-slate-800">
                {receipts[0]?.receivedDate ? new Date(receipts[0].receivedDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Invoice Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2 text-slate-800">
              <Receipt className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold uppercase tracking-wider">Vendor Invoice</span>
            </div>
            <StatusBadge status={invoice?.status || 'PENDING'} />
          </div>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">Invoice No:</span>
              <span className="font-semibold text-slate-800">{invoice?.invoiceNumber || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Invoice Date:</span>
              <span className="font-semibold text-slate-800">
                {invoice?.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Due Date:</span>
              <span className="font-semibold text-slate-800">
                {invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Billed Amount:</span>
              <span className="font-semibold text-slate-800">₹{Number(invoice?.amount || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Line Item Comparison Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Line Items 3-Way Reconciliation
          </h4>
          <span className="text-xs text-slate-500 font-medium">Comparison of PO vs Goods Receipt vs Invoice</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Item Name</th>
                <th className="px-4 py-3 text-center">1. PO Ordered</th>
                <th className="px-4 py-3 text-center">2. Warehouse Received</th>
                <th className="px-4 py-3 text-center">3. Invoice Billed</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Line Total</th>
                <th className="px-4 py-3 text-center">Reconciliation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {po?.items?.map((item, idx) => {
                const k = item.itemName.trim().toLowerCase();
                const recQty = receivedTotals[k] || 0;
                const invItem = invoice?.items?.find((i) => i.itemName.trim().toLowerCase() === k);
                const invQty = invItem ? invItem.quantity : item.quantity;
                const isLineMatched = recQty >= invQty && invQty <= item.quantity;

                return (
                  <tr
                    key={idx}
                    className={`transition hover:bg-slate-50/60 ${
                      !isLineMatched ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {item.itemName}
                      {item.description && (
                        <span className="block text-[11px] font-normal text-slate-400">
                          {item.description}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-slate-700">
                      {item.quantity} units
                    </td>
                    <td
                      className={`px-4 py-3 text-center font-bold ${
                        recQty >= invQty ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {recQty} units
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-slate-700">
                      {invQty} units
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      ₹{Number(item.unitPrice).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
                      ₹{Number(item.totalPrice).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isLineMatched ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> MATCHED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <AlertTriangle className="w-3 h-3" /> MISMATCH
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
