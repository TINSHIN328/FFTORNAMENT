import React, { useState, useEffect, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, ChevronDown, Loader2, Search } from 'lucide-react';
import { useApp } from '../../store';

// Toast System
export function ToastContainer() {
  const { state } = useApp();
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {state.toasts.map(toast => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  );
}

function Toast({ message, type }: { id: string; message: string; type: string }) {
  const icons = { success: <CheckCircle size={18} />, error: <AlertCircle size={18} />, info: <Info size={18} />, warning: <AlertTriangle size={18} /> };
  const colors = { success: 'border-success/50 bg-success/10', error: 'border-danger/50 bg-danger/10', info: 'border-primary/50 bg-primary/10', warning: 'border-warning/50 bg-warning/10' };
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${colors[type as keyof typeof colors]} backdrop-blur-md animate-[slideIn_0.3s_ease]`}>
      <span className={type === 'success' ? 'text-success' : type === 'error' ? 'text-danger' : type === 'warning' ? 'text-warning' : 'text-primary'}>{icons[type as keyof typeof icons]}</span>
      <span className="text-sm text-text">{message}</span>
    </div>
  );
}

// Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading, children, className = '', ...props }: ButtonProps) {
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3 text-base' };
  const variants = {
    primary: 'btn-primary text-white font-semibold',
    accent: 'btn-accent text-white font-semibold',
    outline: 'border border-border hover:border-primary text-text hover:text-primary',
    ghost: 'text-text-muted hover:text-text hover:bg-white/5',
    danger: 'bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20',
  };
  return (
    <button className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

// Card
export function Card({ children, className = '', hover = true }: { children: ReactNode; className?: string; hover?: boolean }) {
  return (
    <div className={`glass-card rounded-xl p-5 ${hover ? 'card-shine' : ''} ${className}`}>
      {children}
    </div>
  );
}

// Badge
export function Badge({ children, variant = 'default', className = '' }: { children: ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'live'; className?: string }) {
  const variants = {
    default: 'bg-white/5 text-text-muted border-border',
    success: 'bg-success/10 text-success border-success/30',
    warning: 'bg-warning/10 text-warning border-warning/30',
    danger: 'bg-danger/10 text-danger border-danger/30',
    info: 'bg-primary/10 text-primary-light border-primary/30',
    live: 'bg-danger/10 text-danger border-danger/30',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}>
      {variant === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-danger status-live" />}
      {children}
    </span>
  );
}

// Modal
export function Modal({ isOpen, onClose, title, children, size = 'md' }: { isOpen: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className={`relative w-full ${sizes[size]} glass-card rounded-xl p-6 max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text">{title}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text p-1"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Input
export function Input({ label, error, icon, ...props }: { label?: string; error?: string; icon?: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-text-muted">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">{icon}</span>}
        <input className={`w-full rounded-lg bg-surface border border-border text-text placeholder:text-text-muted/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all ${icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 text-sm ${error ? 'border-danger' : ''}`} {...props} />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

// Select
export function Select({ label, options, ...props }: { label?: string; options: { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-text-muted">{label}</label>}
      <select className="w-full rounded-lg bg-surface border border-border text-text py-2.5 px-4 text-sm focus:border-primary" {...props}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// Tabs
export function Tabs({ tabs, activeTab, onChange }: { tabs: { id: string; label: string; count?: number }[]; activeTab: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-1 border-b border-border overflow-x-auto">
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)} className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}>
          {tab.label}
          {tab.count !== undefined && <span className="ml-1.5 text-xs bg-white/10 px-1.5 py-0.5 rounded-full">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

// Search Input
export function SearchInput({ value, onChange, placeholder = 'Search...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg bg-surface border border-border text-text placeholder:text-text-muted/50 pl-10 pr-4 py-2.5 text-sm focus:border-primary" />
    </div>
  );
}

// Loading Skeleton
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />;
}

// Empty State
export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-text-muted">{icon}</div>
      <h3 className="text-lg font-semibold text-text mb-2">{title}</h3>
      <p className="text-sm text-text-muted max-w-md mb-4">{description}</p>
      {action}
    </div>
  );
}

// Status Badge helper
export function getStatusBadge(status: string) {
  const map: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'live' | 'default'; label: string }> = {
    DRAFT: { variant: 'default', label: 'Draft' },
    UPCOMING: { variant: 'info', label: 'Upcoming' },
    REGISTRATION_OPEN: { variant: 'success', label: 'Registration Open' },
    REGISTRATION_CLOSED: { variant: 'warning', label: 'Reg. Closed' },
    LIVE: { variant: 'live', label: 'LIVE' },
    COMPLETED: { variant: 'default', label: 'Completed' },
    CANCELLED: { variant: 'danger', label: 'Cancelled' },
  };
  const s = map[status] || { variant: 'default' as const, label: status };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

// Pagination
export function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <Button variant="ghost" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>Previous</Button>
      <span className="text-sm text-text-muted">Page {page} of {totalPages}</span>
      <Button variant="ghost" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>Next</Button>
    </div>
  );
}

// Confirm Dialog
export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', danger = false }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmText?: string; danger?: boolean }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-text-muted mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmText}</Button>
      </div>
    </Modal>
  );
}

// Stat Card
export function StatCard({ label, value, icon, trend }: { label: string; value: string | number; icon: ReactNode; trend?: string }) {
  return (
    <Card hover={false} className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-text">{value}</p>
        <p className="text-xs text-text-muted">{label}</p>
        {trend && <p className="text-xs text-success mt-0.5">{trend}</p>}
      </div>
    </Card>
  );
}

// Avatar
export function Avatar({ name, src, size = 'md' }: { name: string; src?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg', xl: 'w-20 h-20 text-2xl' };
  const colors = ['bg-primary/20 text-primary', 'bg-accent/20 text-accent', 'bg-warning/20 text-warning', 'bg-danger/20 text-danger'];
  const colorIdx = name.charCodeAt(0) % colors.length;
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className={`${sizes[size]} rounded-full ${colors[colorIdx]} flex items-center justify-center font-bold overflow-hidden flex-shrink-0`}>
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : initial}
    </div>
  );
}

// Dropdown
export function Dropdown({ trigger, items }: { trigger: ReactNode; items: { label: string; onClick: () => void; icon?: ReactNode; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = () => setOpen(false);
    if (open) document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open]);
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <div onClick={() => setOpen(!open)} className="cursor-pointer">{trigger}</div>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 glass-card rounded-lg py-1 z-50 shadow-xl">
          {items.map((item, i) => (
            <button key={i} onClick={() => { item.onClick(); setOpen(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors ${item.danger ? 'text-danger' : 'text-text'}`}>
              {item.icon && <span className="mr-2">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Format helpers
export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(date: string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatCurrency(amount: number, currency = 'USD') {
  if (amount === 0) return 'FREE';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatPrize(amount: number, currency = 'USD') {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
  return `$${amount}`;
}
