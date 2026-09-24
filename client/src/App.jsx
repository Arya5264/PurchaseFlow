import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import RoleRoute from './components/common/RoleRoute';
import DashboardLayout from './layouts/DashboardLayout';
import LoadingSpinner from './components/common/LoadingSpinner';

// Pages
import Login from './pages/auth/Login';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import VendorManagement from './pages/admin/VendorManagement';
import AuditLogs from './pages/admin/AuditLogs';

// Purchase Manager
import PurchaseDashboard from './pages/purchase/PurchaseDashboard';
import RequisitionList from './pages/purchase/RequisitionList';
import CreateRequisition from './pages/purchase/CreateRequisition';
import RequisitionDetails from './pages/purchase/RequisitionDetails';
import PurchaseOrderList from './pages/purchase/PurchaseOrderList';
import CreatePurchaseOrder from './pages/purchase/CreatePurchaseOrder';
import PurchaseOrderDetails from './pages/purchase/PurchaseOrderDetails';

// Approver
import ApproverDashboard from './pages/approver/ApproverDashboard';
import PendingApprovals from './pages/approver/PendingApprovals';
import ApprovalHistory from './pages/approver/ApprovalHistory';

// Vendor
import VendorDashboard from './pages/vendor/VendorDashboard';
import VendorOrders from './pages/vendor/VendorOrders';
import VendorOrderDetails from './pages/vendor/VendorOrderDetails';
import VendorInvoices from './pages/vendor/VendorInvoices';

// Warehouse
import WarehouseDashboard from './pages/warehouse/WarehouseDashboard';
import ExpectedDeliveries from './pages/warehouse/ExpectedDeliveries';
import GoodsReceiptList from './pages/warehouse/GoodsReceiptList';
import RecordGoodsReceipt from './pages/warehouse/RecordGoodsReceipt';

// Finance
import FinanceDashboard from './pages/finance/FinanceDashboard';
import InvoiceList from './pages/finance/InvoiceList';
import InvoiceDetails from './pages/finance/InvoiceDetails';
import PaymentManagement from './pages/finance/PaymentManagement';

// Cross-Role
import NotificationsPage from './pages/notifications/NotificationsPage';
import ReportsPage from './pages/reports/ReportsPage';

