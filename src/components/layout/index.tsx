import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Trophy, Users, BarChart3, Bell, Search, Menu, X, LogOut, User, Shield, ChevronDown, MessageCircle, Coins } from 'lucide-react';
import { useApp } from '../../store';
import { Avatar, Dropdown, Badge } from '../ui';

export function Navbar() {
  const { state, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const unreadCount = state.notifications.filter(n => n.userId === state.currentUser?.id && !n.read).length;
  const isAdmin = state.currentUser?.role === 'ADMIN';

  const navLinks = [
    { to: '/', label: 'Home', icon: <Home size={16} /> },
    { to: '/tournaments', label: 'Tournaments', icon: <Trophy size={16} /> },
    { to: '/teams', label: 'Teams', icon: <Users size={16} /> },
    { to: '/leaderboard', label: 'Leaderboard', icon: <BarChart3 size={16} /> },
    { to: '/wallet', label: 'Coins', icon: <Coins size={16} /> },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/tournaments?search=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="font-display font-bold text-white text-xs">ZB</span>
            </div>
            <span className="font-display font-bold text-lg hidden sm:block">
              <span className="text-white">Zyro</span><span className="text-primary">Battle</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${location.pathname === link.to ? 'text-primary bg-primary/10' : 'text-text-muted hover:text-text hover:bg-white/5'}`}>
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative hidden sm:block">
              {searchOpen ? (
                <form onSubmit={handleSearch} className="flex items-center">
                  <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search tournaments..." className="w-48 rounded-lg bg-surface border border-border text-text text-sm pl-3 pr-8 py-1.5 focus:border-primary" onBlur={() => { if (!searchQuery) setSearchOpen(false); }} />
                  <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="absolute right-2 text-text-muted hover:text-text"><X size={14} /></button>
                </form>
              ) : (
                <button onClick={() => setSearchOpen(true)} className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-white/5"><Search size={18} /></button>
              )}
            </div>

            {state.isAuthenticated ? (
              <>
                {/* Notifications */}
                <Link to="/notifications" className="relative p-2 rounded-lg text-text-muted hover:text-text hover:bg-white/5">
                  <Bell size={18} />
                  {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger rounded-full text-[10px] font-bold flex items-center justify-center">{unreadCount}</span>}
                </Link>

                {/* Profile Dropdown */}
                <Dropdown
                  trigger={
                    <div className="flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-white/5">
                      <Avatar name={state.currentUser?.name || ''} src={state.currentUser?.avatarUrl} size="sm" />
                      <span className="text-sm font-medium text-text hidden lg:block">{state.currentUser?.name}</span>
                      <ChevronDown size={14} className="text-text-muted hidden lg:block" />
                    </div>
                  }
                  items={[
                    { label: 'Dashboard', icon: <Home size={14} />, onClick: () => navigate('/dashboard') },
                    { label: 'Profile', icon: <User size={14} />, onClick: () => navigate('/profile') },
                    ...(isAdmin ? [{ label: 'Admin Panel', icon: <Shield size={14} />, onClick: () => navigate('/admin') }] : []),
                    { label: 'Logout', icon: <LogOut size={14} />, onClick: () => { logout(); navigate('/'); }, danger: true },
                  ]}
                />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="text-sm text-text-muted hover:text-text px-3 py-2">Login</Link>
                <Link to="/register" className="btn-primary text-white text-sm font-medium px-4 py-2 rounded-lg">Sign Up</Link>
              </div>
            )}

            {/* Mobile Menu */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg text-text-muted hover:text-text">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-surface/95 backdrop-blur-lg">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${location.pathname === link.to ? 'text-primary bg-primary/10' : 'text-text-muted hover:text-text'}`}>
                {link.icon}{link.label}
              </Link>
            ))}
            {state.isAuthenticated && (
              <>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-muted hover:text-text">
                  <Home size={16} />Dashboard
                </Link>
                <Link to="/notifications" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-muted hover:text-text">
                  <Bell size={16} />Notifications {unreadCount > 0 && <Badge variant="danger">{unreadCount}</Badge>}
                </Link>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-warning hover:text-warning">
                    <Shield size={16} />Admin Panel
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-surface/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="font-display font-bold text-white text-xs">ZB</span>
              </div>
              <span className="font-display font-bold text-lg"><span className="text-white">Zyro</span><span className="text-primary">Battle</span></span>
            </div>
            <p className="text-sm text-text-muted">Built for competitive players. Compete. Conquer. Become Champion.</p>
          </div>
          <div>
            <h4 className="font-semibold text-text mb-3 text-sm">Platform</h4>
            <div className="space-y-2">
              <Link to="/tournaments" className="block text-sm text-text-muted hover:text-text transition-colors">Tournaments</Link>
              <Link to="/teams" className="block text-sm text-text-muted hover:text-text transition-colors">Teams</Link>
              <Link to="/leaderboard" className="block text-sm text-text-muted hover:text-text transition-colors">Leaderboard</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-text mb-3 text-sm">Support</h4>
            <div className="space-y-2">
              <a href="#" className="block text-sm text-text-muted hover:text-text transition-colors">Rules</a>
              <a href="#" className="block text-sm text-text-muted hover:text-text transition-colors">FAQ</a>
              <a href="#" className="block text-sm text-text-muted hover:text-text transition-colors">Contact</a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-text mb-3 text-sm">Legal</h4>
            <div className="space-y-2">
              <a href="#" className="block text-sm text-text-muted hover:text-text transition-colors">Privacy Policy</a>
              <a href="#" className="block text-sm text-text-muted hover:text-text transition-colors">Terms of Service</a>
              <a href="#" className="block text-sm text-text-muted hover:text-text transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
        <div className="border-t border-border/50 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">© 2024 ZyroBattle. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-text-muted hover:text-text text-sm">Discord</a>
            <a href="#" className="text-text-muted hover:text-text text-sm">Twitter</a>
            <a href="#" className="text-text-muted hover:text-text text-sm">YouTube</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f]">
      <Navbar />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useApp();

  if (!state.authReady) { return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-text-muted">Checking admin session…</div>; }

  if (!state.currentUser || state.currentUser.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-danger mb-4" />
          <h2 className="text-xl font-bold text-text mb-2">Access Denied</h2>
          <p className="text-text-muted mb-4">You need admin privileges to access this page.</p>
          <button onClick={() => navigate('/')} className="btn-primary text-white px-6 py-2 rounded-lg">Go Home</button>
        </div>
      </div>
    );
  }

  const adminLinks = [
    { to: '/admin', label: 'Dashboard', icon: <BarChart3 size={16} /> },
    { to: '/admin/users', label: 'Users', icon: <Users size={16} /> },
    { to: '/admin/tournaments', label: 'Tournaments', icon: <Trophy size={16} /> },
    { to: '/admin/matches', label: 'Matches', icon: <Trophy size={16} /> },
    { to: '/admin/reports', label: 'Reports', icon: <Shield size={16} /> },
    { to: '/admin/whatsapp', label: 'WhatsApp', icon: <MessageCircle size={16} /> },
    { to: '/admin/coins', label: 'Coin Requests', icon: <Coins size={16} /> },
  ];

  return (
    <div className="min-h-screen flex bg-[#0a0a0f]">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border/50 bg-surface/50 fixed h-full">
        <div className="p-4 border-b border-border/50">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="font-display font-bold text-white text-xs">ZB</span>
            </div>
            <span className="font-display font-bold"><span className="text-white">Zyro</span><span className="text-primary">Battle</span></span>
          </Link>
          <p className="text-xs text-text-muted mt-2 ml-10">Admin Panel</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {adminLinks.map(link => (
            <Link key={link.to} to={link.to} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${location.pathname === link.to ? 'text-primary bg-primary/10' : 'text-text-muted hover:text-text hover:bg-white/5'}`}>
              {link.icon}{link.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-border/50">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-muted hover:text-text">
            <Home size={16} />Back to Site
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-40 glass border-b border-border/50 px-6 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-text">Admin Panel</h1>
          <div className="flex items-center gap-3">
            <Avatar name={state.currentUser.name} size="sm" />
            <span className="text-sm text-text hidden sm:block">{state.currentUser.name}</span>
          </div>
        </header>
        {/* Mobile admin nav */}
        <div className="lg:hidden flex overflow-x-auto border-b border-border/50 px-4 py-2 gap-1">
          {adminLinks.map(link => (
            <Link key={link.to} to={link.to} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${location.pathname === link.to ? 'text-primary bg-primary/10' : 'text-text-muted'}`}>
              {link.icon}{link.label}
            </Link>
          ))}
        </div>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
