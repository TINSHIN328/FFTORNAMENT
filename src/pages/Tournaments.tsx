import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Trophy, Users, Clock } from 'lucide-react';
import { useApp } from '../store';
import { Card, getStatusBadge, formatDate, SearchInput, Select, Button, EmptyState, Pagination } from '../components/ui';
import { TournamentMode, TournamentStatus } from '../types';

export default function Tournaments() {
  const { state } = useApp();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [modeFilter, setModeFilter] = useState(searchParams.get('mode') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const perPage = 8;

  const filtered = useMemo(() => {
    let result = [...state.tournaments];
    if (state.currentUser?.role !== 'ADMIN') {
      result = result.filter(t => t.status !== 'DRAFT');
    }
    if (search) result = result.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
    if (modeFilter) result = result.filter(t => t.mode === modeFilter);
    if (statusFilter) result = result.filter(t => t.status === statusFilter);
    switch (sortBy) {
      case 'prize': result.sort((a, b) => b.prizePool - a.prizePool); break;
      case 'entry': result.sort((a, b) => a.entryFee - b.entryFee); break;
      case 'soon': result.sort((a, b) => new Date(a.tournamentDate).getTime() - new Date(b.tournamentDate).getTime()); break;
      default: result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return result;
  }, [state.tournaments, search, modeFilter, statusFilter, sortBy, state.currentUser]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Free Fire Tournaments</h1>
          <p className="text-text-muted text-sm mt-1">Solo • Duo • Squad</p>
        </div>
        {state.currentUser?.role === 'ADMIN' && (
          <Link to="/admin/tournaments"><Button><Trophy size={16} /> Manage Tournaments</Button></Link>
        )}
      </div>

      {state.tournaments.length > 0 && (
        <Card hover={false} className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search tournaments..." />
            <Select value={modeFilter} onChange={e => { setModeFilter(e.target.value); setPage(1); }} options={[{ value: '', label: 'All Modes' }, { value: 'SOLO', label: '🎯 Solo' }, { value: 'DUO', label: '👥 Duo' }, { value: 'SQUAD', label: '🛡️ Squad' }]} />
            <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} options={[{ value: '', label: 'All Status' }, { value: 'REGISTRATION_OPEN', label: 'Registration Open' }, { value: 'LIVE', label: 'Live' }, { value: 'UPCOMING', label: 'Upcoming' }, { value: 'COMPLETED', label: 'Completed' }]} />
            <Select value={sortBy} onChange={e => setSortBy(e.target.value)} options={[{ value: 'newest', label: 'Newest' }, { value: 'prize', label: 'Prize Pool' }, { value: 'entry', label: 'Entry Fee' }, { value: 'soon', label: 'Starting Soon' }]} />
          </div>
        </Card>
      )}

      {paginated.length === 0 ? (
        <EmptyState
          icon={<Trophy size={32} />}
          title="No tournaments available yet"
          description={state.tournaments.length === 0 ? "No tournaments have been created yet. Check back soon!" : "No tournaments match your filters."}
          action={state.tournaments.length > 0 ? <Button variant="outline" onClick={() => { setSearch(''); setModeFilter(''); setStatusFilter(''); }}>Clear Filters</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {paginated.map(t => <TournamentCard key={t.id} tournament={t} />)}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

function TournamentCard({ tournament }: { tournament: any }) {
  const participantCount = tournament.participantIds?.length || 0;
  const modeLabels: Record<string, string> = { SOLO: '🎯 Solo', DUO: '👥 Duo', SQUAD: '🛡️ Squad' };

  return (
    <Link to={`/tournaments/${tournament.id}`} className="block group">
      <Card className="h-full flex flex-col">
        <div className="h-28 -mx-5 -mt-5 mb-4 rounded-t-xl bg-gradient-to-br from-orange-500/20 to-red-500/10 flex items-center justify-center relative">
          <span className="text-3xl">🔥</span>
          <div className="absolute top-3 right-3">{getStatusBadge(tournament.status)}</div>
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-black/40 text-white backdrop-blur-sm">{modeLabels[tournament.mode]}</span>
          </div>
        </div>
        <p className="text-xs text-text-muted uppercase tracking-wider mb-1">FREE FIRE</p>
        <h3 className="text-sm font-semibold text-white mb-3 group-hover:text-primary transition-colors line-clamp-2">{tournament.name}</h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div><p className="text-[10px] text-text-muted">Prize</p><p className="text-xs font-bold text-accent">Rs. {tournament.prizePool.toLocaleString()}</p></div>
          <div><p className="text-[10px] text-text-muted">Entry</p><p className="text-xs font-bold text-text">{tournament.entryFee === 0 ? 'FREE' : `Rs. ${tournament.entryFee}`}</p></div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-text-muted mt-auto pt-2 border-t border-border/30">
          <span className="flex items-center gap-1"><Users size={10} />{participantCount}/{tournament.maxParticipants}</span>
          <span className="flex items-center gap-1"><Clock size={10} />{formatDate(tournament.tournamentDate)}</span>
        </div>
      </Card>
    </Link>
  );
}
