import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Eye, Download, CheckSquare, Truck, Receipt, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorState from '../../components/common/ErrorState';
import SubmitInvoiceModal from './SubmitInvoiceModal';

export default function VendorOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Invoice modal
  const [selectedPoForInvoice, setSelectedPoForInvoice] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState('');

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
          setOrders(res.data.data);
          setPagination(res.data.pagination);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch your purchase orders');
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, search, statusFilter]
  );

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const handleDownloadPDF = async (poId, poNumber) => {
    try {
      setDownloadingId(poId);
      const res = await api.get(`/purchase-orders/${poId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${poNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleAcknowledge = async (poId, poNumber) => {
    try {
      setActionLoadingId(poId);
      await api.post(`/purchase-orders/${poId}/acknowledge`);
      setSuccessBanner(`Purchase Order ${poNumber} acknowledged successfully.`);
      setTimeout(() => setSuccessBanner(''), 4000);
      fetchOrders(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to acknowledge order');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkInTransit = async (poId, poNumber) => {
    try {
      setActionLoadingId(poId);
      await api.post(`/purchase-orders/${poId}/in-transit`);
      setSuccessBanner(`Purchase Order ${poNumber} marked as In-Transit.`);
      setTimeout(() => setSuccessBanner(''), 4000);
      fetchOrders(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update order to in-transit');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenInvoiceModal = (po) => {
    setSelectedPoForInvoice(po);
    setIsInvoiceModalOpen(true);
  };

  const handleInvoiceSuccess = (invoice) => {
    setSuccessBanner(`Invoice ${invoice.invoiceNumber} submitted successfully. 3-Way Match: ${invoice.matchStatus}`);
    setTimeout(() => setSuccessBanner(''), 5000);
    fetchOrders(pagination.page);
  };

  const columns = [
    {
      header: 'PO Number',
      accessor: 'poNumber',
      render: (row) => (
        <Link
          to={`/vendor/orders/${row._id}`}
          className="font-mono font-bold text-xs text-teal-700 hover:text-teal-900 bg-teal-50 px-2 py-1 rounded border border-teal-200"
        >
          {row.poNumber}
        </Link>
      ),
    },
    {
      header: 'Issued Date',
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      header: 'Items Qty',
      render: (row) => (
        <span className="text-xs text-slate-700 font-semibold">
          {row.items?.reduce((sum, i) => sum + i.quantity, 0)} units ({row.items?.length} items)
        </span>
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
      header: 'Expected Delivery',
      render: (row) => (
        <span className="text-xs text-slate-600 font-medium">
          {new Date(row.deliveryDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Current Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => {
        const isActionLoading = actionLoadingId === row._id;
        const canAcknowledge = row.status === 'SENT';
        const canShip = row.status === 'ACKNOWLEDGED';
        const canInvoice = ['IN_TRANSIT', 'PARTIALLY_RECEIVED', 'DELIVERED', 'INVOICE_PENDING'].includes(
          row.status
        );

        return (
          <div className="flex items-center justify-end gap-1.5 flex-wrap">
            <Link
              to={`/vendor/orders/${row._id}`}
              className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
              title="View PO Details"
            >
              <Eye className="w-4 h-4" />
            </Link>

            <button
              onClick={() => handleDownloadPDF(row._id, row.poNumber)}
              disabled={downloadingId === row._id}
              className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition disabled:opacity-50"
              title="Download PO PDF"
            >
              <Download className="w-4 h-4" />
            </button>

            {canAcknowledge && (
              <button
                onClick={() => handleAcknowledge(row._id, row.poNumber)}
                disabled={isActionLoading}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 transition disabled:opacity-50 cursor-pointer"
                title="Acknowledge Receipt of Order"
              >
                <CheckSquare className="w-3 h-3" /> Acknowledge
              </button>
            )}

            {canShip && (
              <button
                onClick={() => handleMarkInTransit(row._id, row.poNumber)}
                disabled={isActionLoading}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 transition disabled:opacity-50 cursor-pointer"
                title="Mark Shipment In-Transit"
              >
                <Truck className="w-3 h-3" /> Ship
              </button>
            )}

            {canInvoice && (
              <button
                onClick={() => handleOpenInvoiceModal(row)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition cursor-pointer"
                title="Submit Commercial Invoice"
              >
                <Receipt className="w-3 h-3" /> Submit Invoice
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Vendor Orders</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Review authorized purchase orders, confirm fulfillment, mark items in transit, and submit invoices
          </p>
        </div>
      </div>

      {successBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Filter and Search */}
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
          <option value="">All Fulfillment Statuses</option>
          <option value="SENT">Awaiting Acknowledgment (SENT)</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="PARTIALLY_RECEIVED">Partially Received</option>
          <option value="DELIVERED">Delivered</option>
          <option value="INVOICE_PENDING">Invoice Pending</option>
          <option value="PAYMENT_PENDING">Payment Pending</option>
          <option value="PAID">Paid</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {error && <ErrorState message={error} onRetry={() => fetchOrders(pagination.page)} />}

      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        emptyTitle="No purchase orders found"
        emptyDescription="You will receive new purchase orders here as soon as procurement teams issue them."
      />

      <Pagination pagination={pagination} onPageChange={(p) => fetchOrders(p)} />

      {/* Submit Invoice Modal */}
      <SubmitInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        po={selectedPoForInvoice}
        onSuccess={handleInvoiceSuccess}
      />
    </div>
  );
}
