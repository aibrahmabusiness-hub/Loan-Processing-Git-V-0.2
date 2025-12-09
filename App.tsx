import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { InspectionReports } from './pages/InspectionReports';
import { PayoutReports } from './pages/PayoutReports';
import { UserManagement } from './pages/UserManagement';
import { Settings } from './pages/Settings';

const ProtectedRoute = ({ children, adminOnly = false }: React.PropsWithChildren<{ adminOnly?: boolean }>) => {
  const { user, loading, isAdmin } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="inspections" element={<InspectionReports />} />
            <Route path="payouts" element={<PayoutReports />} />
            <Route path="users" element={<ProtectedRoute adminOnly><UserManagement /></ProtectedRoute>} />
            <Route path="settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;