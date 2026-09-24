import React from 'react';

export default function StatCard({ title, value, icon: Icon, description, color = 'teal' }) {
  const colorMap = {
    teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-l-teal-500' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-l-blue-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-l-amber-500' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-l-emerald-500' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-l-rose-500' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-l-indigo-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-l-purple-500' },
  };

  const scheme = colorMap[color] || colorMap.teal;

  return (
    <div
      className={`bg-white rounded-xl p-5 border border-slate-200 border-l-4 ${scheme.border} shadow-xs transition-all hover:shadow-md flex items-center justify-between`}
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h3>
        {description && <p className="text-xs text-slate-400 font-medium">{description}</p>}
      </div>
      {Icon && (
        <div className={`p-3 rounded-lg ${scheme.bg} ${scheme.text}`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
    </div>
  );
}
