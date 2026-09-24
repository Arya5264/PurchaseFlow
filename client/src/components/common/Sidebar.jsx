import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  ShoppingCart,
  Users,
  Building2,
  CheckSquare,
  History,
  Truck,
  PackageCheck,
  CreditCard,
  BarChart3,
  ShieldAlert,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { user } = useAuth();
  if (!user) return null;

  const getLinksForRole = (role) => {
    switch (role) {
      case 'ADMIN':
        return [
          { name: 'Admin Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
          { name: 'User Management', path: '/admin/users', icon: Users },
          { name: 'Vendor Directory', path: '/admin/vendors', icon: Building2 },
          { name: 'Audit Logs', path: '/admin/audit-logs', icon: ShieldAlert },
          { name: 'Analytics & Reports', path: '/reports', icon: BarChart3 },
          { name: 'Notifications', path: '/notifications', icon: Bell },
        ];

      case 'PURCHASE_MANAGER':
        return [
          { name: 'Procurement Dashboard', path: '/purchase/dashboard', icon: LayoutDashboard },
          { name: 'Requisitions', path: '/purchase/requisitions', icon: FileText },
          { name: 'New Requisition', path: '/purchase/requisitions/create', icon: PlusCircle },
          { name: 'Purchase Orders', path: '/purchase/orders', icon: ShoppingCart },
          { name: 'Generate PO', path: '/purchase/orders/create', icon: PlusCircle },
          { name: 'Vendor Directory', path: '/purchase/vendors', icon: Building2 },
          { name: 'Analytics & Reports', path: '/reports', icon: BarChart3 },
          { name: 'Notifications', path: '/notifications', icon: Bell },
        ];

      case 'APPROVER':
        return [
          { name: 'Approval Dashboard', path: '/approver/dashboard', icon: LayoutDashboard },
          { name: 'Pending Approvals', path: '/approver/pending', icon: CheckSquare },
          { name: 'Approval History', path: '/approver/history', icon: History },
          { name: 'Notifications', path: '/notifications', icon: Bell },
        ];

      case 'VENDOR':
        return [
          { name: 'Vendor Dashboard', path: '/vendor/dashboard', icon: LayoutDashboard },
          { name: 'Purchase Orders', path: '/vendor/orders', icon: ShoppingCart },
          { name: 'My Invoices', path: '/vendor/invoices', icon: FileText },
          { name: 'Notifications', path: '/notifications', icon: Bell },
        ];

      case 'WAREHOUSE':
        return [
          { name: 'Warehouse Dashboard', path: '/warehouse/dashboard', icon: LayoutDashboard },
          { name: 'Expected Deliveries', path: '/warehouse/deliveries', icon: Truck },
          { name: 'Goods Receipts', path: '/warehouse/receipts', icon: PackageCheck },
          { name: 'Notifications', path: '/notifications', icon: Bell },
        ];

      case 'FINANCE':
        return [
          { name: 'Finance Dashboard', path: '/finance/dashboard', icon: LayoutDashboard },
          { name: 'Invoices & 3-Way Match', path: '/finance/invoices', icon: FileText },
          { name: 'Payments', path: '/finance/payments', icon: CreditCard },
          { name: 'Financial Reports', path: '/reports', icon: BarChart3 },
          { name: 'Notifications', path: '/notifications', icon: Bell },
        ];

      default:
        return [];
    }
  };

  const navLinks = getLinksForRole(user.role);

  return (
    <aside className="w-64 shrink-0 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col h-[calc(100vh-4rem)] sticky top-16 select-none">
      {/* Role Banner */}
      <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/40">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Active Workspace</p>
        <p className="text-sm font-bold text-white mt-0.5 tracking-wide">{user.role.replace(/_/g, ' ')}</p>
      </div>

      {/* Nav Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navLinks.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path.endsWith('/dashboard')}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Bottom Footer / Status info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>System Online • MERN v1.0</span>
        </div>
      </div>
    </aside>
  );
}
