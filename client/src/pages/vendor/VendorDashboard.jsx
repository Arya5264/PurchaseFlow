import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Clock, CheckCircle2, Receipt, ArrowRight, Truck } from 'lucide-react';
import api from '../../services/api';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';

export default function VendorDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/reports/dashboard');
      if (res.data && res.data.success) {
        setMetrics(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load vendor portal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) return <LoadingSpinner text="Loading vendor portal..." size="large" />;
  if (error) return <ErrorState message={error} onRetry={fetchMetrics} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Vendor Portal</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage incoming purchase orders, acknowledge commitments, track fulfillment, and submit invoices
          </p>
        </div>
        <Link
          to="/vendor/orders"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition shadow-xs"
        >
          <ShoppingCart className="w-4 h-4" /> View Purchase Orders
        </Link>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Orders"
          value={metrics?.totalPOs || 0}
          icon={ShoppingCart}
          color="teal"
          description="Purchase orders issued to you"
        />
        <StatCard
          title="Pending Acknowledgment"
          value={metrics?.pendingAcknowledgement || 0}
          icon={Clock}
          color="amber"
          description="Awaiting your confirmation"
        />
        <StatCard
          title="Active Deliveries"
          value={metrics?.activeOrders || 0}
          icon={Truck}
          color="purple"
          description="In preparation or transit"
        />
        <StatCard
          title="Unpaid Invoices"
          value={metrics?.pendingInvoices || 0}
          icon={Receipt}
          color="blue"
          description="Awaiting 3-way match & payout"
        />
      </div>

      {/* Quick Action Info Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-900 to-slate-900 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <span className="text-xs font-bold text-teal-400 uppercase tracking-widest">
            Fulfillment Workflow
          </span>
          <h3 className="text-lg font-bold">Have you dispatched any order shipments?</h3>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Please acknowledge newly received Purchase Orders promptly and mark items as "In Transit" when shipped.
            Once delivered to the warehouse, you can submit your invoice directly for automated 3-way matching.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/vendor/orders"
            className="px-4 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition shadow-xs"
          >
            Review Orders
          </Link>
          <Link
            to="/vendor/invoices"
            className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition"
          >
            View Invoices
          </Link>
        </div>
      </div>
    </div>
  );
}
