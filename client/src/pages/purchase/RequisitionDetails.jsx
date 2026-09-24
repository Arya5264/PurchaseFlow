import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, ShoppingCart, XCircle, Clock, CheckCircle2, User, Building, Calendar, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';

export default function RequisitionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canManage = hasRole('PURCHASE_MANAGER', 'ADMIN');

  const [requisition, setRequisition] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/requisitions/${id}`);
      if (res.data && res.data.success) {
        setRequisition(res.data.data);
      }

      // Fetch approvals history
      const appRes = await api.get(`/approvals/history?prId=${id}`);
      if (appRes.data && appRes.data.success) {
        setApprovals(appRes.data.data.filter((a) => a.prId?._id === id || a.prId === id));
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch requisition details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleSubmitDraft = async () => {
    try {
      setActionLoading(true);
      await api.post(`/requisitions/${id}/submit`);
      fetchDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit requisition');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequisition = async () => {
    try {
      setActionLoading(true);
      await api.post(`/requisitions/${id}/cancel`, { remarks: 'Cancelled by procurement manager' });
      setConfirmCancelOpen(false);
      fetchDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel requisition');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading requisition details..." size="large" />;
  if (error) return <ErrorState message={error} onRetry={fetchDetails} />;
  if (!requisition) return <ErrorState message="Requisition not found." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/purchase/requisitions"
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-extrabold font-mono text-slate-800">{requisition.prNumber}</span>
              <StatusBadge status={requisition.status} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Created on {new Date(requisition.createdAt).toLocaleDateString()} by{' '}
              {requisition.requestedBy?.name || 'Requester'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        {canManage && (
          <div className="flex items-center gap-2">
            {requisition.status === 'DRAFT' && (
              <button
                onClick={handleSubmitDraft}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition shadow-xs cursor-pointer"
              >
                <Send className="w-4 h-4" /> Submit for Approval
              </button>
            )}

            {requisition.status === 'APPROVED' && (
              <Link
                to={`/purchase/orders/create?prId=${requisition._id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition shadow-xs"
              >
                <ShoppingCart className="w-4 h-4" /> Generate Purchase Order
              </Link>
            )}

            {['DRAFT', 'PENDING_APPROVAL'].includes(requisition.status) && (
              <button
                onClick={() => setConfirmCancelOpen(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition cursor-pointer"
              >
                <XCircle className="w-4 h-4" /> Cancel Requisition
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Details Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{requisition.itemName}</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed whitespace-pre-wrap">
            {requisition.description || 'No detailed technical specifications provided.'}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Department
            </span>
            <span className="text-sm font-semibold text-slate-800 mt-1 block">
              {requisition.department}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Quantity
            </span>
            <span className="text-sm font-semibold text-slate-800 mt-1 block">
              {requisition.quantity} units
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Estimated Cost
            </span>
            <span className="text-sm font-bold font-mono text-teal-700 mt-1 block">
              ₹{Number(requisition.estimatedCost).toLocaleString('en-IN')}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Required By
            </span>
            <span className="text-sm font-semibold text-slate-800 mt-1 block">
              {new Date(requisition.requiredDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        {requisition.remarks && (
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-xs">
            <span className="font-bold text-amber-800 block mb-1">Remarks & Decision Notes:</span>
            <p className="text-amber-900">{requisition.remarks}</p>
          </div>
        )}
      </div>

      {/* Approval Timeline / Decision Log */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" /> Approval Sign-off History
        </h3>

        {approvals && approvals.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {approvals.map((app, idx) => (
              <div key={idx} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={app.decision} />
                    <span className="text-xs font-bold text-slate-700">
                      By {app.approverId?.name || 'Approver'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 italic">"{app.remarks || 'No remarks provided'}"</p>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                  {new Date(app.decisionDate).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-400 py-3">
            No formal approval action has been executed on this requisition yet.
          </div>
        )}
      </div>

      {/* Confirm Cancel Dialog */}
      <ConfirmDialog
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={handleCancelRequisition}
        title="Cancel Purchase Requisition"
        message={`Are you sure you want to cancel ${requisition.prNumber}? This action cannot be reversed.`}
        type="danger"
        confirmText="Yes, Cancel PR"
      />
    </div>
  );
}
