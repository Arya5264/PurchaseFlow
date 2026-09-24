import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Receipt, Eye, CheckCircle2, AlertTriangle, ArrowUpRight } from 'lucide-react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorState from '../../components/common/ErrorState';

export default function InvoiceList() {
  const [searchParams] = useSearchParams();
  const urlMatchStatus = searchParams.get('matchStatus') || '';

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  const [search, setSearch] = useState('');
  const [matchStatusFilter, setMatchStatusFilter] = useState(urlMatchStatus);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');

  const fetchInvoices = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError('');
        const params = new URLSearchParams({
          page,
          limit: pagination.limit,
          ...(search && { search }),
          ...(matchStatusFilter && { matchStatus: matchStatusFilter }),
          ...(statusFilter && { status: statusFilter }),
          ...(paymentStatusFilter && { paymentStatus: paymentStatusFilter }),
        });

        const res = await api.get(`/invoices?${params.toString()}`);
        if (res.data && res.data.success) {
          setInvoices(res.data.data);
          setPagination(res.data.pagination);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch invoices');
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, search, matchStatusFilter, statusFilter, paymentStatusFilter]
  );

  useEffect(() => {
    fetchInvoices(1);
  }, [fetchInvoices]);

  const columns = [
    {
      header: 'Invoice No.',
      accessor: 'invoiceNumber',
      render: (row) => (
        <Link
          to={`/finance/invoices/${row._id}`}
          className="font-mono font-bold text-xs text-teal-700 hover:text-teal-900 bg-teal-50 px-2 py-1 rounded border border-teal-200"
        >
          {row.invoiceNumber}
        </Link>
      ),
    },
    {
      header: 'Purchase Order',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-800">
          {row.poId?.poNumber || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Vendor / Supplier',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800 text-xs">{row.vendorId?.name || 'N/A'}</p>
          <p className="text-[11px] font-mono text-slate-400">{row.vendorId?.vendorCode}</p>
        </div>
      ),
    },
    {
      header: 'Amount',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold text-slate-900 text-xs">
          ₹{Number(row.amount).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Invoice Date',
      render: (row) => new Date(row.invoiceDate).toLocaleDateString(),
    },
    {
      header: '3-Way Match',
      render: (row) => (
        <div>
          <StatusBadge status={row.matchStatus} />
          {row.matchStatus === 'MISMATCHED' && row.discrepancyDetails?.length > 0 && (
            <span className="block text-[10px] text-rose-600 font-bold mt-0.5">
              {row.discrepancyDetails.length} variances
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Approval',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Payment',
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
            row.paymentStatus === 'PAID'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {row.paymentStatus === 'PAID' ? 'PAID' : 'PENDING'}
        </span>
      ),
    },
    {
      header: 'Action',
      align: 'right',
      render: (row) => (
        <Link
          to={`/finance/invoices/${row._id}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition"
        >
          <Eye className="w-3.5 h-3.5" /> Review Match
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Vendor Invoices & Three-Way Match</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Verify automated invoice reconciliation against warehouse receipts, resolve price/quantity variances, and authorize payments
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <SearchBar
          placeholder="Search by invoice number..."
          initialValue={search}
          onSearch={(val) => setSearch(val)}
        />
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
          <select
            value={matchStatusFilter}
            onChange={(e) => setMatchStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="">All Match Statuses</option>
            <option value="MATCHED">Matched</option>
            <option value="MISMATCHED">Mismatched</option>
            <option value="PENDING">Pending Match</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="">All Approvals</option>
            <option value="PENDING">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="">All Payments</option>
            <option value="PENDING">Pending Payment</option>
            <option value="PAID">Disbursed (PAID)</option>
          </select>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={() => fetchInvoices(pagination.page)} />}

      <DataTable
        columns={columns}
        data={invoices}
        loading={loading}
        emptyTitle="No invoices found"
        emptyDescription="Invoices submitted by vendors will appear here for audit and payment authorization."
      />

      <Pagination pagination={pagination} onPageChange={(p) => fetchInvoices(p)} />
    </div>
  );
}
