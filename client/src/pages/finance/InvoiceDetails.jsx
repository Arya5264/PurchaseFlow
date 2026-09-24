import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  CreditCard,
  AlertTriangle,
  Receipt,
  FileText,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import api from '../../services/api';
import ThreeWayMatchComparison from '../../components/matching/ThreeWayMatchComparison';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import StatusBadge from '../../components/common/StatusBadge';

export default function InvoiceDetails() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successBanner, setSuccessBanner] = useState('');

  // Modals
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [transactionReference, setTransactionReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [overrideMismatch, setOverrideMismatch] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchInvoiceData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/invoices/${id}`);
      if (res.data && res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceData();
  }, [id]);

  const handleReevaluateMatch = async () => {
    try {
      setActionLoading(true);
      const res = await api.post(`/invoices/${id}/match`);
      setSuccessBanner(`Three-Way Match re-calculated: Result is ${res.data?.data?.invoice?.matchStatus}.`);
      setTimeout(() => setSuccessBanner(''), 4000);
      fetchInvoiceData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to re-run 3-way match');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveInvoice = async () => {
    try {
      setActionLoading(true);
      await api.post(`/invoices/${id}/approve`, { remarks: 'Verified by Finance Officer' });
      setSuccessBanner('Invoice approved successfully. Queued for payment disbursement.');
      setTimeout(() => setSuccessBanner(''), 4000);
      fetchInvoiceData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectInvoice = async (e) => {
    e.preventDefault();
    if (!rejectRemarks.trim()) {
      setModalError('Rejection remarks are mandatory.');
      return;
    }

    try {
      setActionLoading(true);
      setModalError('');
      await api.post(`/invoices/${id}/reject`, { remarks: rejectRemarks.trim() });
      setIsRejectOpen(false);
      setSuccessBanner('Invoice has been rejected. Notification sent to supplier.');
      setTimeout(() => setSuccessBanner(''), 4000);
      fetchInvoiceData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to reject invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    const invoice = data?.invoice;
    if (invoice?.matchStatus === 'MISMATCHED' && !overrideMismatch) {
      setModalError('You must check the authorization override to pay a mismatched invoice.');
      return;
    }

    try {
      setActionLoading(true);
      setModalError('');
      const payload = {
        paymentMethod,
        transactionReference: transactionReference.trim() || `TXN-${Date.now()}`,
        notes: paymentNotes,
        overrideMismatch,
      };

      const res = await api.post(`/invoices/${id}/pay`, payload);
      setIsPayOpen(false);
      setSuccessBanner(
        `Payment processed of ₹${Number(invoice.amount).toLocaleString('en-IN')}. Purchase Order ${res.data?.data?.purchaseOrder?.poNumber || ''} is now CLOSED.`
      );
      setTimeout(() => setSuccessBanner(''), 6000);
      fetchInvoiceData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to process payment');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Analyzing Three-Way Reconciliation..." size="large" />;
  if (error) return <ErrorState message={error} onRetry={fetchInvoiceData} />;
  if (!data?.invoice) return <ErrorState message="Invoice not found." />;

  const invoice = data.invoice;
  const po = invoice.poId;
  const receipts = data.receipts || [];
  const isPaid = invoice.paymentStatus === 'PAID';
  const isApproved = invoice.status === 'APPROVED';
  const isRejected = invoice.status === 'REJECTED';
  const isMismatched = invoice.matchStatus === 'MISMATCHED';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/finance/invoices"
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold font-mono text-slate-800">{invoice.invoiceNumber}</h1>
              <StatusBadge status={invoice.matchStatus} />
              <StatusBadge status={invoice.status} />
              {isPaid && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> SETTLED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Vendor: <span className="font-semibold text-slate-700">{invoice.vendorId?.name}</span> • PO:{' '}
              <span className="font-mono font-semibold text-teal-600">{po?.poNumber}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleReevaluateMatch}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-2xs cursor-pointer disabled:opacity-50"
            title="Re-run 3-Way Reconciliation with latest warehouse receipts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
            Re-evaluate Match
          </button>

          {!isApproved && !isPaid && !isRejected && (
            <>
              <button
                onClick={() => {
                  setRejectRemarks('');
                  setModalError('');
                  setIsRejectOpen(true);
                }}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject Invoice
              </button>

              <button
                onClick={handleApproveInvoice}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve Invoice
              </button>
            </>
          )}

          {isApproved && !isPaid && (
            <button
              onClick={() => {
                setTransactionReference(`TXN-${Date.now().toString().slice(-8)}`);
                setOverrideMismatch(false);
                setModalError('');
                setIsPayOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition shadow-xs cursor-pointer"
            >
              <CreditCard className="w-4 h-4" /> Disburse Payment
            </button>
          )}
        </div>
      </div>

      {successBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Embedded High-Fidelity Three-Way Match Engine */}
      <ThreeWayMatchComparison
        po={po}
        receipts={receipts}
        invoice={invoice}
        comparison={data.matchComparison}
        discrepancies={data.discrepancyDetails}
      />

      {/* Supplier Banking and Payment Summary Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-teal-600" /> Supplier Remittance Account
          </h3>
          <div className="space-y-1.5 text-xs text-slate-600">
            <p className="font-bold text-sm text-slate-800">{invoice.vendorId?.name}</p>
            <p className="text-slate-500">Bank Name: {invoice.vendorId?.bankDetails?.bankName || 'State Bank of India'}</p>
            <p className="text-slate-500 font-mono">
              Account No: {invoice.vendorId?.bankDetails?.accountNumber || '102938475612'}
            </p>
            <p className="text-slate-500 font-mono">
              IFSC Code: {invoice.vendorId?.bankDetails?.ifscCode || 'SBIN0001234'}
            </p>
            <p className="text-slate-500">GST Registration: {invoice.vendorId?.gstNumber}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-teal-600" /> Invoice Audit Remarks
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Invoice Billed Date:</span>
              <span className="font-medium text-slate-800">
                {new Date(invoice.invoiceDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Payment Due Date:</span>
              <span className="font-medium text-slate-800">
                {new Date(invoice.dueDate).toLocaleDateString()}
              </span>
            </div>
            <div className="py-1">
              <span className="text-slate-400 block mb-0.5">Remarks / Audit Trail:</span>
              <span className="font-medium text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 block">
                {invoice.remarks || 'No notes added'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Invoice Modal */}
      <Modal isOpen={isRejectOpen} onClose={() => setIsRejectOpen(false)} title="Reject Vendor Invoice">
        {modalError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{modalError}</span>
          </div>
        )}
        <form onSubmit={handleRejectInvoice} className="space-y-4">
          <p className="text-xs text-slate-600">
            Please enter the justification for rejecting invoice <span className="font-bold">{invoice.invoiceNumber}</span>.
            The vendor will be notified to issue a revised invoice.
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Rejection Remarks *
            </label>
            <textarea
              required
              rows={3}
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
              placeholder="e.g. Unit prices mismatch the agreed PO contract, or goods received do not match billed quantity..."
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRejectOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
            >
              Confirm Rejection
            </button>
          </div>
        </form>
      </Modal>

      {/* Disburse Payment Modal */}
      <Modal
        isOpen={isPayOpen}
        onClose={() => setIsPayOpen(false)}
        title={`Disburse Payment for ${invoice.invoiceNumber}`}
      >
        {modalError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{modalError}</span>
          </div>
        )}

        <form onSubmit={handleProcessPayment} className="space-y-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-400 block">Beneficiary</span>
              <span className="font-bold text-slate-800">{invoice.vendorId?.name}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block">Disbursement Amount</span>
              <span className="font-bold text-base font-mono text-teal-700">
                ₹{Number(invoice.amount).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {isMismatched && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
              <div className="flex items-start gap-2 text-amber-800 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  CRITICAL: This invoice has 3-way match discrepancies. Disbursing funds requires written executive authorization.
                </span>
              </div>
              <label className="flex items-center gap-2 pt-1 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overrideMismatch}
                  onChange={(e) => setOverrideMismatch(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>I confirm documented Finance Manager override to authorize payment</span>
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Payment Channel *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
              >
                <option value="BANK_TRANSFER">NEFT / RTGS Bank Transfer</option>
                <option value="UPI">Corporate UPI / Immediate Transfer</option>
                <option value="CHEQUE">Cheque Disbursement</option>
                <option value="CREDIT_LINE">Corporate Credit Line</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Transaction / UTR Reference *
              </label>
              <input
                type="text"
                required
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Payment Voucher Notes
            </label>
            <textarea
              rows={2}
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Treasury reference or settlement ledger remarks..."
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
            />
          </div>

          <p className="text-[11px] text-slate-500">
            Note: Disbursing payment will mark the Invoice as <span className="font-bold text-slate-700">PAID</span> and transition Purchase Order <span className="font-bold text-slate-700">{po?.poNumber}</span> to <span className="font-bold text-slate-700">CLOSED</span>.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPayOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading || (isMismatched && !overrideMismatch)}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition cursor-pointer disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4" />
              {actionLoading ? 'Processing...' : 'Disburse Funds & Close PO'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
