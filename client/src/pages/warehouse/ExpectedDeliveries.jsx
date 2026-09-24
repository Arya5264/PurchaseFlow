import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Truck, PackageCheck, Eye, ArrowRight, Calendar, Building2 } from 'lucide-react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorState from '../../components/common/ErrorState';

export default function ExpectedDeliveries() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchOrders = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError('');
        const params = new URLSearchParams({
          page,
          limit: pagination.limit,
          ...(search && { search }),
          ...(statusFilter && { status: statusFilter }),
        });

        const res = await api.get(`/purchase-orders?${params.toString()}`);
        if (res.data && res.data.success) {
          // Filter to receivable statuses
          const receivableStatuses = ['SENT', 'ACKNOWLEDGED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED'];
          const filtered = res.data.data.filter((po) =>
            statusFilter ? po.status === statusFilter : receivableStatuses.includes(po.status)
          );
          setOrders(filtered);
          setPagination(res.data.pagination);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch expected deliveries');
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, search, statusFilter]
  );

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const columns = [
    {
      header: 'PO Number',
      accessor: 'poNumber',
      render: (row) => (
        <span className="font-mono font-bold text-xs text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-200">
          {row.poNumber}
        </span>
      ),
    },
    {
      header: 'Supplier / Vendor',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800 text-xs">{row.vendorId?.name || 'N/A'}</p>
          <p className="text-[11px] text-slate-400 font-mono">{row.vendorId?.vendorCode}</p>
        </div>
      ),
    },
    {
      header: 'Expected Delivery',
      render: (row) => (
        <span className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          {new Date(row.deliveryDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Ordered Items',
      render: (row) => (
        <div className="text-xs text-slate-600">
          <span className="font-semibold text-slate-800">
            {row.items?.reduce((sum, i) => sum + i.quantity, 0)} units
          </span>{' '}
          ({row.items?.length} items)
        </div>
      ),
    },
    {
      header: 'Delivery Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Action',
      align: 'right',
      render: (row) => (
        <Link
          to={`/warehouse/receipts/record?poId=${row._id}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition shadow-2xs"
        >
          <PackageCheck className="w-3.5 h-3.5" /> Record Receipt
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Expected Deliveries</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Active shipments scheduled or currently en route for inward warehouse inspection
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <SearchBar
          placeholder="Search by PO number..."
          initialValue={search}
          onSearch={(val) => setSearch(val)}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 w-full sm:w-auto"
        >
          <option value="">All Receivable Deliveries</option>
          <option value="IN_TRANSIT">In Transit Only</option>
          <option value="PARTIALLY_RECEIVED">Partially Received Only</option>
          <option value="ACKNOWLEDGED">Acknowledged by Vendor</option>
          <option value="SENT">Dispatched to Vendor</option>
        </select>
      </div>

      {error && <ErrorState message={error} onRetry={() => fetchOrders(pagination.page)} />}

      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        emptyTitle="No expected deliveries found"
        emptyDescription="All active purchase orders have either been received or none are currently scheduled."
      />

      <Pagination pagination={pagination} onPageChange={(p) => fetchOrders(p)} />
    </div>
  );
}
