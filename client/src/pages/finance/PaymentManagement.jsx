import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, CheckCircle2, Search, Building2, Calendar, DollarSign } from 'lucide-react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';
import ErrorState from '../../components/common/ErrorState';

export default function PaymentManagement() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [search, setSearch] = useState('');

  const fetchPayments = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError('');
        const params = new URLSearchParams({
          page,
          limit: pagination.limit,
          ...(search && { search }),
        });

        const res = await api.get(`/payments?${params.toString()}`);
        if (res.data && res.data.success) {
          setPayments(res.data.data);
          setPagination(res.data.pagination);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch payment records');
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, search]
  );

  useEffect(() => {
    fetchPayments(1);
  }, [fetchPayments]);

  const totalDisbursed = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

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
      header: 'Supplier / Beneficiary',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800 text-xs">{row.vendorId?.name || 'N/A'}</p>
          <p className="text-[11px] font-mono text-slate-400">{row.vendorId?.vendorCode}</p>
        </div>
      ),
    },
    {
      header: 'Bank & Account Details',
      render: (row) => (
        <div className="text-[11px] text-slate-600">
          <p className="font-semibold text-slate-700">{row.vendorId?.bankDetails?.bankName || 'HDFC Bank'}</p>
          <p className="font-mono text-slate-500">A/C: {row.vendorId?.bankDetails?.accountNumber || '••••••••4819'}</p>
          <p className="font-mono text-slate-400">IFSC: {row.vendorId?.bankDetails?.ifscCode || 'HDFC0001234'}</p>
        </div>
      ),
    },
    {
      header: 'Disbursement Date',
      render: (row) => (
        <span className="text-xs text-slate-600 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          {new Date(row.updatedAt || row.invoiceDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Amount Paid',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold text-teal-700 text-xs">
          ₹{Number(row.amount).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Settlement Status',
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> PAID • PO CLOSED
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Payment Ledger</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Permanent record of all bank transfers, electronic disbursements, and associated closed purchase orders
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <SearchBar
          placeholder="Search by invoice number..."
          initialValue={search}
          onSearch={(val) => setSearch(val)}
        />
      </div>

      {error && <ErrorState message={error} onRetry={() => fetchPayments(pagination.page)} />}

      <DataTable
        columns={columns}
        data={payments}
        loading={loading}
        emptyTitle="No settled payments found"
        emptyDescription="Once approved invoices are paid, financial disbursement records will appear here."
      />

      <Pagination pagination={pagination} onPageChange={(p) => fetchPayments(p)} />
    </div>
  );
}
