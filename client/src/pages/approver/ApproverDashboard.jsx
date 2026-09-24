import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';

export default function ApproverDashboard() {
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
      setError(err.response?.data?.message || err.message || 'Failed to load approver dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) return <LoadingSpinner text="Loading approval queue..." size="large" />;
  if (error) return <ErrorState message={error} onRetry={fetchMetrics} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Approver Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Review pending departmental requisitions, authorize expenditures, and inspect signoff history
          </p>
        </div>
        <Link
          to="/approver/pending"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition shadow-xs"
        >
          <CheckSquare className="w-4 h-4" /> Go to Pending Queue
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Awaiting Review"
          value={metrics?.pendingApprovals || 0}
          icon={Clock}
          color="amber"
          description="Requisitions requiring decision"
        />
        <StatCard
          title="Approved Requests"
          value={metrics?.approved || 0}
          icon={CheckCircle2}
          color="emerald"
          description="Authorized by you"
        />
        <StatCard
          title="Rejected Requests"
          value={metrics?.rejected || 0}
          icon={XCircle}
          color="rose"
          description="Declined purchase requests"
        />
      </div>

      {/* Urgent Pending Review Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Immediate Review Queue</h3>
            <p className="text-xs text-slate-400 mt-0.5">Requisitions awaiting formal director sign-off</p>
          </div>
          <Link
            to="/approver/pending"
            className="text-xs font-bold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1"
          >
            Open full queue &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">PR Number</th>
                <th className="px-4 py-3">Requester</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Item Name</th>
                <th className="px-4 py-3 text-right">Est. Budget</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics?.recentRequests && metrics.recentRequests.length > 0 ? (
                metrics.recentRequests.map((req) => (
                  <tr key={req._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-mono font-bold text-teal-700">{req.prNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{req.requestedBy?.name || 'Staff'}</td>
                    <td className="px-4 py-3 text-slate-600">{req.department}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{req.itemName}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-teal-700">
                      ₹{Number(req.estimatedCost).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/approver/pending"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-800"
                      >
                        Review &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Your approval queue is completely clear! No pending requisitions.
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