function RootRedirect() {
  const { user, loading, isAuthenticated, getDefaultRouteForRole } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <LoadingSpinner text="Initializing session..." size="large" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Public Auth Route */}
            <Route path="/login" element={<Login />} />

            {/* Root Route */}
            <Route path="/" element={<RootRedirect />} />

            {/* Protected Application Workspace */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* ADMIN ROUTES */}
              <Route
                path="/admin/dashboard"
                element={
                  <RoleRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <RoleRoute allowedRoles={['ADMIN']}>
                    <UserManagement />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/vendors"
                element={
                  <RoleRoute allowedRoles={['ADMIN', 'PURCHASE_MANAGER']}>
                    <VendorManagement />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/audit-logs"
                element={
                  <RoleRoute allowedRoles={['ADMIN']}>
                    <AuditLogs />
                  </RoleRoute>
                }
              />

              {/* PURCHASE MANAGER ROUTES */}
              <Route
                path="/purchase/dashboard"
                element={
                  <RoleRoute allowedRoles={['PURCHASE_MANAGER', 'ADMIN']}>
                    <PurchaseDashboard />
                  </RoleRoute>
                }
              />
              <Route
                path="/purchase/requisitions"
                element={
                  <RoleRoute allowedRoles={['PURCHASE_MANAGER', 'ADMIN']}>
                    <RequisitionList />
                  </RoleRoute>
                }
              />
              <Route
                path="/purchase/requisitions/create"
                element={
                  <RoleRoute allowedRoles={['PURCHASE_MANAGER', 'ADMIN']}>
                    <CreateRequisition />
                  </RoleRoute>
                }
              />
              <Route
                path="/purchase/requisitions/:id"
                element={
                  <RoleRoute allowedRoles={['PURCHASE_MANAGER', 'APPROVER', 'ADMIN']}>
                    <RequisitionDetails />
                  </RoleRoute>
                }
              />
              <Route
                path="/purchase/orders"
                element={
                  <RoleRoute allowedRoles={['PURCHASE_MANAGER', 'ADMIN']}>
                    <PurchaseOrderList />
                  </RoleRoute>
                }
              />
              <Route
                path="/purchase/orders/create"
                element={
                  <RoleRoute allowedRoles={['PURCHASE_MANAGER', 'ADMIN']}>
                    <CreatePurchaseOrder />
                  </RoleRoute>
                }
              />
              <Route
                path="/purchase/orders/:id"
                element={
                  <RoleRoute allowedRoles={['PURCHASE_MANAGER', 'ADMIN', 'FINANCE', 'WAREHOUSE']}>
                    <PurchaseOrderDetails />
                  </RoleRoute>
                }
              />
              <Route
                path="/purchase/vendors"
                element={
                  <RoleRoute allowedRoles={['PURCHASE_MANAGER', 'ADMIN']}>
                    <VendorManagement />
                  </RoleRoute>
                }
              />

              {/* APPROVER ROUTES */}
              <Route
                path="/approver/dashboard"
                element={
                  <RoleRoute allowedRoles={['APPROVER', 'ADMIN']}>
                    <ApproverDashboard />
                  </RoleRoute>
                }
              />
              <Route
                path="/approver/pending"
                element={
                  <RoleRoute allowedRoles={['APPROVER', 'ADMIN']}>
                    <PendingApprovals />
                  </RoleRoute>
                }
              />
              <Route
                path="/approver/history"
                element={
                  <RoleRoute allowedRoles={['APPROVER', 'ADMIN']}>
                    <ApprovalHistory />
                  </RoleRoute>
                }
              />

              {/* VENDOR ROUTES */}
              <Route
                path="/vendor/dashboard"
                element={
                  <RoleRoute allowedRoles={['VENDOR']}>
                    <VendorDashboard />
                  </RoleRoute>
                }
              />
              <Route
                path="/vendor/orders"
                element={
                  <RoleRoute allowedRoles={['VENDOR']}>
                    <VendorOrders />
                  </RoleRoute>
                }
              />
              <Route
                path="/vendor/orders/:id"
                element={
                  <RoleRoute allowedRoles={['VENDOR']}>
                    <VendorOrderDetails />
                  </RoleRoute>
                }
              />
              <Route
                path="/vendor/invoices"
                element={
                  <RoleRoute allowedRoles={['VENDOR']}>
                    <VendorInvoices />
                  </RoleRoute>
                }
              />

              {/* WAREHOUSE ROUTES */}
              <Route
                path="/warehouse/dashboard"
                element={
                  <RoleRoute allowedRoles={['WAREHOUSE', 'ADMIN']}>
                    <WarehouseDashboard />
                  </RoleRoute>
                }
              />
              <Route
                path="/warehouse/deliveries"
                element={
                  <RoleRoute allowedRoles={['WAREHOUSE', 'ADMIN']}>
                    <ExpectedDeliveries />
                  </RoleRoute>
                }
              />
              <Route
                path="/warehouse/receipts"
                element={
                  <RoleRoute allowedRoles={['WAREHOUSE', 'ADMIN', 'PURCHASE_MANAGER']}>
                    <GoodsReceiptList />
                  </RoleRoute>
                }
              />
              <Route
                path="/warehouse/receipts/record"
                element={
                  <RoleRoute allowedRoles={['WAREHOUSE', 'ADMIN']}>
                    <RecordGoodsReceipt />
                  </RoleRoute>
                }
              />

              {/* FINANCE ROUTES */}
              <Route
                path="/finance/dashboard"
                element={
                  <RoleRoute allowedRoles={['FINANCE', 'ADMIN']}>
                    <FinanceDashboard />
                  </RoleRoute>
                }
              />
              <Route
                path="/finance/invoices"
                element={
                  <RoleRoute allowedRoles={['FINANCE', 'ADMIN']}>
                    <InvoiceList />
                  </RoleRoute>
                }
              />
              <Route
                path="/finance/invoices/:id"
                element={
                  <RoleRoute allowedRoles={['FINANCE', 'ADMIN']}>
                    <InvoiceDetails />
                  </RoleRoute>
                }
              />
              <Route
                path="/finance/payments"
                element={
                  <RoleRoute allowedRoles={['FINANCE', 'ADMIN']}>
                    <PaymentManagement />
                  </RoleRoute>
                }
              />

              {/* CROSS-ROLE ROUTES */}
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route
                path="/reports"
                element={
                  <RoleRoute allowedRoles={['ADMIN', 'PURCHASE_MANAGER', 'FINANCE']}>
                    <ReportsPage />
                  </RoleRoute>
                }
              />
            </Route>

            {/* Fallback Catch-all Route */}
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
