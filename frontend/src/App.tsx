import { useState } from 'react';
import { Navigate,Route,Routes } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { useAuth } from './context/AuthContext';
import { Carriers } from './pages/Carriers';
import { Customers } from './pages/Customers';
import { Login } from './pages/Login';
import { Routes as RoutesPage } from './pages/Routes';
import { ShipmentDetail } from './pages/ShipmentDetail';
import { Shipments } from './pages/Shipments';
import { Tracking } from './pages/Tracking';


function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/track" replace />;
  }

  return <>{children}</>;
}

function HomeRedirect() { const { isAdmin } = useAuth(); return <Navigate to={isAdmin ? "/shipments" : "/track"} replace />; }

function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (drawer style) */}
      <Sidebar sidebarOpen={sidebarOpen} onSidebarClose={() => setSidebarOpen(false)} />

      {/* Main content - Spans full viewport width */}
      <div className="w-full min-h-screen flex flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/shipments" element={<ProtectedRoute adminOnly><Shipments /></ProtectedRoute>} />
                <Route path="/shipments/:id" element={<ProtectedRoute adminOnly><ShipmentDetail /></ProtectedRoute>} />
                <Route path="/customers" element={<ProtectedRoute adminOnly><Customers /></ProtectedRoute>} />
                <Route path="/carriers" element={<ProtectedRoute adminOnly><Carriers /></ProtectedRoute>} />
                <Route path="/routes" element={<ProtectedRoute adminOnly><RoutesPage /></ProtectedRoute>} />
                <Route path="/track" element={<Tracking />} />
                <Route path="/" element={<HomeRedirect />} />
                <Route path="*" element={<HomeRedirect />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;