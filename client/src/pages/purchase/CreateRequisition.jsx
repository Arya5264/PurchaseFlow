import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Send, AlertCircle } from 'lucide-react';
import api from '../../services/api';

export default function CreateRequisition() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    department: 'Information Technology',
    itemName: '',
    description: '',
    quantity: 1,
    estimatedCost: '',
    requiredDate: '',
  });

  const handleSubmit = async (submitDirectly) => {
    if (!formData.itemName || !formData.estimatedCost || !formData.requiredDate) {
      setError('Please fill in all mandatory fields (Item Name, Estimated Cost, and Required Date).');
      return;
    }

    if (Number(formData.quantity) <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        ...formData,
        quantity: Number(formData.quantity),
        estimatedCost: Number(formData.estimatedCost),
        submitDirectly,
      };

      const res = await api.post('/requisitions', payload);
      if (res.data && res.data.success) {
        navigate('/purchase/requisitions');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create requisition');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/purchase/requisitions"
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Create Purchase Requisition</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit a formal requisition for material or service acquisition
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-xs font-semibold text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Requesting Department *
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-medium"
              >
                <option value="Information Technology">Information Technology</option>
                <option value="Operations & Facilities">Operations & Facilities</option>
                <option value="Research & Development">Research & Development</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Finance & Accounts">Finance & Accounts</option>
                <option value="Marketing & Sales">Marketing & Sales</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Item / Asset Name *
              </label>
              <input
                type="text"
                required
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                placeholder="e.g. Developer Laptops (Dell Latitude 5540)"
                className="w-full text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Technical Specifications & Business Justification
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide model specifications, processor, RAM, usage justification, project allocation..."
              className="w-full text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Quantity Required *
              </label>
              <input
                type="number"
                required
                min={1}
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Estimated Total Cost (INR) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  required
                  min={0}
                  step="any"
                  value={formData.estimatedCost}
                  onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                  placeholder="1200000"
                  className="w-full pl-8 pr-3 py-2.5 text-sm font-mono font-semibold border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Required By Date *
              </label>
              <input
                type="date"
                required
                value={formData.requiredDate}
                onChange={(e) => setFormData({ ...formData, requiredDate: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(false)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-slate-500" /> Save as Draft
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> Submit for Approval
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
