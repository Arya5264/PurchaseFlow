import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, PlusCircle, ShoppingCart, Clock, CheckCircle2, Truck, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';

export default function PurchaseDashboard() {
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
      setError(err.response?.data?.message || err.message || 'Failed to fetch dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) return <LoadingSpinner text="Loading procurement dashboard..." size="large" />;
  if (error) return <ErrorState message={error} onRetry={fetchMetrics} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Procurement Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Monitor purchase requisitions, active purchase orders, and supplier fulfillment
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/purchase/requisitions/create"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition shadow-xs"
          >
            <PlusCircle className="w-4 h-4" /> Create Requisition
          </Link>
          <Link
            to="/purchase/orders/create"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            <ShoppingCart className="w-4 h-4 text-teal-600" /> Generate PO
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Requisitions"
          value={metrics?.totalPRs || 0}
          icon={FileText}
          color="blue"
          description="Total raised requisitions"
        />
        <StatCard
          title="Pending Approval"
          value={metrics?.pendingApprovals || 0}
          icon={Clock}
          color="amber"
          description="Awaiting director review"
        />
        <StatCard
          title="Approved PRs"
          value={metrics?.approvedPRs || 0}
          icon={CheckCircle2}
          color="emerald"
          description="Ready for PO issuance"
        />
        <StatCard
          title="Active Orders"
          value={metrics?.activePOs || 0}
          icon={ShoppingCart}
          color="teal"
          description="Dispatched or in transit"
        />
      </div>

      {/* Recent Requisitions Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Recent Requisitions</h3>
            <p className="text-xs text-slate-400 mt-0.5">Latest purchase requests submitted by teams</p>
          </div>
          <Link
            to="/purchase/requisitions"
            className="text-xs font-bold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1"
          >
            View all requisitions &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">PR Number</th>
                <th className="px-4 py-3">Item Name</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-right">Est. Cost</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics?.recentPRs && metrics.recentPRs.length > 0 ? (
                metrics.recentPRs.map((pr) => (
                  <tr key={pr._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-mono font-bold text-teal-700">{pr.prNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{pr.itemName}</td>
                    <td className="px-4 py-3 text-slate-600">{pr.department}</td>
                    <td className="px-4 py-3 text-center">{pr.quantity}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
                      ₹{Number(pr.estimatedCost).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={pr.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/purchase/requisitions/${pr._id}`}
                        className="text-xs font-semibold text-teal-600 hover:text-teal-800 inline-flex items-center gap-1"
                      >
                        Details &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No requisitions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
