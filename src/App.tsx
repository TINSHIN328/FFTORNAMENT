import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './store';
import { Layout, AdminLayout } from './components/layout';
import { ToastContainer } from './components/ui';
import Home from './pages/Home';
import Tournaments from './pages/Tournaments';
import TournamentDetail from './pages/TournamentDetail';
import { Login, Register, AdminSetup } from './pages/Auth';
import Dashboard from './pages/Dashboard';
import { TeamsList, TeamDetail } from './pages/Teams';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Notifications, { MatchDetail } from './pages/Notifications';
import { AdminDashboard, AdminUsers, AdminTournaments, AdminMatches, AdminReports } from './pages/Admin';
import WhatsAppAdmin from './pages/WhatsAppAdmin';
import Wallet from './pages/Wallet';
import { AdminCoinRequests } from './pages/Admin';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { state } = useApp();
  if (!state.authReady) return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-text-muted">Checking session…</div>;
  if (!state.isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes with layout */}
      <Route path="/" element={<Layout><Home /></Layout>} />
      <Route path="/tournaments" element={<Layout><Tournaments /></Layout>} />
      <Route path="/tournaments/:id" element={<Layout><TournamentDetail /></Layout>} />
      <Route path="/teams" element={<Layout><TeamsList /></Layout>} />
      <Route path="/teams/:id" element={<Layout><TeamDetail /></Layout>} />
      <Route path="/leaderboard" element={<Layout><Leaderboard /></Layout>} />
      <Route path="/matches/:id" element={<Layout><MatchDetail /></Layout>} />

      {/* Auth routes (no layout) */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin-setup" element={<AdminSetup />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={<Layout><ProtectedRoute><Dashboard /></ProtectedRoute></Layout>} />
      <Route path="/profile" element={<Layout><ProtectedRoute><Profile /></ProtectedRoute></Layout>} />
      <Route path="/notifications" element={<Layout><ProtectedRoute><Notifications /></ProtectedRoute></Layout>} />
      <Route path="/wallet" element={<Layout><ProtectedRoute><Wallet /></ProtectedRoute></Layout>} />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
      <Route path="/admin/users" element={<AdminLayout><AdminUsers /></AdminLayout>} />
      <Route path="/admin/tournaments" element={<AdminLayout><AdminTournaments /></AdminLayout>} />
      <Route path="/admin/matches" element={<AdminLayout><AdminMatches /></AdminLayout>} />
      <Route path="/admin/reports" element={<AdminLayout><AdminReports /></AdminLayout>} />
      <Route path="/admin/whatsapp" element={<AdminLayout><WhatsAppAdmin /></AdminLayout>} />
      <Route path="/admin/coins" element={<AdminLayout><AdminCoinRequests /></AdminLayout>} />

      {/* 404 */}
      <Route path="*" element={<Layout><div className="min-h-[60vh] flex items-center justify-center"><div className="text-center"><h1 className="text-6xl font-bold gradient-text mb-4">404</h1><p className="text-text-muted mb-6">Page not found</p><a href="/" className="btn-primary text-white px-6 py-2 rounded-lg inline-block">Go Home</a></div></div></Layout>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
        <ToastContainer />
      </AppProvider>
    </BrowserRouter>
  );
}
