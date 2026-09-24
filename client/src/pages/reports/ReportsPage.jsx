import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { Download, BarChart3, TrendingUp, Building2, Layers, DollarSign } from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';

const COLORS = ['#0d9488', '#0284c7', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#6366f1'];

export default function ReportsPage() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/reports/purchases');
      if (res.data && res.data.success) {
        setReportData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load purchase analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExportCSV = () => {
    if (!reportData) return;

    let csvContent = 'data:text/csv;charset=utf-8,';

    // 1. Monthly Spend Section
    csvContent += '--- MONTHLY PROCUREMENT SPEND ---\n';
    csvContent += 'Month,Total Amount (INR),Orders Count\n';
    reportData.monthlySpend?.forEach((m) => {
      csvContent += `${m.month},${m.amount},${m.count}\n`;
    });

    // 2. Spend by Vendor Section
    csvContent += '\n--- SPEND BY VENDOR ---\n';
    csvContent += 'Vendor Code,Vendor Name,Total Spend (INR),Orders Fulfilled\n';
    reportData.spendByVendor?.forEach((v) => {
      csvContent += `${v.vendorCode},"${v.vendorName}",${v.totalAmount},${v.count}\n`;
    });

    // 3. Requisitions by Department Section
    csvContent += '\n--- REQUISITIONS BY DEPARTMENT ---\n';
    csvContent += 'Department,Estimated Budget (INR),Requisitions Count\n';
    reportData.requisitionsByDept?.forEach((d) => {
      csvContent += `"${d.department}",${d.cost},${d.count}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PurchaseFlow_Procurement_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (loading) return <LoadingSpinner text="Generating procurement analytical charts..." size="large" />;
  if (error) return <ErrorState message={error} onRetry={fetchReports} />;

  const totalSpend = reportData?.monthlySpend?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0;
  const topVendor = reportData?.spendByVendor?.[0]?.vendorName || 'N/A';
  const topDept = reportData?.requisitionsByDept?.[0]?.department || 'N/A';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Analytics & Procurement Reports</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Visual spend analytics, vendor volume breakdowns, and departmental requisition trends
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-2xs cursor-pointer"
        >
          <Download className="w-4 h-4 text-teal-600" /> Export CSV Audit Report
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total Analyzed Spend
          </span>
          <span className="text-2xl font-extrabold text-teal-700 font-mono">
            ₹{totalSpend.toLocaleString('en-IN')}
          </span>
          <p className="text-[11px] text-slate-400 mt-1">Sum of active and closed purchase orders</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Highest Spend Department
          </span>
          <span className="text-xl font-bold text-slate-800 truncate block">{topDept}</span>
          <p className="text-[11px] text-slate-400 mt-1">Leading team in requisition budgets</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Top Supplier by Value
          </span>
          <span className="text-xl font-bold text-slate-800 truncate block">{topVendor}</span>
          <p className="text-[11px] text-slate-400 mt-1">Largest procurement contract recipient</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Monthly Purchase Spend (Area / Bar) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-teal-600" /> Monthly Procurement Spend (₹)
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Timeline Trend</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reportData?.monthlySpend || []}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Spend']}
                  labelFormatter={(lbl) => `Month: ${lbl}`}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#0d9488"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#spendGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Spend by Vendor (Horizontal Bar) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-sky-600" /> Spend by Vendor Partner
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Top Commercial Volume</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={reportData?.spendByVendor?.slice(0, 5) || []}
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <YAxis dataKey="vendorName" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Spend']} />
                <Bar dataKey="totalAmount" fill="#0284c7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Requisitions by Department (Pie Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-600" /> Requisitions by Department
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Budget Share</span>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportData?.requisitionsByDept || []}
                  dataKey="cost"
                  nameKey="department"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {reportData?.requisitionsByDept?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Budget']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Status Distributions Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-amber-600" /> Status Distribution Overview
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">System Health</span>
          </div>

          <div className="space-y-4 pt-1 text-xs">
            <div>
              <p className="font-bold text-slate-700 mb-2">Purchase Orders Breakdown</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {reportData?.poStatuses?.map((s, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      {s.status}
                    </span>
                    <span className="text-base font-extrabold text-slate-800">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="font-bold text-slate-700 mb-2">3-Way Match Statuses</p>
              <div className="grid grid-cols-3 gap-2">
                {reportData?.invoiceStatuses?.map((s, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 border rounded-xl ${
                      s.status === 'MATCHED'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : s.status === 'MISMATCHED'
                        ? 'bg-rose-50 border-rose-200 text-rose-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold block">{s.status}</span>
                    <span className="text-base font-extrabold">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
