import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShoppingCart,
  Truck,
  PackageCheck,
  CreditCard,
  Clock,
  CheckCheck,
} from 'lucide-react';
import api from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import Pagination from '../../components/common/Pagination';

export default function NotificationsPage() {
  const { markAsRead: contextMarkAsRead, markAllAsRead: contextMarkAllAsRead } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' or 'UNREAD'
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });

  const fetchList = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/notifications?page=${page}&limit=${pagination.limit}`);
        if (res.data && res.data.success) {
          setNotifications(res.data.data);
          setUnreadCount(res.data.unreadCount || 0);
          setPagination(res.data.pagination);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load notifications');
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit]
  );

  useEffect(() => {
    fetchList(1);
  }, [fetchList]);

  const handleMarkOneAsRead = async (id) => {
    try {
      await contextMarkAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAll = async () => {
    try {
      await contextMarkAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'PR_SUBMITTED':
      case 'PR_APPROVED':
      case 'PR_REJECTED':
        return <FileText className="w-5 h-5 text-teal-600" />;
      case 'PO_SENT':
      case 'PO_ACKNOWLEDGED':
      case 'PO_CLOSED':
        return <ShoppingCart className="w-5 h-5 text-blue-600" />;
      case 'PO_IN_TRANSIT':
        return <Truck className="w-5 h-5 text-purple-600" />;
      case 'GOODS_RECEIVED':
        return <PackageCheck className="w-5 h-5 text-emerald-600" />;
      case 'INVOICE_SUBMITTED':
      case 'INVOICE_MATCHED':
      case 'INVOICE_APPROVED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'INVOICE_MISMATCHED':
      case 'INVOICE_REJECTED':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'PAYMENT_PROCESSED':
        return <CreditCard className="w-5 h-5 text-teal-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  const displayedNotifications =
    activeTab === 'UNREAD' ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Notifications Center</h1>
            {unreadCount > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Real-time alerts for procurement requisitions, manager approvals, dock receipts, 3-way matches, and payments
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          >
            <CheckCheck className="w-4 h-4 text-teal-600" /> Mark All as Read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'ALL'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          All Activity ({notifications.length})
        </button>
        <button
          onClick={() => setActiveTab('UNREAD')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'UNREAD'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={() => fetchList(pagination.page)} />}

      {loading ? (
        <LoadingSpinner text="Fetching notifications..." />
      ) : displayedNotifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">No notifications found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {activeTab === 'UNREAD'
              ? 'You have reviewed all current notifications.'
              : 'You have no system activity notifications yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedNotifications.map((n) => (
            <div
              key={n._id}
              className={`p-4 rounded-2xl border transition flex items-start justify-between gap-4 ${
                n.isRead
                  ? 'bg-white border-slate-200/80 text-slate-700'
                  : 'bg-teal-50/40 border-teal-200 shadow-2xs text-slate-900'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                    n.isRead ? 'bg-slate-100' : 'bg-white shadow-xs'
                  }`}
                >
                  {getIconForType(n.type)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-800">{n.title}</h4>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                  <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                    {n.relatedEntity && (
                      <span className="font-mono font-semibold text-slate-500 uppercase">
                        [{n.relatedEntity}]
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!n.isRead && (
                <button
                  onClick={() => handleMarkOneAsRead(n._id)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-teal-700 bg-white border border-teal-200 rounded-md hover:bg-teal-50 transition shrink-0 cursor-pointer"
                  title="Mark as read"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}

          <Pagination pagination={pagination} onPageChange={(p) => fetchList(p)} />
        </div>
      )}
    </div>
  );
}
