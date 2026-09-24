import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Plus, Eye, Download, Send, ArrowUpRight } from 'lucide-react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorState from '../../components/common/ErrorState';
import { useAuth } from '../../context/AuthContext';

export default function PurchaseOrderList() {
  const { hasRole } = useAuth();
  const canManage = hasRole('PURCHASE_MANAGER', 'ADMIN');

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchOrders = useCallback(async (page = 1) => {
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
        setOrders(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, search, statusFilter]);

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const handleDownloadPDF = async (poId, poNumber) => {
    try {
      setDownloadingId(poId);
      const res = await api.get(`/purchase-orders/${poId}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${poNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to download PO PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSendToVendor = async (poId) => {
    try {
      await api.post(`/purchase-orders/${poId}/send`);
      fetchOrders(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send PO to vendor');
    }
  };

  const columns = [
    {
      header: 'PO Number',
      accessor: 'poNumber',
      render: (row) => (
        <Link
          to={`/purchase/orders/${row._id}`}
          className="font-mono font-bold text-xs text-teal-700 hover:text-teal-900 bg-teal-50 px-2 py-1 rounded border border-teal-200"
        >
          {row.poNumber}
        </Link>
      ),
    },
    {
      header: 'PR Ref',
      render: (row) => (
        <span className="font-mono text-xs text-slate-500">{row.prId?.prNumber || 'N/A'}</span>
      ),
    },
    {
      header: 'Supplier / Vendor',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800 text-xs">{row.vendorId?.name || 'N/A'}</p>
          <p className="text-[11px] font-mono text-slate-400">{row.vendorId?.vendorCode}</p>
        </div>
      ),
    },
    {
      header: 'Total Value',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold text-slate-800 text-xs">
          ₹{Number(row.totalAmount).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Delivery Target',
      render: (row) => new Date(row.deliveryDate).toLocaleDateString(),
    },
    {
      header: 'Lifecycle State',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            to={`/purchase/orders/${row._id}`}
            className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <button
            onClick={() => handleDownloadPDF(row._id, row.poNumber)}
            disabled={downloadingId === row._id}
            className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition disabled:opacity-50"
            title="Download PDF"
          >
            <Download className="w-4 h-4" />
          </button>
          {canManage && row.status === 'GENERATED' && (
            <button
              onClick={() => handleSendToVendor(row._id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-700 transition"
              title="Send to Vendor"
            >
              <Send className="w-3 h-3" /> Send
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Purchase Orders</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage binding procurement commitments, PDF exports, and supplier delivery tracking
          </p>
        </div>
        {canManage && (
          <Link
            to="/purchase/orders/create"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition shadow-xs"
          >
            <Plus className="w-4 h-4" /> Generate Purchase Order
          </Link>
        )}
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
          <option value="">All PO Statuses</option>
          <option value="GENERATED">Generated</option>
          <option value="SENT">Sent</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="PARTIALLY_RECEIVED">Partially Received</option>
          <option value="DELIVERED">Delivered</option>
          <option value="INVOICE_PENDING">Invoice Pending</option>
          <option value="PAYMENT_PENDING">Payment Pending</option>
          <option value="PAID">Paid</option>
          <option value="CLOSED">Closed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {error && <ErrorState message={error} onRetry={() => fetchOrders(pagination.page)} />}

      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        emptyTitle="No purchase orders found"
        emptyDescription="Generate a purchase order from an approved purchase requisition."
      />

      <Pagination pagination={pagination} onPageChange={(p) => fetchOrders(p)} />
    </div>
  );
}
