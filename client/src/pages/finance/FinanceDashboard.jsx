import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  DollarSign,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import api from '../../services/api';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';

export default function FinanceDashboard() {
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
      setError(err.response?.data?.message || err.message || 'Failed to load finance metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) return <LoadingSpinner text="Loading financial procurement metrics..." size="large" />;
  if (error) return <ErrorState message={error} onRetry={fetchMetrics} />;

  const hasMismatches = (metrics?.mismatched || 0) > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Finance & Accounts Payable</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Enforce Three-Way Matching (PO ↔ Goods Receipt ↔ Invoice), approve invoices, and disburse payments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/finance/invoices"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-2xs"
          >
            <Receipt className="w-4 h-4 text-teal-600" /> Invoices & 3-Way Match
          </Link>
          <Link
            to="/finance/payments"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition shadow-xs"
          >
            <CreditCard className="w-4 h-4" /> Disbursed Payments
          </Link>
        </div>
      </div>

      {/* Mismatch Alert Notice */}
      {hasMismatches && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-rose-900">
                Action Required: {metrics.mismatched} Invoices Have 3-Way Match Variances
              </h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Physical warehouse receipts or PO values do not reconcile with billed amounts. Automatic payment is blocked.
              </p>
            </div>
          </div>
          <Link
            to="/finance/invoices?matchStatus=MISMATCHED"
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shrink-0 transition"
          >
            Resolve Discrepancies
          </Link>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Outstanding Payable"
          value={`₹${Number(metrics?.totalPayable || 0).toLocaleString('en-IN')}`}
          icon={DollarSign}
          color="blue"
          description="Pending invoice payment liability"
        />
        <StatCard
          title="3-Way Matched Invoices"
          value={metrics?.matched || 0}
          icon={CheckCircle2}
          color="emerald"
          description="Reconciled and ready for approval"
        />
        <StatCard
          title="3-Way Discrepancies"
          value={metrics?.mismatched || 0}
          icon={AlertTriangle}
          color="rose"
          description="Blocked due to price/qty mismatch"
        />
        <StatCard
          title="Pending Approval"
          value={metrics?.pendingInvoices || 0}
          icon={Receipt}
          color="amber"
          description="Awaiting finance officer signoff"
        />
        <StatCard
          title="Approved For Payment"
          value={metrics?.approved || 0}
          icon={FileCheck2}
          color="teal"
          description="Authorized for disbursement"
        />
        <StatCard
          title="Settled & Paid Invoices"
          value={metrics?.paid || 0}
          icon={ShieldCheck}
          color="purple"
          description="Payments completed and POs closed"
        />
      </div>

      {/* Workflow Guidance Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-900 via-slate-900 to-slate-950 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <span className="text-xs font-bold text-teal-400 uppercase tracking-widest">
            Audit & Internal Control Protocol
          </span>
          <h3 className="text-lg font-bold">Three-Way Matching Policy Active</h3>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Every vendor invoice is automatically cross-referenced against the Purchase Order authorized quantity
            and the physical Goods Receipt recorded by the warehouse dock. Mismatched bills cannot be disbursed
            without written executive override.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/finance/invoices"
            className="px-4 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition shadow-xs"
          >
            Review Invoices
          </Link>
          <Link
            to="/reports"
            className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition"
          >
            Financial Analytics
          </Link>
        </div>
      </div>
    </div>
  );
}
