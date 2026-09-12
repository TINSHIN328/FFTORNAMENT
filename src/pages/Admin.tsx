import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Trophy, Target, BarChart3, Plus, Eye, Trash2, Edit, CheckCircle, XCircle, AlertTriangle, Play, Pause, Shield, Coins } from 'lucide-react';
import { useApp } from '../store';
import { Card, Button, Badge, StatCard, Avatar, Input, Select, SearchInput, EmptyState, Modal, Tabs, ConfirmDialog, getStatusBadge, formatDate, formatDateTime } from '../components/ui';
import { v4 as uuidv4 } from 'uuid';
import { TournamentStatus, TournamentFormat } from '../types';

export function AdminDashboard() {
  const { state } = useApp();
  // REAL stats from database
  const totalUsers = state.users.length;
  const activeUsers = state.users.filter(u => u.status === 'ACTIVE').length;
  const totalTournaments = state.tournaments.length;
  const liveTournaments = state.tournaments.filter(t => t.status === 'LIVE').length;
  const upcomingTournaments = state.tournaments.filter(t => t.status === 'UPCOMING' || t.status === 'REGISTRATION_OPEN').length;
  const completedTournaments = state.tournaments.filter(t => t.status === 'COMPLETED').length;
  const totalTeams = state.teams.length;
  const totalMatches = state.matches.length;
  const totalParticipants = state.tournaments.reduce((sum, t) => sum + t.participantIds.length, 0);

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Dashboard Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={totalUsers} icon={<Users size={20} />} />
        <StatCard label="Active Users" value={activeUsers} icon={<Users size={20} />} />
        <StatCard label="Tournaments" value={totalTournaments} icon={<Trophy size={20} />} />
        <StatCard label="Live Now" value={liveTournaments} icon={<Target size={20} />} />
        <StatCard label="Upcoming" value={upcomingTournaments} icon={<BarChart3 size={20} />} />
        <StatCard label="Completed" value={completedTournaments} icon={<CheckCircle size={20} />} />
        <StatCard label="Total Teams" value={totalTeams} icon={<Users size={20} />} />
        <StatCard label="Total Matches" value={totalMatches} icon={<Target size={20} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card hover={false}>
          <h3 className="text-sm font-semibold text-white mb-4">Recent Tournaments</h3>
          {state.tournaments.length > 0 ? (
            <div className="space-y-2">
              {state.tournaments.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
                  <div>
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    <p className="text-xs text-text-muted">{t.participantIds.length} participants</p>
                  </div>
                  {getStatusBadge(t.status)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center py-4">No tournaments yet</p>
          )}
        </Card>
        <Card hover={false}>
          <h3 className="text-sm font-semibold text-white mb-4">Recent Users</h3>
          {state.users.length > 0 ? (
            <div className="space-y-2">
              {state.users.slice(0, 5).map(u => (
                <div key={u.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-white">{u.name}</p>
                      <p className="text-xs text-text-muted">@{u.username}</p>
                    </div>
                  </div>
                  <Badge variant={u.role === 'ADMIN' ? 'warning' : 'default'}>{u.role}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center py-4">No users yet</p>
          )}
        </Card>
      </div>
    </div>
  );
}

export function AdminUsers() {
  const { state, dispatch, addToast } = useApp();
  const [search, setSearch] = useState('');
  const [showBanConfirm, setShowBanConfirm] = useState<string | null>(null);

  const filtered = state.users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Users ({state.users.length})</h2>
      </div>
      {state.users.length > 0 && (
        <div className="mb-4 max-w-sm"><SearchInput value={search} onChange={setSearch} placeholder="Search users..." /></div>
      )}
      {filtered.length === 0 ? (
        <EmptyState icon={<Users size={32} />} title="No users registered" description="Users will appear here once they create accounts." />
      ) : (
        <Card hover={false}>
          <div className="overflow-x-auto">
            <table>
              <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(user => (
                  <tr key={user.id}>
                    <td><div className="flex items-center gap-3"><Avatar name={user.name} size="sm" /><div><p className="text-sm font-medium text-white">{user.name}</p><p className="text-xs text-text-muted">@{user.username}</p></div></div></td>
                    <td className="text-sm text-text-muted">{user.email}</td>
                    <td><Badge variant={user.role === 'ADMIN' ? 'warning' : user.role === 'MODERATOR' ? 'info' : 'default'}>{user.role}</Badge></td>
                    <td><Badge variant={user.status === 'ACTIVE' ? 'success' : user.status === 'BANNED' ? 'danger' : 'warning'}>{user.status}</Badge></td>
                    <td className="text-xs text-text-muted">{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="flex gap-1">
                        {user.role !== 'ADMIN' && (
                          <>
                            <button onClick={() => { dispatch({ type: 'UPDATE_USER_ROLE', payload: { userId: user.id, role: user.role === 'USER' ? 'MODERATOR' : 'USER' } }); addToast('Role updated.', 'success'); }} className="p-1.5 rounded hover:bg-white/10 text-text-muted hover:text-text" title="Toggle Role"><Shield size={14} /></button>
                            <button onClick={() => setShowBanConfirm(user.id)} className="p-1.5 rounded hover:bg-danger/10 text-text-muted hover:text-danger" title={user.status === 'BANNED' ? 'Unban' : 'Ban'}><XCircle size={14} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <ConfirmDialog isOpen={!!showBanConfirm} onClose={() => setShowBanConfirm(null)} onConfirm={() => { if (showBanConfirm) { const user = state.users.find(u => u.id === showBanConfirm); if (user?.status === 'BANNED') { dispatch({ type: 'UNBAN_USER', payload: showBanConfirm }); addToast('User unbanned.', 'success'); } else { dispatch({ type: 'BAN_USER', payload: showBanConfirm }); addToast('User banned.', 'warning'); } } }} title="Confirm Action" message="Are you sure you want to change this user's ban status?" confirmText="Confirm" danger />
    </div>
  );
}

export function AdminTournaments() {
  const { state, dispatch, addToast } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [showResults, setShowResults] = useState<any | null>(null);
  const [resultParticipants, setResultParticipants] = useState<any[]>([]);
  const [form, setForm] = useState({
    name:'', description:'', mode:'SQUAD' as 'SOLO'|'DUO'|'SQUAD',
    prizePool:1000, entryFee:50, maxParticipants:32, date:'', time:'17:00',
    timezone:'Asia/Karachi', map:'Bermuda', format:'CUSTOM' as TournamentFormat,
    region:'Pakistan', platform:'Mobile', rules:'No hacks, scripts, emulators or unfair play. Admin decision is final.',
    killPoints:1
  });
  const [prizeRows,setPrizeRows]=useState<{position:number;amount:number}[]>([]);

  const defaults=(mode:'SOLO'|'DUO'|'SQUAD',pool:number)=>{
    const w=mode==='SOLO'?[.30,.20,.14,.10,.07,.06,.05,.04,.025,.015]:[.50,.30,.20];
    return w.map((x,i)=>({position:i+1,amount:Math.round(pool*x)}));
  };
  const resetForm=()=>{
    const d=new Date(Date.now()+14*86400000);
    setForm({name:'',description:'',mode:'SQUAD',prizePool:1000,entryFee:50,maxParticipants:32,date:d.toISOString().slice(0,10),time:'17:00',timezone:'Asia/Karachi',map:'Bermuda',format:'CUSTOM',region:'Pakistan',platform:'Mobile',rules:'No hacks, scripts, emulators or unfair play. Admin decision is final.',killPoints:1});
    setPrizeRows(defaults('SQUAD',1000));
  };
  const changeMode=(mode:'SOLO'|'DUO'|'SQUAD')=>{
    setForm(f=>({...f,mode,maxParticipants:mode==='SOLO'?100:32}));
    setPrizeRows(defaults(mode,form.prizePool));
  };
  const totalPrize=prizeRows.reduce((s,r)=>s+Number(r.amount||0),0);

  const handleCreate=async()=>{
    if(!form.name.trim()) return addToast('Tournament name is required.','error');
    if(!form.date||!form.time) return addToast('Tournament date and time are required.','error');
    if(totalPrize>form.prizePool) return addToast('Prize distribution cannot exceed the prize pool.','error');
    const start=`${form.date}T${form.time}:00`;
    try{
      const r=await fetch('/api/admin/tournaments',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        name:form.name.trim(),game_id:'free-fire',description:form.description,prize_pool:Number(form.prizePool),entry_fee:Number(form.entryFee),
        max_teams:Number(form.maxParticipants),max_participants:Number(form.maxParticipants),max_players_per_team:form.mode==='SOLO'?1:form.mode==='DUO'?2:4,
        mode:form.mode,format:form.format,region:form.region,platform:form.platform,rules:form.rules,prize_distribution:prizeRows,
        tournament_date:start,match_start_time:start,timezone:form.timezone,map:form.map,kill_points:Number(form.killPoints)
      })});
      const j=await r.json().catch(()=>({})); if(!r.ok||!j.success) throw new Error(j.message||'Tournament creation failed');
      const t=j.data;
      dispatch({type:'CREATE_TOURNAMENT',payload:{
        id:t.id,name:t.name,slug:t.slug,description:t.description||form.description,bannerUrl:'',logoUrl:'',
        gameId:'free-fire',game:'Free Fire',mode:form.mode,entryFee:Number(t.entry_fee),currency:'COINS',maxParticipants:Number(t.max_participants),
        maxTeams:Number(t.max_teams),maxPlayersPerTeam:Number(t.max_players_per_team),prizePool:Number(t.prize_pool),prizeDistribution:{
          first:prizeRows[0]?.amount||0,second:prizeRows[1]?.amount||0,third:prizeRows[2]?.amount||0,others:prizeRows.slice(3)
        },registrationStart:t.registration_start||'',registrationEnd:t.registration_end||'',tournamentDate:t.tournament_date||start,
        matchStartTime:t.match_start_time||start,timezone:form.timezone,map:form.map,matchNumber:1,round:'Round 1',killPoints:form.killPoints,
        placementPoints:[],roomReleaseTime:'IMMEDIATE',roomId:'',roomPassword:'',status:'DRAFT',participantIds:[],teamIds:[],
        whatsappAnnouncementSent:Boolean(j.whatsappSent),createdAt:t.created_at||new Date().toISOString(),createdBy:state.currentUser!.id,
        region:form.region,platform:form.platform,format:form.format,rules:form.rules
      }});
      addToast(j.whatsappSent?'Tournament created and WhatsApp announcement sent!':'Tournament created successfully!','success');
      setShowCreate(false);resetForm();
    }catch(e){addToast(e instanceof Error?e.message:'Tournament creation failed.','error');}
  };

  const updateStatus=async(id:string,status:TournamentStatus)=>{
    try{
      const r=await fetch(`/api/admin/tournaments/${id}`,{method:'PUT',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
      const j=await r.json().catch(()=>({}));if(!r.ok||!j.success)throw new Error(j.message||'Status update failed');
      dispatch({type:'UPDATE_TOURNAMENT',payload:{id,data:{status}}});addToast(`Tournament ${status.toLowerCase().replace(/_/g,' ')}.`,'success');
    }catch(e){addToast(e instanceof Error?e.message:'Status update failed.','error');}
  };

  const openResults=async(t:any)=>{
    try{
      const r=await fetch(`/api/admin/tournaments/${t.id}/participants`,{credentials:'include'});
      const j=await r.json().catch(()=>({}));if(!r.ok||!j.success)throw new Error(j.message||'Could not load participants');
      setResultParticipants(j.data||[]);setShowResults(t);
    }catch(e){addToast(e instanceof Error?e.message:'Could not load participants.','error');}
  };
  const publishResults=async()=>{
    if(!showResults)return;
    const payload=resultParticipants.filter(p=>Number(p.placement)>0).map(p=>({participantId:p.user_id,participantType:'PLAYER',placement:Number(p.placement),prizeRupees:Number(p.prizeRupees||0),coinsAwarded:Number(p.coinsAwarded||0)}));
    if(!payload.length)return addToast('Enter at least one placement.','error');
    try{
      const r=await fetch(`/api/admin/tournaments/${showResults.id}/results`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({results:payload})});
      const j=await r.json().catch(()=>({}));if(!r.ok||!j.success)throw new Error(j.message||'Could not publish results');
      addToast('Results published and coin rewards credited.','success');dispatch({type:'UPDATE_TOURNAMENT',payload:{id:showResults.id,data:{status:'COMPLETED'}}});setShowResults(null);
    }catch(e){addToast(e instanceof Error?e.message:'Could not publish results.','error');}
  };

  return <div>
    <div className="flex items-center justify-between mb-6">
      <div><h2 className="text-xl font-bold text-white">Tournaments ({state.tournaments.length})</h2><p className="text-xs text-text-muted mt-1">Free Fire • PKR • Solo / Duo / Squad</p></div>
      <Button onClick={()=>{resetForm();setShowCreate(true)}}><Plus size={16}/> Create Tournament</Button>
    </div>
    {state.tournaments.length===0?<EmptyState icon={<Trophy size={32}/>} title="No tournaments created" description="Create your first Free Fire tournament." action={<Button onClick={()=>{resetForm();setShowCreate(true)}}>Create Tournament</Button>}/>:
    <Card hover={false}><div className="overflow-x-auto"><table><thead><tr><th>Tournament</th><th>Mode</th><th>Entry</th><th>Prize</th><th>Date / Time</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {state.tournaments.map(t=><tr key={t.id}><td><p className="text-sm font-medium text-white">{t.name}</p><p className="text-xs text-text-muted">Free Fire</p></td><td><Badge>{t.mode}</Badge></td>
      <td className="text-sm">{Number(t.entryFee||0).toLocaleString('en-PK')} Coins</td><td className="text-sm text-accent">Rs {Number(t.prizePool||0).toLocaleString('en-PK')}</td>
      <td className="text-xs text-text-muted">{formatDateTime(t.tournamentDate||t.createdAt)}</td><td>{getStatusBadge(t.status)}</td><td><div className="flex gap-1 flex-wrap">
        <Link to={`/tournaments/${t.id}`} className="p-1.5 text-text-muted"><Eye size={14}/></Link>
        {t.status==='DRAFT'&&<button onClick={()=>updateStatus(t.id,'REGISTRATION_OPEN')} className="p-1.5 text-success"><Play size={14}/></button>}
        {t.status==='REGISTRATION_OPEN'&&<button onClick={()=>updateStatus(t.id,'REGISTRATION_CLOSED')} className="p-1.5 text-warning"><Pause size={14}/></button>}
        {(t.status==='REGISTRATION_CLOSED'||t.status==='REGISTRATION_OPEN')&&<button onClick={()=>updateStatus(t.id,'LIVE')} className="p-1.5 text-danger"><Play size={14}/></button>}
        {t.status==='LIVE'&&<button onClick={()=>updateStatus(t.id,'COMPLETED')} className="p-1.5 text-success"><CheckCircle size={14}/></button>}
        {t.status!=='COMPLETED'&&t.status!=='CANCELLED'&&<button onClick={()=>openResults(t)} className="p-1.5 text-accent" title="Manage winners and coins"><Coins size={14}/></button>}
        {t.status!=='COMPLETED'&&t.status!=='CANCELLED'&&<button onClick={()=>updateStatus(t.id,'CANCELLED')} className="p-1.5 text-warning"><XCircle size={14}/></button>}
        <button onClick={()=>setShowDelete(t.id)} className="p-1.5 text-danger"><Trash2 size={14}/></button>
      </div></td></tr>)}
    </tbody></table></div></Card>}

    <Modal isOpen={showCreate} onClose={()=>setShowCreate(false)} title="Create Free Fire Tournament" size="lg"><div className="space-y-4">
      <Input label="Tournament Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="ZyroBattle Championship"/>
      <div className="grid grid-cols-2 gap-3"><Select label="Mode" value={form.mode} onChange={e=>changeMode(e.target.value as any)} options={[{value:'SOLO',label:'🎯 Solo'},{value:'DUO',label:'👥 Duo'},{value:'SQUAD',label:'🛡️ Squad'}]}/><Input label="Slots" type="number" min={1} value={form.maxParticipants} onChange={e=>setForm({...form,maxParticipants:Number(e.target.value)})}/></div>
      <div className="grid grid-cols-2 gap-3"><Input label="Entry Fee (Coins)" type="number" min={0} value={form.entryFee} onChange={e=>setForm({...form,entryFee:Number(e.target.value)})}/><Input label="Prize Pool (Rs)" type="number" min={0} value={form.prizePool} onChange={e=>{const v=Number(e.target.value);setForm({...form,prizePool:v});setPrizeRows(defaults(form.mode,v))}}/></div>
      <div className="grid grid-cols-2 gap-3"><Input label="Tournament Date" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/><Input label="Match Start Time" type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/></div>
      <div className="grid grid-cols-2 gap-3"><Select label="Timezone" value={form.timezone} onChange={e=>setForm({...form,timezone:e.target.value})} options={[{value:'Asia/Karachi',label:'Pakistan (PKT)'},{value:'UTC',label:'UTC'},{value:'Asia/Dubai',label:'Dubai (GST)'}]}/><Select label="Map" value={form.map} onChange={e=>setForm({...form,map:e.target.value})} options={[{value:'Bermuda',label:'Bermuda'},{value:'Purgatory',label:'Purgatory'},{value:'Kalahari',label:'Kalahari'},{value:'Alpine',label:'Alpine'}]}/></div>
      <div className="p-3 rounded-lg border border-border/30"><div className="flex justify-between mb-2"><h4 className="text-sm font-semibold text-white">Prize Distribution</h4><span className="text-xs text-text-muted">Rs {totalPrize.toLocaleString('en-PK')} / Rs {Number(form.prizePool).toLocaleString('en-PK')}</span></div><div className="grid grid-cols-2 sm:grid-cols-5 gap-2">{prizeRows.map((r,i)=><div key={r.position}><label className="text-[11px] text-text-muted">Top {r.position}</label><input type="number" min={0} value={r.amount} onChange={e=>setPrizeRows(a=>a.map((x,j)=>j===i?{...x,amount:Number(e.target.value)}:x))} className="w-full rounded-lg bg-surface border border-border text-text px-2 py-2 text-sm"/></div>)}</div><p className="text-xs text-text-muted mt-2">{form.mode==='SOLO'?'Solo: Top 10 prize positions.':'Duo/Squad: Top 3 prize positions.'}</p></div>
      <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={2} className="w-full rounded-lg bg-surface border border-border text-text p-3 text-sm" placeholder="Description..."/>
      <textarea value={form.rules} onChange={e=>setForm({...form,rules:e.target.value})} rows={3} className="w-full rounded-lg bg-surface border border-border text-text p-3 text-sm" placeholder="Rules..."/>
      <div className="p-3 rounded-lg bg-info/10 border border-primary/20 text-xs text-primary-light">The selected WhatsApp group/channel receives the tournament announcement automatically.</div>
      <div className="flex justify-end gap-3"><Button variant="ghost" onClick={()=>setShowCreate(false)}>Cancel</Button><Button onClick={handleCreate}>Create Tournament</Button></div>
    </div></Modal>

    <Modal isOpen={!!showResults} onClose={()=>setShowResults(null)} title={showResults?`Results • ${showResults.name}`:'Results'} size="lg"><div className="space-y-3">
      <p className="text-xs text-text-muted">Admin can set placement, PKR prize and coin reward. Publishing credits the coin reward to the participant account.</p>
      {resultParticipants.length===0?<EmptyState icon={<Users size={24}/>} title="No registered participants" description="Participants must register before results can be entered."/>:<div className="max-h-[460px] overflow-y-auto space-y-2">
        {resultParticipants.map((p,i)=><div key={p.id||i} className="grid grid-cols-[1fr_70px_100px_90px] gap-2 items-center p-2 rounded-lg border border-border/30"><div><p className="text-sm text-white">{p.user_name||p.account_username}</p><p className="text-[11px] text-text-muted">{p.ign||'-'} • UID {p.free_fire_uid||'-'}</p></div>
          <input type="number" min={0} placeholder="Pos" value={p.placement||''} onChange={e=>setResultParticipants(a=>a.map((x,j)=>j===i?{...x,placement:e.target.value}:x))} className="rounded bg-surface border border-border px-2 py-2 text-sm"/>
          <input type="number" min={0} placeholder="Rs prize" value={p.prizeRupees||''} onChange={e=>setResultParticipants(a=>a.map((x,j)=>j===i?{...x,prizeRupees:e.target.value}:x))} className="rounded bg-surface border border-border px-2 py-2 text-sm"/>
          <input type="number" min={0} placeholder="Coins" value={p.coinsAwarded||''} onChange={e=>setResultParticipants(a=>a.map((x,j)=>j===i?{...x,coinsAwarded:e.target.value}:x))} className="rounded bg-surface border border-border px-2 py-2 text-sm"/>
        </div>)}</div>}
      {resultParticipants.length>0&&<div className="flex justify-end gap-3 pt-3"><Button variant="ghost" onClick={()=>setShowResults(null)}>Cancel</Button><Button onClick={publishResults}><Coins size={16}/> Publish Results</Button></div>}
    </div></Modal>

    <ConfirmDialog isOpen={!!showDelete} onClose={()=>setShowDelete(null)} onConfirm={()=>{if(showDelete)fetch(`/api/admin/tournaments/${showDelete}`,{method:'DELETE',credentials:'include'}).then(async r=>{const j=await r.json().catch(()=>({}));if(!r.ok||!j.success)throw new Error(j.message||'Delete failed');dispatch({type:'DELETE_TOURNAMENT',payload:showDelete});setShowDelete(null);addToast('Tournament deleted.','info')}).catch(e=>addToast(e instanceof Error?e.message:'Delete failed.','error'))}} title="Delete Tournament" message="Are you sure? This action cannot be undone." confirmText="Delete" danger/>
  </div>;
}

// navigate used in admin tournament table

export function AdminMatches() {
  const { state, dispatch, addToast } = useApp();
  const [showResult, setShowResult] = useState<string | null>(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);

  const submitResult = (matchId: string) => {
    const match = state.matches.find(m => m.id === matchId);
    if (!match) return;
    const winnerId = scoreA > scoreB ? match.teamAId : match.teamBId;
    dispatch({ type: 'UPDATE_MATCH', payload: { id: matchId, data: { scoreA, scoreB, winnerId, status: 'COMPLETED' } } });
    addToast('Result submitted!', 'success');
    setShowResult(null);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Matches ({state.matches.length})</h2>
      {state.matches.length === 0 ? (
        <EmptyState icon={<Target size={32} />} title="No matches" description="Matches will appear when tournaments start." />
      ) : (
        <Card hover={false}>
          <div className="overflow-x-auto">
            <table>
              <thead><tr><th>Match</th><th>Tournament</th><th>Round</th><th>Score</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {state.matches.map(m => {
                  const tournament = state.tournaments.find(t => t.id === m.tournamentId);
                  return (
                    <tr key={m.id}>
                      <td><p className="text-sm font-medium text-white">{m.teamAName} vs {m.teamBName}</p></td>
                      <td className="text-sm text-text-muted">{tournament?.name}</td>
                      <td className="text-sm text-text-muted">{m.roundName}</td>
                      <td className="text-sm font-bold text-white">{m.status === 'COMPLETED' ? `${m.scoreA} - ${m.scoreB}` : '-'}</td>
                      <td><Badge variant={m.status === 'LIVE' ? 'live' : m.status === 'COMPLETED' ? 'default' : 'info'}>{m.status}</Badge></td>
                      <td>
                        {m.status === 'UPCOMING' && <Button size="sm" variant="outline" onClick={() => { setShowResult(m.id); setScoreA(0); setScoreB(0); }}>Submit Result</Button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={!!showResult} onClose={() => setShowResult(null)} title="Submit Match Result">
        {showResult && (() => {
          const match = state.matches.find(m => m.id === showResult);
          if (!match) return null;
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border/30">
                <div className="text-center"><p className="text-sm font-medium text-white">{match.teamAName}</p></div>
                <div className="flex items-center gap-3">
                  <input type="number" min="0" value={scoreA} onChange={e => setScoreA(Number(e.target.value))} className="w-16 text-center text-lg font-bold bg-surface border border-border rounded-lg py-2" />
                  <span className="text-text-muted">-</span>
                  <input type="number" min="0" value={scoreB} onChange={e => setScoreB(Number(e.target.value))} className="w-16 text-center text-lg font-bold bg-surface border border-border rounded-lg py-2" />
                </div>
                <div className="text-center"><p className="text-sm font-medium text-white">{match.teamBName}</p></div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={() => setShowResult(null)}>Cancel</Button>
                <Button onClick={() => submitResult(showResult)}>Submit Result</Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

export function AdminReports() {
  const { state } = useApp();

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Reports ({state.reports.length})</h2>
      {state.reports.length === 0 ? (
        <EmptyState icon={<AlertTriangle size={32} />} title="No reports" description="No reports have been submitted." />
      ) : (
        <Card hover={false}>
          <div className="space-y-3">
            {state.reports.map(r => (
              <div key={r.id} className="p-4 rounded-lg border border-border/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-white">{r.reason}</p>
                  <Badge variant={r.status === 'OPEN' ? 'warning' : r.status === 'RESOLVED' ? 'success' : 'default'}>{r.status}</Badge>
                </div>
                <p className="text-xs text-text-muted">{r.description}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}


export function AdminCoinRequests() {
  const { addToast } = useApp();
  const [rows,setRows]=useState<any[]>([]);
  const load=async()=>{const r=await fetch('/api/wallet/admin/requests',{credentials:'include'});const j=await r.json();if(r.ok&&j.success)setRows(j.data||[]);};
  React.useEffect(()=>{load();},[]);
  const review=async(id:string,action:string)=>{try{const r=await fetch(`/api/wallet/admin/${id}/review`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});const j=await r.json();if(!r.ok)throw new Error(j.message);addToast(j.message,'success');load();}catch(e){addToast(e instanceof Error?e.message:'Review failed','error');}};
  return <div><h2 className="text-xl font-bold text-white mb-6">Coin Requests</h2>{rows.length===0?<EmptyState icon={<Coins size={32}/>} title="No pending requests" description="New Easypaisa purchases and withdrawals will appear here."/>:<Card hover={false}><div className="space-y-3">{rows.map(r=><div key={r.id} className="p-4 rounded-lg border border-border/30"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-white font-medium">{r.type} • {r.coins} coins • Rs {r.rupees}</p><p className="text-sm text-text-muted">{r.name} (@{r.username})</p><p className="text-xs text-text-muted mt-1">Easypaisa: {r.purchase_account||r.withdrawal_account||r.easypaisa_account||'—'} {r.purchase_ref||r.transaction_ref?' • Ref: '+(r.purchase_ref||r.transaction_ref):''}</p></div><Badge variant="warning">PENDING</Badge></div><div className="flex gap-2 mt-3">{r.type==='PURCHASE'?<><Button size="sm" onClick={()=>review(r.id,'APPROVE')}>Approve & Add Coins</Button><Button size="sm" variant="ghost" onClick={()=>review(r.id,'REJECT')}>Reject</Button></>:<><Button size="sm" onClick={()=>review(r.id,'PAID')}>{r.status==='APPROVED'?'Mark Paid':'Approve & Mark Paid'}</Button><Button size="sm" variant="ghost" onClick={()=>review(r.id,'REJECT')}>Reject & Return Coins</Button></>}</div></div>)}</div></Card>}</div>;
}
