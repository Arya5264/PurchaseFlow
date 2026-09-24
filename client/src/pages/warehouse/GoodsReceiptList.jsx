import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PackageCheck, Plus, Search, Calendar, User, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';
import ErrorState from '../../components/common/ErrorState';

export default function GoodsReceiptList() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [search, setSearch] = useState('');

  const fetchReceipts = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError('');
        const params = new URLSearchParams({
          page,
          limit: pagination.limit,
          ...(search && { search }),
        });

        const res = await api.get(`/receipts?${params.toString()}`);
        if (res.data && res.data.success) {
          setReceipts(res.data.data);
          setPagination(res.data.pagination);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch goods receipts');
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, search]
  );

  useEffect(() => {
    fetchReceipts(1);
  }, [fetchReceipts]);

  const conditionColors = {
    EXCELLENT: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    GOOD: 'bg-teal-100 text-teal-800 border-teal-200',
    DAMAGED: 'bg-rose-100 text-rose-800 border-rose-200',
    PARTIAL: 'bg-amber-100 text-amber-800 border-amber-200',
  };

  const columns = [
    {
      header: 'Receipt No.',
      accessor: 'receiptNumber',
      render: (row) => (
        <span className="font-mono font-bold text-xs text-sky-700 bg-sky-50 px-2 py-1 rounded border border-sky-200">
          {row.receiptNumber}
        </span>
      ),
    },
    {
      header: 'Purchase Order',
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-xs text-slate-800 block">
            {row.poId?.poNumber || 'N/A'}
          </span>
          <span className="text-[11px] text-slate-500">{row.poId?.vendorId?.name}</span>
        </div>
      ),
    },
    {
      header: 'Received Date',
      render: (row) => new Date(row.receivedDate).toLocaleDateString(),
    },
    {
      header: 'Received By',
      render: (row) => (
        <span className="text-xs text-slate-700 font-medium flex items-center gap-1">
          <User className="w-3.5 h-3.5 text-slate-400" />
          {row.receivedBy?.name || 'Warehouse Staff'}
        </span>
      ),
    },
    {
      header: 'Condition',
      render: (row) => (
        <span
          className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
            conditionColors[row.condition] || 'bg-slate-100 text-slate-700'
          }`}
        >
          {row.condition}
        </span>
      ),
    },
    {
      header: 'Items Logged',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          {row.receivedItems?.map((it, idx) => (
            <div key={idx} className="text-slate-700">
              <span className="font-semibold">{it.itemName}:</span>{' '}
              <span className="text-emerald-700 font-bold">{it.receivedQuantity} rec</span>
              {it.damagedQuantity > 0 && (
                <span className="text-rose-600 font-bold"> ({it.damagedQuantity} damaged)</span>
              )}
            </div>
          ))}
        </div>
      ),
    },
    {
      header: 'Remarks',
      render: (row) => (
        <span className="text-xs text-slate-500 italic">
          {row.remarks || 'No remarks recorded'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Goods Receipts</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Historical ledger of all inward shipment inspections, physical received quantities, and item conditions
          </p>
        </div>
        <Link
          to="/warehouse/receipts/record"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition shadow-xs"
        >
          <Plus className="w-4 h-4" /> Record New Receipt
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <SearchBar
          placeholder="Search by GR number..."
          initialValue={search}
          onSearch={(val) => setSearch(val)}
        />
      </div>

      {error && <ErrorState message={error} onRetry={() => fetchReceipts(pagination.page)} />}

      <DataTable
        columns={columns}
        data={receipts}
        loading={loading}
        emptyTitle="No goods receipts found"
        emptyDescription="When inward deliveries arrive, record them to update stock and enable 3-way matching."
      />

      <Pagination pagination={pagination} onPageChange={(p) => fetchReceipts(p)} />
    </div>
  );
}
