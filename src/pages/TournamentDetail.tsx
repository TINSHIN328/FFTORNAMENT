import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Trophy, Users, Clock, MapPin, Calendar, ArrowLeft, CheckCircle, Lock, Unlock } from 'lucide-react';
import { useApp } from '../store';
import { Card, Badge, getStatusBadge, Button, Tabs, Avatar, EmptyState, Modal, Select, ConfirmDialog, formatDate, formatDateTime } from '../components/ui';

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch, addToast, getTournament, getUser } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [ign, setIgn] = useState('');
  const [freeFireUid, setFreeFireUid] = useState('');
  const [playerUsername, setPlayerUsername] = useState('');
  // Teammate fields for DUO/SQUAD
  const [teammate1Ign, setTeammate1Ign] = useState('');
  const [teammate1Uid, setTeammate1Uid] = useState('');
  const [teammate2Ign, setTeammate2Ign] = useState('');
  const [teammate2Uid, setTeammate2Uid] = useState('');
  const [teammate3Ign, setTeammate3Ign] = useState('');
  const [teammate3Uid, setTeammate3Uid] = useState('');
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);

  const tournament = getTournament(id || '');
  if (!tournament) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <EmptyState icon={<Trophy size={32} />} title="Tournament not found" description="This tournament doesn't exist or has been removed." action={<Button onClick={() => navigate('/tournaments')}>Browse Tournaments</Button>} />
    </div>
  );

  const isRegistered = state.currentUser && tournament.participantIds.includes(state.currentUser.id);
  const canRegister = tournament.status === 'REGISTRATION_OPEN' && !isRegistered;
  const isAdmin = state.currentUser?.role === 'ADMIN';
  const participantCount = tournament.participantIds.length;
  const isFull = participantCount >= tournament.maxParticipants;
  const modeLabels: Record<string, string> = { SOLO: '🎯 Solo', DUO: '👥 Duo', SQUAD: '🛡️ Squad' };
  const modeRequiredSize: Record<string, number> = { SOLO: 1, DUO: 2, SQUAD: 4 };


  const participants = tournament.participantIds.map(pid => getUser(pid)).filter(Boolean);
  const matches = state.matches.filter(m => m.tournamentId === tournament.id);
  const announcements = state.announcements.filter(a => a.tournamentId === tournament.id);
  const results = state.matchResults.filter(r => r.tournamentId === tournament.id);

  // Room info visibility
  const now = new Date();
  const matchTime = new Date(tournament.matchStartTime || tournament.tournamentDate);
  const releaseMap: Record<string, number> = { IMMEDIATE: 0, '15_MIN': 15 * 60000, '30_MIN': 30 * 60000, '1_HOUR': 60 * 60000 };
  const releaseTime = new Date(matchTime.getTime() - (releaseMap[tournament.roomReleaseTime] || 0));
  const showRoomInfo = isRegistered && now >= releaseTime && tournament.roomId;

  const handleJoin = async () => {
    if (!state.isAuthenticated) { addToast('Please login to join.', 'error'); navigate('/login'); return; }
    if (!ign.trim() || !freeFireUid.trim() || !playerUsername.trim()) { addToast('IGN, Free Fire UID and username are required.', 'error'); return; }
    if (isFull) { addToast('Tournament is full.', 'error'); return; }
    
    // Validate teammate count based on mode
    let teammateCount = 0;
    if (teammate1Ign && teammate1Uid) teammateCount++;
    if (teammate2Ign && teammate2Uid) teammateCount++;
    if (teammate3Ign && teammate3Uid) teammateCount++;
    
    if (tournament.mode === 'SOLO' && teammateCount > 0) {
      addToast('Solo mode does not allow teammates.', 'error');
      return;
    }
    if (tournament.mode === 'DUO' && teammateCount > 1) {
      addToast('Duo mode allows maximum 1 teammate.', 'error');
      return;
    }
    if (tournament.mode === 'SQUAD' && teammateCount > 3) {
      addToast('Squad mode allows maximum 3 teammates.', 'error');
      return;
    }
    
    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/join`, {
        method:'POST', credentials:'include', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ 
          ign:ign.trim(), 
          freeFireUid:freeFireUid.trim(), 
          username:playerUsername.trim(),
          teammate1Ign: teammate1Ign.trim() || undefined,
          teammate1Uid: teammate1Uid.trim() || undefined,
          teammate2Ign: teammate2Ign.trim() || undefined,
          teammate2Uid: teammate2Uid.trim() || undefined,
          teammate3Ign: teammate3Ign.trim() || undefined,
          teammate3Uid: teammate3Uid.trim() || undefined
        })
      });
      const json = await response.json().catch(()=>({}));
      if (!response.ok || !json.success) throw new Error(json.message || 'Registration failed');
      
      // Refresh tournament data from backend to get updated participant list
      const refreshedResponse = await fetch(`/api/tournaments/${tournament.id}`, { credentials:'include' });
      if (refreshedResponse.ok) {
        const refreshedTournament = await refreshedResponse.json();
        dispatch({ type: 'UPDATE_TOURNAMENT', payload: refreshedTournament });
      }
      
      addToast('Successfully registered!', 'success');
      setShowJoinModal(false);
      // Clear form
      setIgn('');
      setFreeFireUid('');
      setPlayerUsername('');
      setTeammate1Ign('');
      setTeammate1Uid('');
      setTeammate2Ign('');
      setTeammate2Uid('');
      setTeammate3Ign('');
      setTeammate3Uid('');
    } catch(e) { addToast(e instanceof Error ? e.message : 'Registration failed.', 'error'); }
  };

  const handleLeave = () => {
    dispatch({ type: 'LEAVE_TOURNAMENT', payload: { tournamentId: tournament.id, userId: state.currentUser!.id } });
    addToast('Left tournament.', 'info');
    setShowConfirmLeave(false);
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'rules', label: 'Rules' },
    { id: 'participants', label: 'Participants', count: participantCount },
    { id: 'schedule', label: 'Matches', count: matches.length },
    { id: 'leaderboard', label: 'Leaderboard', count: results.length },
    { id: 'prizes', label: 'Prizes' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-text-muted hover:text-text mb-6"><ArrowLeft size={16} /> Back</button>

      {/* Header */}
      <div className="glass-card rounded-xl overflow-hidden mb-6">
        <div className="h-40 sm:h-56 bg-gradient-to-br from-orange-500/30 to-red-500/20 flex items-center justify-center relative">
          <span className="text-6xl">🔥</span>
          <div className="absolute top-4 right-4">{getStatusBadge(tournament.status)}</div>
          <div className="absolute top-4 left-4">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-black/40 text-white backdrop-blur-sm">{modeLabels[tournament.mode]}</span>
          </div>
        </div>
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <p className="text-sm text-text-muted mb-1">FREE FIRE • {tournament.mode}</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{tournament.name}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-text-muted">
                <span className="flex items-center gap-1.5">💰 Rs. {tournament.prizePool.toLocaleString()} Prize Pool</span>
                <span className="flex items-center gap-1.5"><Users size={14} /> {participantCount}/{tournament.maxParticipants} Players</span>
                <span className="flex items-center gap-1.5"><Calendar size={14} /> {formatDate(tournament.tournamentDate)}</span>
                <span className="flex items-center gap-1.5"><Clock size={14} /> {tournament.matchStartTime}</span>
                <span className="flex items-center gap-1.5"><MapPin size={14} /> {tournament.map || 'Bermuda'}</span>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 flex-wrap">
              {canRegister && !isFull && <Button onClick={() => setShowJoinModal(true)}><Trophy size={16} /> Register Now</Button>}
              {isRegistered && <Button variant="outline" disabled><CheckCircle size={16} /> Registered</Button>}
              {isRegistered && tournament.status !== 'COMPLETED' && <Button variant="danger" size="sm" onClick={() => setShowConfirmLeave(true)}>Leave</Button>}
              {isFull && !isRegistered && <Button variant="outline" disabled>Tournament Full</Button>}
              {tournament.status === 'REGISTRATION_CLOSED' && !isRegistered && <Button variant="outline" disabled>Registration Closed</Button>}
              {tournament.status === 'DRAFT' && <Badge variant="default">Draft - Not Public</Badge>}
            </div>
          </div>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card hover={false}>
                <h3 className="text-lg font-semibold text-white mb-3">About</h3>
                <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">{tournament.description}</p>
              </Card>
              <Card hover={false}>
                <h3 className="text-lg font-semibold text-white mb-3">Free Fire Settings</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-text-muted">Map</p><p className="text-text font-medium">{tournament.map || 'Bermuda'}</p></div>
                  <div><p className="text-text-muted">Match Number</p><p className="text-text font-medium">{tournament.matchNumber || '-'}</p></div>
                  <div><p className="text-text-muted">Kill Points</p><p className="text-text font-medium">{tournament.killPoints} per kill</p></div>
                  <div><p className="text-text-muted">Room Release</p><p className="text-text font-medium">{tournament.roomReleaseTime.replace('_', ' ')}</p></div>
                </div>
                {showRoomInfo && (
                  <div className="mt-4 p-4 rounded-lg bg-success/10 border border-success/30">
                    <div className="flex items-center gap-2 mb-2"><Unlock size={16} className="text-success" /><p className="text-sm font-semibold text-success">Room Information Available</p></div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><p className="text-text-muted">Room ID</p><p className="text-text font-mono font-bold">{tournament.roomId}</p></div>
                      <div><p className="text-text-muted">Password</p><p className="text-text font-mono font-bold">{tournament.roomPassword}</p></div>
                    </div>
                  </div>
                )}
                {isRegistered && !showRoomInfo && tournament.roomId && (
                  <div className="mt-4 p-4 rounded-lg bg-warning/10 border border-warning/30">
                    <div className="flex items-center gap-2"><Lock size={16} className="text-warning" /><p className="text-sm text-warning">Room info will be available {tournament.roomReleaseTime === 'IMMEDIATE' ? 'immediately' : `${tournament.roomReleaseTime.replace('_', ' ')} before match start`}</p></div>
                  </div>
                )}
              </Card>
              {tournament.placementPoints.length > 0 && (
                <Card hover={false}>
                  <h3 className="text-sm font-semibold text-white mb-3">Placement Points</h3>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {tournament.placementPoints.sort((a, b) => a.position - b.position).map((pp, i) => (
                      <div key={i} className="text-center p-2 rounded-lg bg-white/5">
                        <p className="text-xs text-text-muted">#{pp.position}</p>
                        <p className="text-sm font-bold text-accent">{pp.points}pts</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
            <div className="space-y-4">
              <Card hover={false}>
                <h3 className="text-sm font-semibold text-white mb-3">Quick Info</h3>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-text-muted text-sm">Entry Fee</span><span className="text-text font-bold">{tournament.entryFee === 0 ? 'FREE' : `${Number(tournament.entryFee).toLocaleString('en-PK')} Coins`}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted text-sm">Prize Pool</span><span className="text-accent font-bold">Rs. {tournament.prizePool.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted text-sm">Mode</span><span className="text-text font-medium">{modeLabels[tournament.mode]}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted text-sm">Slots</span><span className="text-text font-medium">{participantCount}/{tournament.maxParticipants}</span></div>
                  <div className="w-full bg-white/5 rounded-full h-2"><div className="bg-primary h-2 rounded-full" style={{ width: `${(participantCount / tournament.maxParticipants) * 100}%` }} /></div>
                  <div className="flex justify-between"><span className="text-text-muted text-sm">Registration</span><span className="text-text text-xs">{formatDateTime(tournament.registrationEnd)}</span></div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <Card hover={false}>
            <h3 className="text-lg font-semibold text-white mb-3">Tournament Rules</h3>
            <div className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">{tournament.rules || 'Standard Free Fire competitive rules apply.'}</div>
          </Card>
        )}

        {activeTab === 'participants' && (
          <Card hover={false}>
            <h3 className="text-lg font-semibold text-white mb-4">Registered ({participantCount})</h3>
            {tournament.mode === 'SOLO' ? (
              participants.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {participants.map(user => user && (
                    <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/30">
                      <Avatar name={user.name} size="sm" />
                      <div><p className="text-sm font-medium text-white">{user.name}</p><p className="text-xs text-text-muted">@{user.username} {user.freeFireId && `• FF: ${user.freeFireId}`}</p></div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState icon={<Users size={24} />} title="No participants yet" description="Be the first to register!" />
            ) : (
              participants.length > 0 ? (
                <div className="space-y-2">
                  {participants.map((user, idx) => user && (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-border/30">
                      <Avatar name={user.name} size="sm" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{user.name}</p>
                        <p className="text-xs text-text-muted">@{user.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState icon={<Users size={24} />} title="No participants yet" description="Be the first to register!" />
            )}
          </Card>
        )}

        {activeTab === 'schedule' && (
          <Card hover={false}>
            <h3 className="text-lg font-semibold text-white mb-4">Matches</h3>
            {matches.length > 0 ? (
              <div className="space-y-3">
                {matches.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()).map(match => (
                  <div key={match.id} className="p-4 rounded-lg border border-border/30">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={match.status === 'LIVE' ? 'live' : match.status === 'COMPLETED' ? 'default' : 'info'}>Match #{match.matchNumber}</Badge>
                      <span className="text-xs text-text-muted">{formatDateTime(match.scheduledTime)}</span>
                    </div>
                    <div className="text-sm text-text-muted">Map: {match.map} • {match.status}</div>
                    {showRoomInfo && match.roomId && (
                      <div className="mt-2 p-2 rounded bg-success/10 text-xs text-success">Room: {match.roomId} / {match.roomPassword}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : <EmptyState icon={<Clock size={24} />} title="No matches scheduled" description="Matches will appear once the admin creates them." />}
          </Card>
        )}

        {activeTab === 'leaderboard' && (
          <Card hover={false}>
            <h3 className="text-lg font-semibold text-white mb-4">Leaderboard</h3>
            {results.length > 0 ? (
              <div className="overflow-x-auto">
                <table>
                  <thead><tr><th>Rank</th><th>Player/Team</th><th>Kills</th><th>Placement Pts</th><th>Kill Pts</th><th>Total</th></tr></thead>
                  <tbody>
                    {results.sort((a, b) => b.totalPoints - a.totalPoints).map((r, i) => (
                      <tr key={r.id}>
                        <td className="font-bold text-primary">#{i + 1}</td>
                        <td className="text-white font-medium">{r.participantName}</td>
                        <td className="text-accent">{r.kills}</td>
                        <td>{r.placementPoints}</td>
                        <td>{r.killPoints}</td>
                        <td className="font-bold text-white">{r.totalPoints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState icon={<Trophy size={24} />} title="No results yet" description="Results will appear after matches are completed." />}
          </Card>
        )}

        {activeTab === 'prizes' && (
          <Card hover={false}>
            <h3 className="text-lg font-semibold text-white mb-4">Prize Distribution</h3>
            <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 mb-6">
              <p className="text-xs text-text-muted mb-1">Total Prize Pool</p>
              <p className="text-3xl font-bold gradient-text">Rs. {(tournament.prizePool || 0).toLocaleString()}</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20">
                <span className="text-sm font-medium text-white">🥇 1st Place</span>
                <span className="text-sm font-bold text-warning">Rs. {(tournament.prizeDistribution?.first || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-border/30">
                <span className="text-sm font-medium text-white">🥈 2nd Place</span>
                <span className="text-sm font-bold text-text">Rs. {(tournament.prizeDistribution?.second || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-border/30">
                <span className="text-sm font-medium text-white">🥉 3rd Place</span>
                <span className="text-sm font-bold text-text">Rs. {(tournament.prizeDistribution?.third || 0).toLocaleString()}</span>
              </div>
              {tournament.prizeDistribution?.others?.map((o: any) => (
                <div key={o.position} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-border/30">
                  <span className="text-sm font-medium text-white">#{o.position} Place</span>
                  <span className="text-sm font-bold text-text">Rs. {(o.amount || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Join Modal */}
      <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} title="Register for Tournament">
        <p className="text-sm text-text-muted mb-4">Register for <strong className="text-white">{tournament.name}</strong></p>
        
        {/* Main Player Info */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-white mb-2">Your Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={ign} onChange={e=>setIgn(e.target.value)} placeholder="Your Free Fire IGN *" className="rounded-lg bg-surface border border-border text-text px-3 py-2 text-sm" />
            <input value={freeFireUid} onChange={e=>setFreeFireUid(e.target.value)} placeholder="Your Free Fire UID *" className="rounded-lg bg-surface border border-border text-text px-3 py-2 text-sm" />
            <input value={playerUsername} onChange={e=>setPlayerUsername(e.target.value)} placeholder="Tournament username *" className="rounded-lg bg-surface border border-border text-text px-3 py-2 text-sm sm:col-span-2" />
          </div>
        </div>
        
        {/* Teammate Fields based on mode */}
        {tournament.mode === 'DUO' && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-white mb-2">Teammate (Optional)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={teammate1Ign} onChange={e=>setTeammate1Ign(e.target.value)} placeholder="Teammate IGN" className="rounded-lg bg-surface border border-border text-text px-3 py-2 text-sm" />
              <input value={teammate1Uid} onChange={e=>setTeammate1Uid(e.target.value)} placeholder="Teammate UID" className="rounded-lg bg-surface border border-border text-text px-3 py-2 text-sm" />
            </div>
          </div>
        )}
        
        {tournament.mode === 'SQUAD' && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-white mb-2">Teammates (Optional - up to 3)</h4>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-text-muted mb-2">Teammate 1</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input value={teammate1Ign} onChange={e=>setTeammate1Ign(e.target.value)} placeholder="Teammate 1 IGN" className="rounded-lg bg-surface border border-border text-text px-3 py-2 text-sm" />
                  <input value={teammate1Uid} onChange={e=>setTeammate1Uid(e.target.value)} placeholder="Teammate 1 UID" className="rounded-lg bg-surface border border-border text-text px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-text-muted mb-2">Teammate 2</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input value={teammate2Ign} onChange={e=>setTeammate2Ign(e.target.value)} placeholder="Teammate 2 IGN" className="rounded-lg bg-surface border border-border text-text px-3 py-2 text-sm" />
                  <input value={teammate2Uid} onChange={e=>setTeammate2Uid(e.target.value)} placeholder="Teammate 2 UID" className="rounded-lg bg-surface border border-border text-text px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-text-muted mb-2">Teammate 3</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input value={teammate3Ign} onChange={e=>setTeammate3Ign(e.target.value)} placeholder="Teammate 3 IGN" className="rounded-lg bg-surface border border-border text-text px-3 py-2 text-sm" />
                  <input value={teammate3Uid} onChange={e=>setTeammate3Uid(e.target.value)} placeholder="Teammate 3 UID" className="rounded-lg bg-surface border border-border text-text px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {tournament.entryFee > 0 && (
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 mb-4">
            <p className="text-sm text-accent">Entry Fee: <strong>{Number(tournament.entryFee).toLocaleString('en-PK')} Coins</strong></p>
            <p className="text-xs text-text-muted mt-1">This amount will be deducted from your wallet.</p>
          </div>
        )}
        
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setShowJoinModal(false)}>Cancel</Button>
          <Button onClick={handleJoin}>Confirm Registration</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={showConfirmLeave} onClose={() => setShowConfirmLeave(false)} onConfirm={handleLeave} title="Leave Tournament" message="Are you sure you want to leave this tournament?" confirmText="Leave" danger />
    </div>
  );
}
