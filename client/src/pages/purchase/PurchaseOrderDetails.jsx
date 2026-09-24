import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, Send, Truck, Building2, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { useAuth } from '../../context/AuthContext';

export default function PurchaseOrderDetails() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const canManage = hasRole('PURCHASE_MANAGER', 'ADMIN');

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/purchase-orders/${id}`);
      if (res.data && res.data.success) {
        setOrder(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      const res = await api.get(`/purchase-orders/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${order.poNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to download PO PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleSendPO = async () => {
    try {
      setActionLoading(true);
      await api.post(`/purchase-orders/${id}/send`);
      fetchOrder();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send PO');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkInTransit = async () => {
    try {
      setActionLoading(true);
      await api.post(`/purchase-orders/${id}/in-transit`);
      fetchOrder();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update in-transit status');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading Purchase Order..." size="large" />;
  if (error) return <ErrorState message={error} onRetry={fetchOrder} />;
  if (!order) return <ErrorState message="Purchase order not found." />;

  const lifecycleStages = [
    'GENERATED',
    'SENT',
    'ACKNOWLEDGED',
    'IN_TRANSIT',
    'DELIVERED',
    'PAID',
    'CLOSED',
  ];

  const currentStageIndex = lifecycleStages.indexOf(order.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/purchase/orders"
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold font-mono text-slate-800">{order.poNumber}</h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Generated from PR{' '}
              <Link to={`/purchase/requisitions/${order.prId?._id}`} className="text-teal-600 font-semibold underline">
                {order.prId?.prNumber}
              </Link>{' '}
              on {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-teal-600" />
            {downloading ? 'Downloading...' : 'Export PDF'}
          </button>

          {canManage && order.status === 'GENERATED' && (
            <button
              onClick={handleSendPO}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> Send to Vendor
            </button>
          )}

          {canManage && ['ACKNOWLEDGED', 'SENT'].includes(order.status) && (
            <button
              onClick={handleMarkInTransit}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Truck className="w-4 h-4" /> Mark In Transit
            </button>
          )}
        </div>
      </div>

      {/* Lifecycle Progress Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Procurement Lifecycle Stage
        </h3>
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {lifecycleStages.map((stage, idx) => {
            const isCompleted = idx <= currentStageIndex;
            const isCurrent = stage === order.status;
            return (
              <div key={stage} className="flex items-center shrink-0">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-teal-600 text-white ring-4 ring-teal-100'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted && !isCurrent ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[10px] font-bold mt-1.5 whitespace-nowrap uppercase tracking-wider ${
                      isCurrent ? 'text-teal-700' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {stage.replace(/_/g, ' ')}
                  </span>
                </div>
                {idx < lifecycleStages.length - 1 && (
                  <div
                    className={`w-8 sm:w-16 h-0.5 mx-1.5 ${
                      idx < currentStageIndex ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Metadata Overview (Supplier & Delivery) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-teal-600" /> Supplier Information
          </h3>
          <div className="space-y-1.5 text-xs">
            <p className="font-bold text-sm text-slate-800">{order.vendorId?.name}</p>
            <p className="text-slate-500">Contact: {order.vendorId?.contactPerson}</p>
            <p className="text-slate-500">Email: {order.vendorId?.email}</p>
            <p className="text-slate-500">Phone: {order.vendorId?.phone}</p>
            <p className="text-slate-500">GST: {order.vendorId?.gstNumber}</p>
            <p className="text-slate-400 mt-2">{order.vendorId?.address}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-teal-600" /> Order Dates & Details
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Target Delivery Date:</span>
              <span className="font-bold text-slate-800">
                {new Date(order.deliveryDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">PO Sent Timestamp:</span>
              <span className="font-medium text-slate-700">
                {order.sentAt ? new Date(order.sentAt).toLocaleString() : 'Not yet dispatched'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Vendor Acknowledged:</span>
              <span className="font-medium text-slate-700">
                {order.acknowledgedAt ? new Date(order.acknowledgedAt).toLocaleString() : 'Pending'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Created By:</span>
              <span className="font-medium text-slate-700">{order.createdBy?.name || 'Manager'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table & Totals */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Line Items Table</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Item Description</th>
                <th className="px-4 py-3 text-center">Quantity</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-center">Tax %</th>
                <th className="px-4 py-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items?.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {item.itemName}
                    {item.description && (
                      <span className="block text-[11px] font-normal text-slate-400">{item.description}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-700">{item.quantity}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    ₹{Number(item.unitPrice).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-center">{item.taxRate || 0}%</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                    ₹{Number(item.totalPrice).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="p-5 bg-slate-50/60 border-t border-slate-200 flex justify-end">
          <div className="w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold text-slate-800">
                ₹{Number(order.subtotal).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Calculated GST Tax:</span>
              <span className="font-mono font-semibold text-slate-800">
                ₹{Number(order.tax).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
              <span>Grand Total:</span>
              <span className="font-mono text-base font-extrabold text-teal-700">
                ₹{Number(order.totalAmount).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
