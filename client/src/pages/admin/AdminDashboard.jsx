import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Building2, FileText, ShoppingCart, Receipt, IndianRupee, Clock, ShieldAlert } from 'lucide-react';
import api from '../../services/api';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';

export default function AdminDashboard() {
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
      setError(err.response?.data?.message || err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) return <LoadingSpinner text="Loading system metrics..." size="large" />;
  if (error) return <ErrorState message={error} onRetry={fetchMetrics} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">System Administration</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Overall procurement metrics, organization users, and governance overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/users"
            className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition shadow-xs"
          >
            Manage Users
          </Link>
          <Link
            to="/admin/vendors"
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            Manage Vendors
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={metrics?.totalUsers || 0}
          icon={Users}
          color="purple"
          description="Active accounts across all roles"
        />
        <StatCard
          title="Vendors"
          value={metrics?.totalVendors || 0}
          icon={Building2}
          color="teal"
          description="Registered suppliers"
        />
        <StatCard
          title="Requisitions"
          value={metrics?.totalPRs || 0}
          icon={FileText}
          color="blue"
          description={`${metrics?.pendingApprovals || 0} pending approval`}
        />
        <StatCard
          title="Purchase Orders"
          value={metrics?.totalPOs || 0}
          icon={ShoppingCart}
          color="emerald"
          description="Total issued orders"
        />
        <StatCard
          title="Invoices"
          value={metrics?.totalInvoices || 0}
          icon={Receipt}
          color="amber"
          description={`${metrics?.pendingPayments || 0} pending disbursement`}
        />
        <StatCard
          title="Procurement Value"
          value={`₹${(metrics?.totalPurchaseValue || 0).toLocaleString('en-IN')}`}
          icon={IndianRupee}
          color="emerald"
          description="Cumulative PO spend"
        />
        <StatCard
          title="Pending Approvals"
          value={metrics?.pendingApprovals || 0}
          icon={Clock}
          color="rose"
          description="Requisitions awaiting signoff"
        />
        <StatCard
          title="Pending Payments"
          value={metrics?.pendingPayments || 0}
          icon={Clock}
          color="indigo"
          description="Approved invoices awaiting payment"
        />
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">User Access Control</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Create new employees, assign roles (Admin, Purchase Manager, Approver, Warehouse, Finance), and manage activation states.
          </p>
          <Link
            to="/admin/users"
            className="text-xs font-bold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1"
          >
            Go to User Management &rarr;
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-teal-50 text-teal-600">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Supplier Directory</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Register and manage active suppliers, GST tax numbers, bank settlement accounts, and contact representatives.
          </p>
          <Link
            to="/admin/vendors"
            className="text-xs font-bold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1"
          >
            Go to Vendor Directory &rarr;
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Security & Audit Logs</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Review immutable system audit logs recording logins, requisition approvals, PO generation, and disbursements with IP telemetry.
          </p>
          <Link
            to="/admin/audit-logs"
            className="text-xs font-bold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1"
          >
            View System Audit Logs &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
