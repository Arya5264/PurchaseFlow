import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, AlertTriangle, CheckCircle2, Search, Filter } from 'lucide-react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorState from '../../components/common/ErrorState';

export default function VendorInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  const [search, setSearch] = useState('');
  const [matchStatusFilter, setMatchStatusFilter] = useState('');
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
          ...(paymentStatusFilter && { paymentStatus: paymentStatusFilter }),
        });

        const res = await api.get(`/invoices?${params.toString()}`);
        if (res.data && res.data.success) {
          setInvoices(res.data.data);
          setPagination(res.data.pagination);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch vendor invoices');
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, search, matchStatusFilter, paymentStatusFilter]
  );

  useEffect(() => {
    fetchInvoices(1);
  }, [fetchInvoices]);

  const columns = [
    {
      header: 'Invoice Reference',
      accessor: 'invoiceNumber',
      render: (row) => (
        <span className="font-mono font-bold text-xs text-slate-800 bg-slate-100 px-2 py-1 rounded border border-slate-200">
          {row.invoiceNumber}
        </span>
      ),
    },
    {
      header: 'Purchase Order',
      render: (row) => (
        <Link
          to={`/vendor/orders/${row.poId?._id}`}
          className="font-mono text-xs font-semibold text-teal-600 hover:text-teal-800 underline"
        >
          {row.poId?.poNumber || 'N/A'}
        </Link>
      ),
    },
    {
      header: 'Invoice Date',
      render: (row) => new Date(row.invoiceDate).toLocaleDateString(),
    },
    {
      header: 'Due Date',
      render: (row) => new Date(row.dueDate).toLocaleDateString(),
    },
    {
      header: 'Billed Amount',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold text-slate-900 text-xs">
          ₹{Number(row.amount).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: '3-Way Match Status',
      render: (row) => (
        <div>
          <StatusBadge status={row.matchStatus} />
          {row.matchStatus === 'MISMATCHED' && row.discrepancyDetails?.length > 0 && (
            <span className="block text-[10px] text-rose-600 font-semibold mt-0.5">
              {row.discrepancyDetails.length} variances flagged
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Finance Approval',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Payment Status',
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
            row.paymentStatus === 'PAID'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {row.paymentStatus === 'PAID' ? (
            <>
              <CheckCircle2 className="w-3 h-3" /> PAID
            </>
          ) : (
            'PENDING'
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">My Invoices</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Monitor submitted invoices, automated 3-way matching status, Finance approvals, and payment disbursements
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <SearchBar
          placeholder="Search by invoice number..."
          initialValue={search}
          onSearch={(val) => setSearch(val)}
        />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={matchStatusFilter}
            onChange={(e) => setMatchStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="">All Match Statuses</option>
            <option value="MATCHED">Matched</option>
            <option value="MISMATCHED">Mismatched</option>
            <option value="PENDING">Match Pending</option>
          </select>

          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="">All Payment Statuses</option>
            <option value="PAID">Disbursed (PAID)</option>
            <option value="PENDING">Pending Payment</option>
          </select>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={() => fetchInvoices(pagination.page)} />}

      <DataTable
        columns={columns}
        data={invoices}
        loading={loading}
        emptyTitle="No invoices found"
        emptyDescription="You can submit invoices for any active or fulfilled purchase orders."
      />

      <Pagination pagination={pagination} onPageChange={(p) => fetchInvoices(p)} />
    </div>
  );
}
