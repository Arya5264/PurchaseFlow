import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Truck, PackageCheck, Clock, AlertCircle, PlusCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';

export default function WarehouseDashboard() {
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
      setError(err.response?.data?.message || err.message || 'Failed to load warehouse metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) return <LoadingSpinner text="Loading warehouse inventory operations..." size="large" />;
  if (error) return <ErrorState message={error} onRetry={fetchMetrics} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Warehouse & Receiving</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage incoming supplier shipments, inspect delivered physical items, and record verified goods receipts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/warehouse/deliveries"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-2xs"
          >
            <Truck className="w-4 h-4 text-teal-600" /> Expected Deliveries
          </Link>
          <Link
            to="/warehouse/receipts/record"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition shadow-xs"
          >
            <PlusCircle className="w-4 h-4" /> Record New Receipt
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Expected Deliveries"
          value={metrics?.expectedDeliveries || 0}
          icon={Truck}
          color="teal"
          description="Dispatched and scheduled POs"
        />
        <StatCard
          title="In Transit"
          value={metrics?.pendingReceipts || 0}
          icon={Clock}
          color="purple"
          description="En route to warehouse"
        />
        <StatCard
          title="Partial Receipts"
          value={metrics?.partialReceipts || 0}
          icon={AlertCircle}
          color="amber"
          description="Orders requiring remaining items"
        />
        <StatCard
          title="Total Receipts Recorded"
          value={metrics?.completedReceipts || 0}
          icon={PackageCheck}
          color="emerald"
          description="Goods receipts in ledger"
        />
      </div>

      {/* Quick Action Info Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-teal-950 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <span className="text-xs font-bold text-teal-400 uppercase tracking-widest">
            Inventory Receiving Desk
          </span>
          <h3 className="text-lg font-bold">Has an inward delivery truck arrived at the dock?</h3>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Inspect physical boxes and packaging condition. Verify item quantities against the Purchase Order.
            The system automatically enforces that received units cannot exceed ordered units.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/warehouse/deliveries"
            className="px-4 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition shadow-xs"
          >
            View Incoming Deliveries
          </Link>
          <Link
            to="/warehouse/receipts"
            className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition"
          >
            Receipts History
          </Link>
        </div>
      </div>
    </div>
  );
}
