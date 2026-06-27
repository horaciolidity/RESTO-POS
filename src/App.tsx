import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import POS from './pages/pos/POS';
import TablesPage from './pages/tables/Tables';
import KDS from './pages/kds/KDS';
import Delivery from './pages/delivery/Delivery';
import Inventory from './pages/inventory/Inventory';
import CashPage from './pages/cash/Cash';
import AuditPage from './pages/audit/Audit';
import IncidentsPage from './pages/incidents/Incidents';
import OrdersDisplay from './pages/orders-display/OrdersDisplay';
import CustomerBillingDisplay from './pages/customer-display/CustomerBillingDisplay';
import WaiterPage from './pages/waiter/Waiter';
import WaiterLinkHandler from './pages/waiter/WaiterLinkHandler';
import Settings from './pages/settings/Settings';
import CustomerOrder from './pages/customer-order/CustomerOrder';
import TableCall from './pages/table-call/TableCall';
import SuperAdmin from './pages/super-admin/SuperAdmin';
import { useAuthStore } from './store/useAuthStore';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles, superAdminOnly }: { children: React.ReactNode, allowedRoles?: any[], superAdminOnly?: boolean }) => {
  const { user, loading } = useAuthStore();
  
  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase">Restaurando sesión...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Super admin only routes
  if (superAdminOnly && user.role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/orders-display" element={<OrdersDisplay />} />
        <Route path="/customer-billing" element={<CustomerBillingDisplay />} />
        {/* Public QR ordering route - no auth required */}
        <Route path="/mesa/:tableToken" element={<CustomerOrder />} />

        {/* Public Table Call route - client calls waiter from QR */}
        <Route path="/llamar/:tableToken" element={<TableCall />} />
        
        {/* Public Waiter Link - auto-sets simulated auth */}
        <Route path="/m/:employeeId" element={<WaiterLinkHandler />} />

        {/* Super Admin Panel — renders inside Layout like any other page */}
        <Route path="/kds" element={
          <ProtectedRoute allowedRoles={['admin', 'cocina', 'supervisor']}>
            <KDS />
          </ProtectedRoute>
        } />
        
        {/* Rutas de Mozo - Independientes del Layout (app completa) */}
        <Route path="/waiter" element={
          <ProtectedRoute allowedRoles={['admin', 'mozo', 'supervisor']}>
            <WaiterPage />
          </ProtectedRoute>
        } />
        
        <Route path="/mozo" element={
          <ProtectedRoute allowedRoles={['admin', 'mozo', 'supervisor']}>
            <WaiterPage />
          </ProtectedRoute>
        } />

        {/* Main Application Routes inside Layout */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          
          <Route path="pos" element={
            <ProtectedRoute allowedRoles={['admin', 'cajero', 'supervisor']}>
              <POS />
            </ProtectedRoute>
          } />
          
          <Route path="tables" element={
            <ProtectedRoute allowedRoles={['admin', 'mozo', 'supervisor']}>
              <TablesPage />
            </ProtectedRoute>
          } />
          
          
          <Route path="delivery" element={
            <ProtectedRoute allowedRoles={['admin', 'cajero', 'delivery', 'supervisor']}>
              <Delivery />
            </ProtectedRoute>
          } />
          
          <Route path="inventory" element={
            <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
              <Inventory />
            </ProtectedRoute>
          } />
          
          <Route path="cash" element={
            <ProtectedRoute allowedRoles={['admin', 'cajero', 'supervisor']}>
              <CashPage />
            </ProtectedRoute>
          } />
          
          <Route path="audit" element={
            <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
              <AuditPage />
            </ProtectedRoute>
          } />
          
          <Route path="incidents" element={
            <ProtectedRoute allowedRoles={['admin', 'cajero', 'mozo', 'cocina', 'delivery', 'supervisor']}>
              <IncidentsPage />
            </ProtectedRoute>
          } />

          <Route path="settings" element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'supervisor']}>
              <Settings />
            </ProtectedRoute>
          } />

          <Route path="super-admin" element={
            <ProtectedRoute superAdminOnly>
              <SuperAdmin />
            </ProtectedRoute>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
