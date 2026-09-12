import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Users, Trophy, Shield, Plus, Edit, Trash2, Crown, ArrowLeft } from 'lucide-react';
import { useApp } from '../store';
import { Card, Button, Avatar, Badge, EmptyState, Modal, Input, SearchInput, StatCard } from '../components/ui';
import { v4 as uuidv4 } from 'uuid';

export function TeamsList() {
  const { state } = useApp();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTag, setNewTag] = useState('');
  const { dispatch, addToast } = useApp();

  const filtered = state.teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.tag.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = () => {
    if (!state.isAuthenticated) { addToast('Please login first.', 'error'); return; }
    if (!newName || !newTag) { addToast('Name and tag are required.', 'error'); return; }
    const team = { id: uuidv4(), name: newName, tag: newTag.toUpperCase(), logo: '⚡', description: '', captainId: state.currentUser!.id, memberIds: [state.currentUser!.id], wins: 0, losses: 0, requiredSize: 4, totalPoints: 0, createdAt: new Date().toISOString(), status: 'ACTIVE' as const };
    dispatch({ type: 'CREATE_TEAM', payload: team });
    addToast('Team created!', 'success');
    setShowCreate(false);
    setNewName('');
    setNewTag('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Teams</h1>
          <p className="text-text-muted text-sm mt-1">Compete together as a squad</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={16} /> Create Team</Button>
      </div>

      <div className="mb-6 max-w-md">
        <SearchInput value={search} onChange={setSearch} placeholder="Search teams..." />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users size={32} />} title={state.teams.length === 0 ? "No teams created yet" : "No teams found"} description={state.teams.length === 0 ? "Be the first to create a team and start competing!" : "No teams match your search."} action={<Button onClick={() => setShowCreate(true)}>Create Team</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(team => (
            <Link key={team.id} to={`/teams/${team.id}`} className="block group">
              <Card className="h-full">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl flex-shrink-0">{team.logo}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-white group-hover:text-primary transition-colors truncate">{team.name}</h3>
                      <Badge variant="info">{team.tag}</Badge>
                    </div>
                    <p className="text-xs text-text-muted mt-1">{team.memberIds.length} members</p>
                    <div className="flex items-center gap-3 mt-3 text-xs">
                      <span className="text-success">{team.wins}W</span>
                      <span className="text-danger">{team.losses}L</span>
                      <span className="text-text-muted">{team.wins + team.losses > 0 ? Math.round((team.wins / (team.wins + team.losses)) * 100) : 0}% WR</span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Team">
        <div className="space-y-4">
          <Input label="Team Name" placeholder="Phoenix Rising" value={newName} onChange={e => setNewName(e.target.value)} />
          <Input label="Team Tag (3-5 chars)" placeholder="PHX" value={newTag} onChange={e => setNewTag(e.target.value)} maxLength={5} />
          <div className="flex gap-3 justify-end mt-6">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Team</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch, addToast, getTeam, getUser } = useApp();
  const team = getTeam(id || '');

  if (!team) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <EmptyState icon={<Users size={32} />} title="Team not found" description="This team doesn't exist." action={<Button onClick={() => navigate('/teams')}>Browse Teams</Button>} />
    </div>
  );

  const captain = getUser(team.captainId);
  const members = team.memberIds.map(mid => getUser(mid)).filter(Boolean);
  const isCaptain = state.currentUser?.id === team.captainId;
  const isMember = team.memberIds.includes(state.currentUser?.id || '');
  const teamTournaments = state.tournaments.filter(t => t.teamIds.includes(team.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-text-muted hover:text-text mb-6"><ArrowLeft size={16} /> Back</button>

      <Card hover={false} className="mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-4xl flex-shrink-0">{team.logo}</div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">{team.name}</h1>
              <Badge variant="info">{team.tag}</Badge>
            </div>
            <p className="text-sm text-text-muted mb-4">{team.description || 'No description'}</p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2"><Crown size={14} className="text-warning" /><span className="text-sm text-text">Captain: <strong>{captain?.name}</strong></span></div>
              <div className="text-sm text-success">{team.wins} Wins</div>
              <div className="text-sm text-danger">{team.losses} Losses</div>
            </div>
          </div>
          {isCaptain && (
            <Button variant="danger" size="sm" onClick={() => { dispatch({ type: 'DELETE_TEAM', payload: team.id }); addToast('Team disbanded.', 'info'); navigate('/teams'); }}>
              <Trash2 size={14} /> Disband
            </Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card hover={false}>
            <h2 className="text-lg font-semibold text-white mb-4">Members ({members.length})</h2>
            <div className="space-y-3">
              {members.map(member => member && (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30">
                  <div className="flex items-center gap-3">
                    <Avatar name={member.name} size="md" />
                    <div>
                      <p className="text-sm font-medium text-white">{member.name}</p>
                      <p className="text-xs text-text-muted">@{member.username}</p>
                    </div>
                  </div>
                  {member.id === team.captainId && <Badge variant="warning">Captain</Badge>}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <Card hover={false}>
            <h2 className="text-sm font-semibold text-white mb-4">Tournament History</h2>
            {teamTournaments.length > 0 ? (
              <div className="space-y-2">
                {teamTournaments.map(t => (
                  <Link key={t.id} to={`/tournaments/${t.id}`} className="block p-2 rounded-lg hover:bg-white/5 transition-all">
                    <p className="text-xs font-medium text-white truncate">{t.name}</p>
                    <p className="text-[10px] text-text-muted">{t.status}</p>
                  </Link>
                ))}
              </div>
            ) : <p className="text-xs text-text-muted text-center py-4">No tournaments yet</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
