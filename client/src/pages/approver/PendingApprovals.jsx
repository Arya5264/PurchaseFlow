import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, Eye, Clock, Building, Calendar, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';
import Modal from '../../components/common/Modal';
import ErrorState from '../../components/common/ErrorState';

export default function PendingApprovals() {
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [search, setSearch] = useState('');

  // Sign-off modal state
  const [selectedPR, setSelectedPR] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchPending = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page,
        limit: pagination.limit,
        ...(search && { search }),
      });

      const res = await api.get(`/approvals/pending?${params.toString()}`);
      if (res.data && res.data.success) {
        setRequisitions(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch pending approval list');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, search]);

  useEffect(() => {
    fetchPending(1);
  }, [fetchPending]);

  const handleOpenReview = (pr) => {
    setSelectedPR(pr);
    setRemarks('');
    setModalError('');
  };

  const handleDecision = async (decision) => {
    if (decision === 'REJECTED' && (!remarks || remarks.trim() === '')) {
      setModalError('Rejection remarks are mandatory. Please state the reason for declining this request.');
      return;
    }

    try {
      setActionLoading(true);
      setModalError('');
      const endpoint = decision === 'APPROVED' ? 'approve' : 'reject';
      await api.post(`/approvals/${selectedPR._id}/${endpoint}`, { remarks });

      setSelectedPR(null);
      fetchPending(pagination.page);
    } catch (err) {
      setModalError(err.response?.data?.message || err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      header: 'PR Number',
      accessor: 'prNumber',
      render: (row) => (
        <span className="font-mono font-bold text-xs text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
          {row.prNumber}
        </span>
      ),
    },
    {
      header: 'Requester',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800 text-xs">{row.requestedBy?.name || 'Staff'}</p>
          <p className="text-[11px] text-slate-400">{row.requestedBy?.email}</p>
        </div>
      ),
    },
    {
      header: 'Department',
      accessor: 'department',
      render: (row) => <span className="text-xs font-medium text-slate-700">{row.department}</span>,
    },
    {
      header: 'Item Description',
      render: (row) => (
        <div className="max-w-xs">
          <p className="font-semibold text-slate-800 text-xs">{row.itemName}</p>
          <p className="text-[11px] text-slate-400 truncate">{row.description}</p>
        </div>
      ),
    },
    {
      header: 'Qty',
      accessor: 'quantity',
      align: 'center',
      render: (row) => <span className="font-bold text-slate-800 text-xs">{row.quantity}</span>,
    },
    {
      header: 'Budget Value',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold text-teal-700 text-xs">
          ₹{Number(row.estimatedCost).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Required By',
      render: (row) => new Date(row.requiredDate).toLocaleDateString(),
    },
    {
      header: 'Submitted',
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      header: 'Action',
      align: 'right',
      render: (row) => (
        <button
          onClick={() => handleOpenReview(row)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition shadow-2xs cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" /> Review
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Pending Requisitions</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Review and provide formal decision authorization on departmental purchase requisitions
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <SearchBar
          placeholder="Search by PR number or item name..."
          initialValue={search}
          onSearch={(val) => setSearch(val)}
        />
        <span className="text-xs font-semibold text-slate-400">
          {pagination.total} Requisitions Pending Review
        </span>
      </div>

      {error && <ErrorState message={error} onRetry={() => fetchPending(pagination.page)} />}

      <DataTable
        columns={columns}
        data={requisitions}
        loading={loading}
        emptyTitle="No pending approvals"
        emptyDescription="All submitted purchase requisitions have been processed."
      />

      <Pagination pagination={pagination} onPageChange={(p) => fetchPending(p)} />

      {/* Review & Decision Sign-off Modal */}
      {selectedPR && (
        <Modal
          isOpen={!!selectedPR}
          onClose={() => setSelectedPR(null)}
          title={`Review Requisition: ${selectedPR.prNumber}`}
          maxWidth="max-w-2xl"
        >
          {modalError && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-base text-slate-800">{selectedPR.itemName}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Requested by <span className="font-semibold text-slate-700">{selectedPR.requestedBy?.name}</span>{' '}
                    ({selectedPR.department})
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Estimated Budget
                  </span>
                  <span className="text-lg font-mono font-black text-teal-700">
                    ₹{Number(selectedPR.estimatedCost).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 text-xs text-slate-600">
                <span className="font-bold text-slate-700 block mb-1">Specifications & Justification:</span>
                <p className="whitespace-pre-wrap">{selectedPR.description || 'No additional specifications provided.'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400">Quantity Needed:</span>{' '}
                  <span className="font-bold text-slate-800">{selectedPR.quantity} units</span>
                </div>
                <div>
                  <span className="text-slate-400">Required Date:</span>{' '}
                  <span className="font-bold text-slate-800">
                    {new Date(selectedPR.requiredDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Sign-off Remarks / Comments
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter remarks or justification (Mandatory for rejection)..."
                className="w-full text-xs border border-slate-200 rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
              />
            </div>

            {/* Decision Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedPR(null)}
                disabled={actionLoading}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleDecision('REJECTED')}
                disabled={actionLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" /> Reject Requisition
              </button>

              <button
                type="button"
                onClick={() => handleDecision('APPROVED')}
                disabled={actionLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve Requisition
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
