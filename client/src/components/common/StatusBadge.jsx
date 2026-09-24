import React from 'react';

export default function StatusBadge({ status, type = 'default' }) {
  if (!status) return null;

  const getStyle = (st) => {
    switch (st.toUpperCase()) {
      // Positive / Success
      case 'APPROVED':
      case 'MATCHED':
      case 'DELIVERED':
      case 'PAID':
      case 'ACTIVE':
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20';

      // Negative / Danger
      case 'REJECTED':
      case 'MISMATCHED':
      case 'SUSPENDED':
      case 'CANCELLED':
      case 'DAMAGED':
        return 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/20';

      // Pending / In progress
      case 'PENDING':
      case 'PENDING_APPROVAL':
      case 'PAYMENT_PENDING':
      case 'INVOICE_PENDING':
      case 'PARTIALLY_RECEIVED':
      case 'PARTIAL':
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20';

      // Logistics / In Transit
      case 'IN_TRANSIT':
      case 'SENT':
      case 'ACKNOWLEDGED':
        return 'bg-sky-50 text-sky-700 border-sky-200 ring-sky-600/20';

      // Neutral / Initial
      case 'DRAFT':
      case 'GENERATED':
      case 'PO_GENERATED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-600/20';

      case 'CLOSED':
      case 'INACTIVE':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-600/20';
    }
  };

  const formatText = (st) => {
    return st.replace(/_/g, ' ');
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border shadow-xs ${getStyle(
        status
      )}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
      {formatText(status)}
    </span>
  );
}
