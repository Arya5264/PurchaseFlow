import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { History, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorState from '../../components/common/ErrorState';

export default function ApprovalHistory() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  const fetchHistory = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/approvals/history?page=${page}&limit=${pagination.limit}`);
      if (res.data && res.data.success) {
        setApprovals(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch approval history');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  useEffect(() => {
    fetchHistory(1);
  }, [fetchHistory]);

  const columns = [
    {
      header: 'Decision Date',
      render: (row) => (
        <span className="font-mono text-xs text-slate-600">
          {new Date(row.decisionDate).toLocaleDateString()} at{' '}
          {new Date(row.decisionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      header: 'PR Number',
      render: (row) => (
        <Link
          to={`/purchase/requisitions/${row.prId?._id}`}
          className="font-mono font-bold text-xs text-teal-700 hover:text-teal-900 bg-teal-50 px-2 py-1 rounded border border-teal-200"
        >
          {row.prId?.prNumber || 'N/A'}
        </Link>
      ),
    },
    {
      header: 'Item Name & Requester',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800 text-xs">{row.prId?.itemName || 'Item details'}</p>
          <p className="text-[11px] text-slate-400">By {row.prId?.requestedBy?.name || 'Requester'}</p>
        </div>
      ),
    },
    {
      header: 'Decision',
      render: (row) => <StatusBadge status={row.decision} />,
    },
    {
      header: 'Approver',
      render: (row) => (
        <span className="text-xs font-semibold text-slate-700">{row.approverId?.name}</span>
      ),
    },
    {
      header: 'Remarks',
      render: (row) => (
        <p className="text-xs text-slate-600 max-w-sm italic">"{row.remarks || 'No remarks entered.'}"</p>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Approval History</h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Comprehensive log of all requisition approval and rejection actions taken
        </p>
      </div>

      {error && <ErrorState message={error} onRetry={() => fetchHistory(pagination.page)} />}

      <DataTable
        columns={columns}
        data={approvals}
        loading={loading}
        emptyTitle="No approval history recorded"
        emptyDescription="Your past approval and rejection decisions will appear here."
      />

      <Pagination pagination={pagination} onPageChange={(p) => fetchHistory(p)} />
    </div>
  );
}
