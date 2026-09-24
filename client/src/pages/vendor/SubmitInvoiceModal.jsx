import React, { useState, useEffect } from 'react';
import { Receipt, Calendar, Calculator, AlertCircle, CheckCircle2 } from 'lucide-react';
import Modal from '../../components/common/Modal';
import api from '../../services/api';

export default function SubmitInvoiceModal({ isOpen, onClose, po, onSuccess }) {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (po) {
      setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
      setAmount(po.totalAmount || '');
      setError('');
    }
  }, [po]);

  if (!isOpen || !po) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!invoiceNumber || !invoiceDate || !dueDate || !amount) {
      setError('Please provide all required fields (Invoice Number, Dates, Amount).');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        invoiceNumber: invoiceNumber.trim(),
        poId: po._id,
        invoiceDate,
        dueDate,
        amount: Number(amount),
        remarks,
        items: po.items.map((i) => ({
          itemName: i.itemName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice,
        })),
      };

      const res = await api.post('/invoices', payload);
      if (res.data && res.data.success) {
        onSuccess && onSuccess(res.data.data);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Submit Invoice for ${po.poNumber}`} maxWidth="max-w-xl">
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
          <div>
            <span className="text-slate-400 block">Purchase Order</span>
            <span className="font-bold text-slate-800 font-mono">{po.poNumber}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block">PO Authorized Total</span>
            <span className="font-bold text-teal-700 font-mono">
              ₹{Number(po.totalAmount).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Invoice Reference No. *
            </label>
            <input
              type="text"
              required
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. INV-2026-0042"
              className="w-full text-sm font-mono border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Billed Invoice Amount (₹) *
            </label>
            <input
              type="number"
              required
              min={0}
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1200000"
              className="w-full text-sm font-mono font-bold border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Invoice Date *
            </label>
            <input
              type="date"
              required
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Payment Due Date *
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Notes / Payment Instructions
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Payment account details or delivery receipt references..."
            className="w-full text-xs border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Receipt className="w-4 h-4" />
            {loading ? 'Submitting...' : 'Submit Official Invoice'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
