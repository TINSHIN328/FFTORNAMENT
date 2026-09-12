import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Users, Target, Award, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { useApp } from '../store';
import { Card, Badge, getStatusBadge, StatCard, Avatar, EmptyState, Button, formatDate } from '../components/ui';

export default function Dashboard() {
  const { state } = useApp();
  const navigate = useNavigate();
  if (!state.isAuthenticated) { navigate('/login'); return null; }
  const user = state.currentUser!;
  const myTournaments = state.tournaments.filter(t => t.participantIds?.includes(user.id));
  const myTeams = state.teams.filter(t => t.memberIds.includes(user.id));
  const myNotifications = state.notifications.filter(n => n.userId === user.id).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Welcome back, {user.name}</h1>
          <p className="text-text-muted text-sm mt-1">Your competitive overview</p>
        </div>
        <Link to="/tournaments"><Button><Trophy size={16} /> Browse Tournaments</Button></Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Tournaments Joined" value={myTournaments.length} icon={<Trophy size={20} />} />
        <StatCard label="Active Teams" value={myTeams.length} icon={<Users size={20} />} />
        <StatCard label="Total Points" value={state.matchResults.filter(r => r.participantId === user.id).reduce((s, r) => s + r.totalPoints, 0)} icon={<Target size={20} />} />
        <StatCard label="Notifications" value={myNotifications.filter(n => !n.read).length} icon={<Clock size={20} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card hover={false}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">My Tournaments</h2>
              <Link to="/tournaments" className="text-xs text-primary flex items-center gap-1">View All <ChevronRight size={12} /></Link>
            </div>
            {myTournaments.length > 0 ? (
              <div className="space-y-3">
                {myTournaments.slice(0, 5).map(t => (
                  <Link key={t.id} to={`/tournaments/${t.id}`} className="flex items-center gap-4 p-3 rounded-lg border border-border/30 hover:border-primary/30 transition-all">
                    <span className="text-2xl">🔥</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{t.name}</p>
                      <p className="text-xs text-text-muted">{t.mode} • {formatDate(t.tournamentDate)}</p>
                    </div>
                    {getStatusBadge(t.status)}
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState icon={<Trophy size={24} />} title="No tournaments yet" description="Join your first tournament!" action={<Link to="/tournaments"><Button size="sm">Browse Tournaments</Button></Link>} />
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card hover={false}>
            <h2 className="text-sm font-semibold text-white mb-3">My Teams</h2>
            {myTeams.length > 0 ? (
              <div className="space-y-2">
                {myTeams.map(team => (
                  <Link key={team.id} to={`/teams/${team.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-all">
                    <span className="text-xl">{team.logo}</span>
                    <div><p className="text-sm font-medium text-white">{team.name}</p><p className="text-xs text-text-muted">{team.memberIds.length} members</p></div>
                  </Link>
                ))}
              </div>
            ) : <p className="text-sm text-text-muted text-center py-4">No teams yet</p>}
          </Card>
          <Card hover={false}>
            <h2 className="text-sm font-semibold text-white mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Link to="/tournaments" className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-sm text-text-muted hover:text-text"><Trophy size={14} /> Browse Tournaments</Link>
              <Link to="/teams" className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-sm text-text-muted hover:text-text"><Users size={14} /> My Teams</Link>
              <Link to="/leaderboard" className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-sm text-text-muted hover:text-text"><TrendingUp size={14} /> Leaderboard</Link>
              <Link to="/profile" className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-sm text-text-muted hover:text-text"><Award size={14} /> Edit Profile</Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
