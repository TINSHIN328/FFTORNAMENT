import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Calendar, Trophy, Target, Award, Edit2, Save } from 'lucide-react';
import { useApp } from '../store';
import { Card, Button, Input, Avatar, Badge, StatCard, EmptyState } from '../components/ui';

export default function Profile() {
  const { state, dispatch, addToast } = useApp();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(state.currentUser?.name || '');
  const [username, setUsername] = useState(state.currentUser?.username || '');
  const [bio, setBio] = useState(state.currentUser?.bio || '');

  if (!state.isAuthenticated) { navigate('/login'); return null; }
  const user = state.currentUser!;

  const myTournaments = state.tournaments.filter(t => t.participantIds.includes(user.id));
  const myTeams = state.teams.filter(t => t.memberIds.includes(user.id));
  const myMatches = state.matches.filter(m => {
    const teamA = state.teams.find(t => t.id === m.teamAId);
    const teamB = state.teams.find(t => t.id === m.teamBId);
    return teamA?.memberIds.includes(user.id) || teamB?.memberIds.includes(user.id);
  });
  const wins = myMatches.filter(m => m.status === 'COMPLETED' && ((state.teams.find(t => t.id === m.teamAId)?.memberIds.includes(user.id) && m.winnerId === m.teamAId) || (state.teams.find(t => t.id === m.teamBId)?.memberIds.includes(user.id) && m.winnerId === m.teamBId))).length;
  const losses = myMatches.filter(m => m.status === 'COMPLETED' && ((state.teams.find(t => t.id === m.teamAId)?.memberIds.includes(user.id) && m.winnerId === m.teamBId) || (state.teams.find(t => t.id === m.teamBId)?.memberIds.includes(user.id) && m.winnerId === m.teamAId))).length;

  const handleSave = () => {
    dispatch({ type: 'UPDATE_USER', payload: { name, username, bio } });
    addToast('Profile updated!', 'success');
    setEditing(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Profile Header */}
      <Card hover={false} className="mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <Avatar name={user.name} src={user.avatarUrl} size="xl" />
          <div className="flex-1">
            {editing ? (
              <div className="space-y-3 max-w-md">
                <Input label="Name" value={name} onChange={e => setName(e.target.value)} />
                <Input label="Username" value={username} onChange={e => setUsername(e.target.value)} />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-muted">Bio</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full rounded-lg bg-surface border border-border text-text p-3 text-sm focus:border-primary" placeholder="Tell us about yourself..." />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm"><Save size={14} /> Save</Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-white">{user.name}</h1>
                  <Badge variant={user.role === 'ADMIN' ? 'warning' : 'info'}>{user.role}</Badge>
                </div>
                <p className="text-sm text-text-muted mb-2">@{user.username}</p>
                {user.bio && <p className="text-sm text-text mb-3">{user.bio}</p>}
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span className="flex items-center gap-1"><Mail size={12} /> {user.email}</span>
                  <span className="flex items-center gap-1"><Calendar size={12} /> Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setEditing(true)}><Edit2 size={14} /> Edit Profile</Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* REAL Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Tournaments" value={myTournaments.length} icon={<Trophy size={20} />} />
        <StatCard label="Wins" value={wins} icon={<Target size={20} />} />
        <StatCard label="Losses" value={losses} icon={<Target size={20} />} />
        <StatCard label="Teams" value={myTeams.length} icon={<Award size={20} />} />
      </div>

      {/* Tournament History */}
      <Card hover={false}>
        <h2 className="text-lg font-semibold text-white mb-4">Tournament History</h2>
        {myTournaments.length > 0 ? (
          <div className="space-y-2">
            {myTournaments.map(t => {
              const game = state.games.find(g => g.id === t.gameId);
              return (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{game?.icon || '🏆'}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{t.name}</p>
                      <p className="text-xs text-text-muted">{game?.name}</p>
                    </div>
                  </div>
                  <Badge variant={t.status === 'COMPLETED' ? 'default' : t.status === 'LIVE' ? 'live' : 'info'}>{t.status}</Badge>
                </div>
              );
            })}
          </div>
        ) : <EmptyState icon={<Trophy size={24} />} title="No tournament history" description="Join a tournament to start your competitive journey." />}
      </Card>
    </div>
  );
}
