import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ShoppingCart, Calculator, AlertCircle } from 'lucide-react';
import api from '../../services/api';

export default function CreatePurchaseOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPrId = searchParams.get('prId') || '';

  const [approvedPRs, setApprovedPRs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [selectedPrId, setSelectedPrId] = useState(initialPrId);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  const [items, setItems] = useState([
    {
      itemName: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 18,
    },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const [prsRes, vendorsRes] = await Promise.all([
          api.get('/requisitions?status=APPROVED&limit=50'),
          api.get('/vendors?status=ACTIVE&limit=100'),
        ]);

        if (prsRes.data && prsRes.data.success) {
          setApprovedPRs(prsRes.data.data);
          // If initialPrId matched, populate default item
          const targetPR = prsRes.data.data.find((p) => p._id === initialPrId);
          if (targetPR) {
            const unitPrice = Math.round((targetPR.estimatedCost / (targetPR.quantity || 1) / 1.18) * 100) / 100;
            setItems([
              {
                itemName: targetPR.itemName,
                description: targetPR.description || '',
                quantity: targetPR.quantity,
                unitPrice,
                taxRate: 18,
              },
            ]);
          }
        }

        if (vendorsRes.data && vendorsRes.data.success) {
          setVendors(vendorsRes.data.data);
          if (vendorsRes.data.data.length > 0) {
            setSelectedVendorId(vendorsRes.data.data[0]._id);
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to initialize order form');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [initialPrId]);

  // Handle PR change: update item defaults
  const handlePRChange = (prId) => {
    setSelectedPrId(prId);
    const pr = approvedPRs.find((p) => p._id === prId);
    if (pr) {
      const unitPrice = Math.round((pr.estimatedCost / (pr.quantity || 1) / 1.18) * 100) / 100;
      setItems([
        {
          itemName: pr.itemName,
          description: pr.description || '',
          quantity: pr.quantity,
          unitPrice,
          taxRate: 18,
        },
      ]);
    }
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { itemName: '', description: '', quantity: 1, unitPrice: 0, taxRate: 18 },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const calculatedTotals = items.reduce(
    (acc, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const taxRate = Number(item.taxRate) || 0;
      const lineTotal = qty * price;
      const lineTax = (lineTotal * taxRate) / 100;
      return {
        subtotal: acc.subtotal + lineTotal,
        tax: acc.tax + lineTax,
        grandTotal: acc.grandTotal + lineTotal + lineTax,
      };
    },
    { subtotal: 0, tax: 0, grandTotal: 0 }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPrId) {
      setError('Please select an Approved Purchase Requisition.');
      return;
    }
    if (!selectedVendorId) {
      setError('Please select a Supplier / Vendor.');
      return;
    }
    if (!deliveryDate) {
      setError('Please specify the expected delivery date.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        prId: selectedPrId,
        vendorId: selectedVendorId,
        deliveryDate,
        items: items.map((i) => ({
          itemName: i.itemName,
          description: i.description,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          taxRate: Number(i.taxRate),
        })),
      };

      const res = await api.post('/purchase-orders', payload);
      if (res.data && res.data.success) {
        navigate(`/purchase/orders/${res.data.data._id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate Purchase Order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/purchase/orders"
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Generate Purchase Order</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Convert an approved requisition into a legally binding purchase order
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-xs font-semibold text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Requisition & Vendor Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Approved Requisition *
              </label>
              <select
                required
                value={selectedPrId}
                onChange={(e) => handlePRChange(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-medium"
              >
                <option value="">Select Approved PR...</option>
                {approvedPRs.map((pr) => (
                  <option key={pr._id} value={pr._id}>
                    {pr.prNumber} - {pr.itemName} (₹{Number(pr.estimatedCost).toLocaleString()})
                  </option>
                ))}
              </select>
              {approvedPRs.length === 0 && (
                <p className="text-[11px] text-amber-600 mt-1">
                  Note: No approved requisitions found. A requisition must be APPROVED before a PO can be generated.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Supplier / Vendor *
              </label>
              <select
                required
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-medium"
              >
                <option value="">Select Active Vendor...</option>
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name} ({v.vendorCode}) - GST: {v.gstNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Delivery Date *
            </label>
            <input
              type="date"
              required
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full sm:w-1/2 text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
            />
          </div>

          {/* Line Items Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Purchase Order Line Items
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Line Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Item Name</label>
                    <input
                      type="text"
                      required
                      value={item.itemName}
                      onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                      placeholder="Item name"
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      placeholder="Specs"
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Qty</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-2 bg-white text-slate-800 text-center font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Unit Price (₹)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      step="any"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 font-mono text-right"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tax %</label>
                    <input
                      type="number"
                      min={0}
                      value={item.taxRate}
                      onChange={(e) => handleItemChange(idx, 'taxRate', e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-2 bg-white text-slate-800 text-center"
                    />
                  </div>

                  <div className="sm:col-span-1 flex justify-center pt-5 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length <= 1}
                      className="p-2 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Order Summary Panel */}
          <div className="p-5 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-4 h-4" /> Real-time Tax & Amount Calculation
              </span>
              <p className="text-xs text-slate-400">
                Subtotal: ₹{calculatedTotals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })} + GST
                Tax: ₹{calculatedTotals.tax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 uppercase tracking-wider block">Grand Total</span>
              <span className="text-2xl font-black font-mono text-teal-300">
                ₹{calculatedTotals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Action */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              to="/purchase/orders"
              className="px-5 py-2.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || approvedPRs.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <ShoppingCart className="w-4 h-4" /> {submitting ? 'Generating PO...' : 'Generate Purchase Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
