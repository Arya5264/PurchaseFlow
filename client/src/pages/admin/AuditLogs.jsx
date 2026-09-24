import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Terminal, Calendar, User, Search } from 'lucide-react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';
import ErrorState from '../../components/common/ErrorState';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const fetchLogs = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(actionFilter && { action: actionFilter }),
        ...(entityFilter && { entityType: entityFilter }),
      });

      const res = await api.get(`/audit-logs?${params.toString()}`);
      if (res.data && res.data.success) {
        setLogs(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch audit log trail');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, search, actionFilter, entityFilter]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const getActionBadgeColor = (action) => {
    if (action.includes('CREATE') || action.includes('GENERATE') || action.includes('REGISTER'))
      return 'bg-teal-50 text-teal-700 border-teal-200';
    if (action.includes('APPROVE') || action.includes('MATCH') || action.includes('PAY'))
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (action.includes('REJECT') || action.includes('DELETE') || action.includes('CANCEL'))
      return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const columns = [
    {
      header: 'Timestamp',
      render: (row) => (
        <div className="font-mono text-xs text-slate-600">
          <p className="font-semibold">{new Date(row.createdAt).toLocaleDateString()}</p>
          <p className="text-[11px] text-slate-400">
            {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
      ),
    },
    {
      header: 'Actor / User',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800 text-xs">{row.userId?.name || 'System / Guest'}</p>
          <p className="text-[11px] text-slate-400">{row.userId?.email || 'N/A'}</p>
        </div>
      ),
    },
    {
      header: 'Action',
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${getActionBadgeColor(
            row.action
          )}`}
        >
          {row.action}
        </span>
      ),
    },
    {
      header: 'Target Entity',
      render: (row) => (
        <span className="text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200">
          {row.entityType}
        </span>
      ),
    },
    {
      header: 'Audit Description',
      render: (row) => <p className="text-xs text-slate-700 max-w-md">{row.description}</p>,
    },
    {
      header: 'Client IP',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
          {row.ipAddress || '127.0.0.1'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">System Audit Log Trail</h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Cryptographically recorded operational audit log ensuring compliance and non-repudiation
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <SearchBar
          placeholder="Search descriptions, reasons..."
          initialValue={search}
          onSearch={(val) => setSearch(val)}
        />
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="CREATE_REQUISITION">CREATE_REQUISITION</option>
            <option value="APPROVE_REQUISITION">APPROVE_REQUISITION</option>
            <option value="REJECT_REQUISITION">REJECT_REQUISITION</option>
            <option value="GENERATE_PO">GENERATE_PO</option>
            <option value="SEND_PO">SEND_PO</option>
            <option value="ACKNOWLEDGE_PO">ACKNOWLEDGE_PO</option>
            <option value="RECORD_RECEIPT">RECORD_RECEIPT</option>
            <option value="SUBMIT_INVOICE">SUBMIT_INVOICE</option>
            <option value="RUN_THREE_WAY_MATCH">RUN_THREE_WAY_MATCH</option>
            <option value="APPROVE_INVOICE">APPROVE_INVOICE</option>
            <option value="PROCESS_PAYMENT">PROCESS_PAYMENT</option>
          </select>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="">All Entities</option>
            <option value="PurchaseRequisition">PurchaseRequisition</option>
            <option value="PurchaseOrder">PurchaseOrder</option>
            <option value="GoodsReceipt">GoodsReceipt</option>
            <option value="Invoice">Invoice</option>
            <option value="User">User</option>
            <option value="Vendor">Vendor</option>
          </select>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={() => fetchLogs(pagination.page)} />}

      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        emptyTitle="No audit records found"
        emptyDescription="Adjust your search filters to find system events."
      />

      <Pagination pagination={pagination} onPageChange={(p) => fetchLogs(p)} />
    </div>
  );
}
