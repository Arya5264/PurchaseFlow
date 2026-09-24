import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, PackageCheck, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';

export default function RecordGoodsReceipt() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPoId = searchParams.get('poId') || '';

  const [availablePOs, setAvailablePOs] = useState([]);
  const [selectedPoId, setSelectedPoId] = useState(initialPoId);
  const [selectedPO, setSelectedPO] = useState(null);
  const [itemInputs, setItemInputs] = useState([]);
  const [condition, setCondition] = useState('GOOD');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');

  const [loadingPOs, setLoadingPOs] = useState(true);
  const [loadingPODetails, setLoadingPODetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch POs that can receive items
  useEffect(() => {
    const fetchReceivablePOs = async () => {
      try {
        setLoadingPOs(true);
        const res = await api.get('/purchase-orders?limit=100');
        if (res.data && res.data.success) {
          const receivable = res.data.data.filter((po) =>
            ['SENT', 'ACKNOWLEDGED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED'].includes(po.status)
          );
          setAvailablePOs(receivable);
        }
      } catch (err) {
        console.error('Failed to fetch POs', err);
      } finally {
        setLoadingPOs(false);
      }
    };
    fetchReceivablePOs();
  }, []);

  // When selectedPoId changes, load the PO and its prior receipts
  useEffect(() => {
    if (!selectedPoId) {
      setSelectedPO(null);
      setItemInputs([]);
      return;
    }

    const loadPODetails = async () => {
      try {
        setLoadingPODetails(true);
        setError('');
        const [poRes, rcptRes] = await Promise.all([
          api.get(`/purchase-orders/${selectedPoId}`),
          api.get(`/receipts?poId=${selectedPoId}`),
        ]);

        if (poRes.data && poRes.data.success) {
          const po = poRes.data.data;
          setSelectedPO(po);

          // Calculate previously received for each item
          const priorReceipts = rcptRes.data?.data || [];
          const priorMap = {};
          priorReceipts.forEach((r) => {
            r.receivedItems?.forEach((it) => {
              const k = it.itemName.trim().toLowerCase();
              priorMap[k] = (priorMap[k] || 0) + it.receivedQuantity;
            });
          });

          // Initialize inputs
          const inputs = po.items.map((it) => {
            const k = it.itemName.trim().toLowerCase();
            const prior = priorMap[k] || 0;
            const remaining = Math.max(0, it.quantity - prior);
            return {
              itemName: it.itemName,
              description: it.description,
              orderedQuantity: it.quantity,
              previouslyReceived: prior,
              remainingQuantity: remaining,
              receivedQuantity: remaining, // default to remaining
              damagedQuantity: 0,
            };
          });

          setItemInputs(inputs);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load PO details for receipt');
      } finally {
        setLoadingPODetails(false);
      }
    };

    loadPODetails();
  }, [selectedPoId]);

  const handleItemChange = (index, field, value) => {
    const updated = [...itemInputs];
    updated[index][field] = Number(value);
    setItemInputs(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPoId) {
      setError('Please select a Purchase Order.');
      return;
    }

    // Validate Rule 10: Received quantity cannot exceed remaining ordered quantity
    for (const item of itemInputs) {
      const rec = Number(item.receivedQuantity || 0);
      const dam = Number(item.damagedQuantity || 0);

      if (rec < 0 || dam < 0) {
        setError(`Quantities for '${item.itemName}' cannot be negative.`);
        return;
      }

      if (dam > rec) {
        setError(`Damaged quantity cannot exceed received quantity for '${item.itemName}'.`);
        return;
      }

      const totalCumulative = item.previouslyReceived + rec;
      if (totalCumulative > item.orderedQuantity) {
        setError(
          `Rule Violation: Received quantity for '${item.itemName}' (${rec}) plus previously received (${item.previouslyReceived}) exceeds ordered quantity (${item.orderedQuantity}). Max receivable now: ${item.remainingQuantity}.`
        );
        return;
      }
    }

    // Ensure at least one item has > 0 received quantity
    const totalCurrentReceiving = itemInputs.reduce((sum, i) => sum + Number(i.receivedQuantity || 0), 0);
    if (totalCurrentReceiving <= 0) {
      setError('Please enter at least 1 received unit across the items.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        poId: selectedPoId,
        receivedDate,
        condition,
        remarks,
        receivedItems: itemInputs.map((i) => ({
          itemName: i.itemName,
          orderedQuantity: i.orderedQuantity,
          receivedQuantity: Number(i.receivedQuantity || 0),
          damagedQuantity: Number(i.damagedQuantity || 0),
        })),
      };

      const res = await api.post('/receipts', payload);
      if (res.data && res.data.success) {
        setSuccess(`Goods Receipt recorded successfully: ${res.data.data?.receipt?.receiptNumber}. PO status is now ${res.data.data?.poStatus}.`);
        setTimeout(() => {
          navigate('/warehouse/receipts');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to record goods receipt');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/warehouse/receipts"
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Record Goods Receipt</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log inward inspection quantities, physical condition, and damage count for a Purchase Order
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Purchase Order */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            1. Select Inward Purchase Order
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Purchase Order *
            </label>
            <select
              value={selectedPoId}
              onChange={(e) => setSelectedPoId(e.target.value)}
              required
              className="w-full text-sm font-mono border border-slate-200 rounded-lg px-3 py-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
            >
              <option value="">-- Choose Purchase Order to Receive --</option>
              {availablePOs.map((po) => (
                <option key={po._id} value={po._id}>
                  {po.poNumber} — {po.vendorId?.name} (Status: {po.status}, ₹{Number(po.totalAmount).toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>

          {selectedPO && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block">Vendor</span>
                <span className="font-bold text-slate-800">{selectedPO.vendorId?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Delivery Target</span>
                <span className="font-medium text-slate-800">
                  {new Date(selectedPO.deliveryDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Current Status</span>
                <span className="font-bold text-teal-700">{selectedPO.status}</span>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Line Items Verification */}
        {loadingPODetails ? (
          <LoadingSpinner text="Loading items and previous receipts..." />
        ) : selectedPO ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Line Items Inspection & Physical Counts
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Enter actual received units and any damaged units identified during unpacking
                </p>
              </div>
              <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-md">
                Rule 10 Enforced: Cannot exceed ordered quantity
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Item Name</th>
                    <th className="px-4 py-3 text-center">Ordered</th>
                    <th className="px-4 py-3 text-center">Prior Received</th>
                    <th className="px-4 py-3 text-center">Max Pending</th>
                    <th className="px-4 py-3 text-center w-32">Received Now *</th>
                    <th className="px-4 py-3 text-center w-28">Damaged Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itemInputs.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-800 block">{item.itemName}</span>
                        {item.description && (
                          <span className="text-[11px] text-slate-400">{item.description}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-700">
                        {item.orderedQuantity}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-slate-500">
                        {item.previouslyReceived}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-teal-700">
                        {item.remainingQuantity}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={item.remainingQuantity}
                          required
                          value={item.receivedQuantity}
                          onChange={(e) => handleItemChange(idx, 'receivedQuantity', e.target.value)}
                          className="w-24 text-center font-mono font-bold text-xs border border-slate-200 rounded-lg py-1.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={item.receivedQuantity}
                          value={item.damagedQuantity}
                          onChange={(e) => handleItemChange(idx, 'damagedQuantity', e.target.value)}
                          className="w-20 text-center font-mono text-xs border border-rose-200 bg-rose-50/30 rounded-lg py-1.5 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-rose-700 font-bold"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* Step 3: Receipt Metadata */}
        {selectedPO && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              3. Condition & Receipt Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Overall Physical Condition *
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                >
                  <option value="EXCELLENT">EXCELLENT — Factory sealed & perfect</option>
                  <option value="GOOD">GOOD — Standard acceptable condition</option>
                  <option value="PARTIAL">PARTIAL — Incomplete delivery batch</option>
                  <option value="DAMAGED">DAMAGED — Visible damage / packaging compromised</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Received Date *
                </label>
                <input
                  type="date"
                  required
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Inspection Remarks / Delivery Notes
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Truck driver details, delivery docket numbers, box condition observations..."
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
              />
            </div>
          </div>
        )}

        {/* Submit Actions */}
        {selectedPO && (
          <div className="flex justify-end gap-3">
            <Link
              to="/warehouse/receipts"
              className="px-5 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <PackageCheck className="w-4 h-4" />
              {submitting ? 'Recording Inward Receipt...' : 'Confirm & Record Goods Receipt'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
