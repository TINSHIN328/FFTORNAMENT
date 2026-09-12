import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Zap, Shield, ChevronRight, Star, Award, Clock, Target } from 'lucide-react';
import { useApp } from '../store';
import { Card, getStatusBadge, formatCurrency, formatDate, Button, EmptyState } from '../components/ui';

export default function Home() {
  const { state } = useApp();
  const featuredTournaments = state.tournaments.filter(t => t.status === 'REGISTRATION_OPEN' || t.status === 'LIVE').slice(0, 4);
  const liveTournaments = state.tournaments.filter(t => t.status === 'LIVE');
  const upcomingTournaments = state.tournaments.filter(t => ['UPCOMING', 'REGISTRATION_OPEN'].includes(t.status)).slice(0, 3);

  // REAL statistics from database
  const totalUsers = state.users.length;
  const totalTournaments = state.tournaments.length;
  const totalTeams = state.teams.length;
  const totalRegistrations = state.tournaments.reduce((sum, t) => sum + (t.participantIds?.length || 0), 0);
  const totalPrizePool = state.tournaments.reduce((sum, t) => sum + t.prizePool, 0);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative hero-gradient overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-24 sm:pt-32 sm:pb-36 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Zap size={14} className="text-primary" />
              <span className="text-xs font-medium text-primary">Free Fire Esports Platform</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight mb-6">
              <span className="text-white">Compete.</span>{' '}
              <span className="gradient-text">Conquer.</span>{' '}
              <span className="text-white">Become Champion.</span>
            </h1>
            <p className="text-lg sm:text-xl text-text-muted max-w-2xl mx-auto mb-4">
              The ultimate Free Fire tournament platform. Solo, Duo, or Squad — battle your way to victory.
            </p>
            <p className="text-sm text-primary-light mb-10 font-medium">🔥 Free Fire Tournaments Only</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/tournaments">
                <Button size="lg" className="w-full sm:w-auto"><Trophy size={18} /> Browse Tournaments</Button>
              </Link>
              {state.isAuthenticated && (
                <Link to="/teams">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto"><Users size={18} /> Create Team</Button>
                </Link>
              )}
              {!state.isAuthenticated && (
                <Link to="/register">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto"><Star size={18} /> Join Now</Button>
                </Link>
              )}
            </div>
          </div>

          {/* REAL Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto">
            <div className="text-center p-4 rounded-xl bg-white/[0.02] border border-border/30">
              <div className="text-primary mb-2 flex justify-center"><Users size={20} /></div>
              <p className="text-xl sm:text-2xl font-bold text-white">{totalUsers}</p>
              <p className="text-xs text-text-muted">Registered Players</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/[0.02] border border-border/30">
              <div className="text-primary mb-2 flex justify-center"><Trophy size={20} /></div>
              <p className="text-xl sm:text-2xl font-bold text-white">{totalTournaments}</p>
              <p className="text-xs text-text-muted">Tournaments</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/[0.02] border border-border/30">
              <div className="text-primary mb-2 flex justify-center"><Award size={20} /></div>
              <p className="text-xl sm:text-2xl font-bold text-white">{totalPrizePool > 0 ? `Rs. ${totalPrizePool.toLocaleString()}` : 'Rs. 0'}</p>
              <p className="text-xs text-text-muted">Total Prize Pool</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/[0.02] border border-border/30">
              <div className="text-primary mb-2 flex justify-center"><Target size={20} /></div>
              <p className="text-xl sm:text-2xl font-bold text-white">{totalRegistrations}</p>
              <p className="text-xs text-text-muted">Registrations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Tournaments */}
      {liveTournaments.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-danger status-live" />
              <h2 className="text-xl sm:text-2xl font-bold text-white">Live Now</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveTournaments.map(t => <TournamentCard key={t.id} tournament={t} />)}
          </div>
        </section>
      )}

      {/* Featured Tournaments */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Featured Tournaments</h2>
          {state.tournaments.length > 0 && (
            <Link to="/tournaments" className="text-sm text-primary hover:text-primary-light flex items-center gap-1">View All <ChevronRight size={14} /></Link>
          )}
        </div>
        {featuredTournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredTournaments.map(t => <TournamentCard key={t.id} tournament={t} />)}
          </div>
        ) : (
          <EmptyState
            icon={<Trophy size={32} />}
            title="No tournaments available yet"
            description={state.currentUser?.role === 'ADMIN' ? 'Create your first tournament from the admin panel.' : 'Tournaments will appear here once created by admins.'}
            action={state.currentUser?.role === 'ADMIN' ? <Link to="/admin/tournaments"><Button>Create Tournament</Button></Link> : undefined}
          />
        )}
      </section>

      {/* Upcoming */}
      {upcomingTournaments.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">Upcoming Tournaments</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingTournaments.map(t => <TournamentCard key={t.id} tournament={t} />)}
          </div>
        </section>
      )}

      {/* Tournament Modes */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-4">Choose Your Mode</h2>
        <p className="text-text-muted text-center mb-12 max-w-2xl mx-auto">Compete in Free Fire tournaments across three exciting modes</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { mode: 'SOLO', title: 'Solo', desc: 'Lone wolf? Prove your individual skill against the best players.', icon: '🎯', count: state.tournaments.filter(t => t.mode === 'SOLO').length },
            { mode: 'DUO', title: 'Duo', desc: 'Team up with a partner. Coordination and teamwork win matches.', icon: '👥', count: state.tournaments.filter(t => t.mode === 'DUO').length },
            { mode: 'SQUAD', title: 'Squad', desc: 'Four-player squad battles. Full team strategy and synergy.', icon: '🛡️', count: state.tournaments.filter(t => t.mode === 'SQUAD').length },
          ].map((item) => (
            <Card key={item.mode} className="text-center py-8">
              <div className="text-5xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-text-muted mb-4">{item.desc}</p>
              <p className="text-xs text-primary">{item.count} active tournament{item.count !== 1 ? 's' : ''}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Register', desc: 'Create your account with your Free Fire ID.', icon: <Users size={24} /> },
            { step: '02', title: 'Join Tournament', desc: 'Pick a Solo, Duo, or Squad tournament.', icon: <Trophy size={24} /> },
            { step: '03', title: 'Compete', desc: 'Enter the room, play your best, earn points.', icon: <Target size={24} /> },
            { step: '04', title: 'Win Prizes', desc: 'Top the leaderboard and claim your prize.', icon: <Award size={24} /> },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 text-primary">{item.icon}</div>
              <div className="text-xs font-display text-primary/60 mb-2">{item.step}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-text-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="glass-card rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Ready to Compete?</h2>
            <p className="text-text-muted mb-8 max-w-md mx-auto">Join the ZyroBattle community and prove you're the best Free Fire player.</p>
            {!state.isAuthenticated ? (
              <Link to="/register"><Button size="lg"><Star size={18} /> Join ZyroBattle Now</Button></Link>
            ) : (
              <Link to="/tournaments"><Button size="lg"><Trophy size={18} /> Browse Tournaments</Button></Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function TournamentCard({ tournament }: { tournament: any }) {
  const participantCount = tournament.participantIds?.length || 0;
  const modeLabels: Record<string, string> = { SOLO: '🎯 Solo', DUO: '👥 Duo', SQUAD: '🛡️ Squad' };

  return (
    <Link to={`/tournaments/${tournament.id}`} className="block">
      <Card className="group h-full flex flex-col">
        <div className="h-32 -mx-5 -mt-5 mb-4 rounded-t-xl bg-gradient-to-br from-orange-500/20 to-red-500/10 flex items-center justify-center relative overflow-hidden">
          <span className="text-4xl">🔥</span>
          <div className="absolute top-3 right-3">{getStatusBadge(tournament.status)}</div>
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-black/40 text-white backdrop-blur-sm">
              {modeLabels[tournament.mode]}
            </span>
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">FREE FIRE</p>
          <h3 className="text-base font-semibold text-white mb-3 group-hover:text-primary transition-colors line-clamp-2">{tournament.name}</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-xs text-text-muted">Prize Pool</p>
              <p className="text-sm font-bold text-accent">Rs. {tournament.prizePool.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Entry Fee</p>
              <p className="text-sm font-bold text-text">{tournament.entryFee === 0 ? 'FREE' : `Rs. ${tournament.entryFee}`}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-text-muted mt-auto pt-3 border-t border-border/30">
            <span className="flex items-center gap-1"><Users size={12} />{participantCount}/{tournament.maxParticipants}</span>
            <span className="flex items-center gap-1"><Clock size={12} />{formatDate(tournament.tournamentDate)}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
