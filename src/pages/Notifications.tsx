import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trophy, Users, MessageSquare, AlertCircle, ArrowLeft } from 'lucide-react';
import { useApp } from '../store';
import { Card, Button, Badge, EmptyState, formatDate, formatDateTime } from '../components/ui';

export default function Notifications() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();

  if (!state.isAuthenticated) { navigate('/login'); return null; }

  const notifications = state.notifications.filter(n => n.userId === state.currentUser?.id);
  const unread = notifications.filter(n => !n.read);

  const markAllRead = () => {
    dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ', payload: state.currentUser!.id });
  };

  const markRead = (id: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
  };

  const typeIcons: Record<string, React.ReactNode> = {
    TOURNAMENT: <Trophy size={16} className="text-primary" />,
    MATCH: <AlertCircle size={16} className="text-accent" />,
    TEAM: <Users size={16} className="text-warning" />,
    SYSTEM: <Bell size={16} className="text-text-muted" />,
    RESULT: <MessageSquare size={16} className="text-success" />,
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        {unread.length > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            <CheckCheck size={14} /> Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon={<Bell size={32} />} title="No notifications" description="You're all caught up! Notifications will appear here." />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id} onClick={() => { markRead(n.id); if (n.link) navigate(n.link); }} className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${n.read ? 'border-border/30 hover:border-primary/20' : 'border-primary/30 bg-primary/5 hover:bg-primary/10'}`}>
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                {typeIcons[n.type] || <Bell size={16} className="text-text-muted" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${n.read ? 'text-text' : 'text-white'}`}>{n.title}</p>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                </div>
                <p className="text-xs text-text-muted mt-0.5">{n.message}</p>
                <p className="text-[10px] text-text-muted mt-1">{formatDate(n.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch, addToast, getMatch, getTeam } = useApp();
  const match = getMatch(id || '');

  if (!match) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <EmptyState icon={<Trophy size={32} />} title="Match not found" description="This match doesn't exist." action={<Button onClick={() => navigate('/tournaments')}>Browse Tournaments</Button>} />
    </div>
  );

  const tournament = state.tournaments.find(t => t.id === match.tournamentId);
  const teamA = getTeam(match.teamAId || '');
  const teamB = getTeam(match.teamBId || '');

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-text-muted hover:text-text mb-6"><ArrowLeft size={16} /> Back</button>

      <Card hover={false} className="text-center mb-6">
        <p className="text-xs text-text-muted mb-2">{tournament?.name} • {match.roundName}</p>
        <div className="flex items-center justify-center gap-8 py-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl mx-auto mb-2">{teamA?.logo || '🔵'}</div>
            <p className={`text-sm font-bold ${match.winnerId === match.teamAId ? 'text-success' : 'text-white'}`}>{match.teamAName}</p>
          </div>
          <div className="text-center">
            {match.status === 'COMPLETED' ? (
              <div className="text-3xl font-bold text-white">{match.scoreA} <span className="text-text-muted">-</span> {match.scoreB}</div>
            ) : (
              <div className="text-xl font-bold text-text-muted">VS</div>
            )}
            <Badge variant={match.status === 'LIVE' ? 'live' : match.status === 'COMPLETED' ? 'default' : 'info'} className="mt-2">{match.status}</Badge>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-2xl mx-auto mb-2">{teamB?.logo || '🔴'}</div>
            <p className={`text-sm font-bold ${match.winnerId === match.teamBId ? 'text-success' : 'text-white'}`}>{match.teamBName}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card hover={false}>
          <h3 className="text-sm font-semibold text-white mb-3">Match Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-text-muted">Scheduled</span><span className="text-text">{formatDateTime(match.scheduledTime)}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Round</span><span className="text-text">{match.roundName}</span></div>
            {match.status === 'COMPLETED' && <div className="flex justify-between"><span className="text-text-muted">Winner</span><span className="text-success font-medium">{match.winnerId === match.teamAId ? match.teamAName : match.teamBName}</span></div>}
          </div>
        </Card>
        <Card hover={false}>
          <h3 className="text-sm font-semibold text-white mb-3">Room Info</h3>
          {match.roomId ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-text-muted">Room ID</span><span className="text-text font-mono">{match.roomId}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Password</span><span className="text-text font-mono">{match.roomPassword}</span></div>
            </div>
          ) : (
            <p className="text-sm text-text-muted">Room info will be available before the match starts.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
