import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, FileText, ArrowUpRight } from 'lucide-react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorState from '../../components/common/ErrorState';

export default function RequisitionList() {
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const fetchRequisitions = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(deptFilter && { department: deptFilter }),
      });

      const res = await api.get(`/requisitions?${params.toString()}`);
      if (res.data && res.data.success) {
        setRequisitions(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch requisitions');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, search, statusFilter, deptFilter]);

  useEffect(() => {
    fetchRequisitions(1);
  }, [fetchRequisitions]);

  const columns = [
    {
      header: 'PR Number',
      accessor: 'prNumber',
      render: (row) => (
        <Link
          to={`/purchase/requisitions/${row._id}`}
          className="font-mono font-bold text-xs text-teal-700 hover:text-teal-900 bg-teal-50 px-2 py-1 rounded border border-teal-200"
        >
          {row.prNumber}
        </Link>
      ),
    },
    {
      header: 'Item & Description',
      render: (row) => (
        <div className="max-w-xs">
          <p className="font-semibold text-slate-800">{row.itemName}</p>
          <p className="text-xs text-slate-400 truncate">{row.description || 'No description provided'}</p>
        </div>
      ),
    },
    {
      header: 'Department',
      accessor: 'department',
      render: (row) => <span className="text-xs font-medium text-slate-700">{row.department}</span>,
    },
    {
      header: 'Qty',
      accessor: 'quantity',
      align: 'center',
      render: (row) => <span className="font-semibold text-slate-800">{row.quantity}</span>,
    },
    {
      header: 'Estimated Budget',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-semibold text-slate-800">
          ₹{Number(row.estimatedCost).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Required By',
      render: (row) => new Date(row.requiredDate).toLocaleDateString(),
    },
    {
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <Link
          to={`/purchase/requisitions/${row._id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-800 p-1.5 rounded-lg hover:bg-teal-50 transition"
        >
          <Eye className="w-4 h-4" /> View
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Purchase Requisitions</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Browse internal requests, track approval states, and generate purchase orders
          </p>
        </div>
        <Link
          to="/purchase/requisitions/create"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition shadow-xs"
        >
          <Plus className="w-4 h-4" /> Create Requisition
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <SearchBar
          placeholder="Search by item name, PR number..."
          initialValue={search}
          onSearch={(val) => setSearch(val)}
        />
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="PO_GENERATED">PO Generated</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <input
            type="text"
            placeholder="Filter by Department"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 w-full sm:w-44"
          />
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={() => fetchRequisitions(pagination.page)} />}

      <DataTable
        columns={columns}
        data={requisitions}
        loading={loading}
        emptyTitle="No requisitions found"
        emptyDescription="Create a new purchase requisition to initiate procurement."
      />

      <Pagination pagination={pagination} onPageChange={(p) => fetchRequisitions(p)} />
    </div>
  );
}
