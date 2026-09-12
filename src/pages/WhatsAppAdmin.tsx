import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, QrCode, RefreshCw, LogOut, CheckCircle, AlertTriangle, Send, Users, Radio } from 'lucide-react';
import { Card, Button, Badge, EmptyState } from '../components/ui';

interface StatusData { status: string; qr: string | null; phoneNumber: string | null; connectedAt: string | null; lastError: string | null; destination: Chat | null; }
interface Chat { id: string; name: string; type: 'GROUP'|'CHANNEL'|'CHAT'; unreadCount: number; }

async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(`/api/whatsapp${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.message || `Request failed (${res.status})`);
  return json.data;
}

export default function WhatsAppAdmin() {
  const [status, setStatus] = useState<StatusData>({ status: 'DISCONNECTED', qr: null, phoneNumber: null, connectedAt: null, lastError: null, destination: null });
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Chat | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const s = await api('/status'); setStatus(s);
      if (s.destination) setSelected(s.destination);
      if (s.status === 'CONNECTED' && chats.length === 0) setChats(await api('/chats'));
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load WhatsApp'); }
  };

  useEffect(() => { load(); const timer = setInterval(load, 5000); return () => clearInterval(timer); }, [chats.length]);

  const connect = async () => { setLoading(true); setError(''); try { await api('/connect', { method: 'POST', body: '{}' }); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Connection failed'); } finally { setLoading(false); } };
  const disconnect = async (logout: boolean) => { setLoading(true); try { await api('/disconnect', { method: 'POST', body: JSON.stringify({ logout }) }); setSelected(null); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Disconnect failed'); } finally { setLoading(false); } };
  const choose = async (chat: Chat) => { setSelected(chat); try { await api('/destination', { method: 'POST', body: JSON.stringify(chat) }); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save destination'); } };
  const sendTest = async () => { if (!selected || !testMessage.trim()) return; try { await api('/send', { method: 'POST', body: JSON.stringify({ message: testMessage, destinationId: selected.id }) }); setTestMessage(''); } catch (e) { setError(e instanceof Error ? e.message : 'Message failed'); } };

  const grouped = useMemo(() => ({ groups: chats.filter(c => c.type === 'GROUP'), channels: chats.filter(c => c.type === 'CHANNEL'), chats: chats.filter(c => c.type === 'CHAT') }), [chats]);

  return <div className="max-w-6xl mx-auto">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div><h2 className="text-xl font-bold text-white flex items-center gap-2"><MessageCircle className="text-success"/> WhatsApp Connection</h2><p className="text-sm text-text-muted mt-1">Connect by QR, view synced chats, select a destination, and send tournament announcements.</p></div>
      <div className="flex gap-2">
        {status.status === 'CONNECTED' ? <Button variant="ghost" onClick={() => disconnect(false)} disabled={loading}><LogOut size={16}/> Disconnect</Button> : <Button onClick={connect} disabled={loading}><QrCode size={16}/> {loading ? 'Connecting...' : 'Connect WhatsApp'}</Button>}
      </div>
    </div>

    {error && <div className="mb-4 p-3 rounded-lg border border-danger/30 bg-danger/10 text-danger-light text-sm flex gap-2"><AlertTriangle size={17}/>{error}</div>}
    {status.lastError && <div className="mb-4 p-3 rounded-lg border border-warning/30 bg-warning/10 text-warning-light text-sm">{status.lastError}</div>}

    <div className="grid lg:grid-cols-[360px_1fr] gap-5">
      <Card hover={false}>
        <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-white">Connection</h3><Badge variant={status.status === 'CONNECTED' ? 'success' : status.status === 'QR_REQUIRED' ? 'warning' : 'default'}>{status.status}</Badge></div>
        {status.status === 'QR_REQUIRED' && status.qr ? <div className="text-center"><img src={status.qr} alt="WhatsApp QR code" className="w-72 h-72 mx-auto rounded-xl bg-white p-2"/><p className="text-xs text-text-muted mt-3">Open WhatsApp → Linked devices → Link a device, then scan this QR.</p></div> : status.status === 'CONNECTED' ? <div className="space-y-3"><div className="p-4 rounded-xl bg-success/10 border border-success/20"><CheckCircle className="text-success mb-2"/><p className="text-sm text-white font-medium">WhatsApp connected</p><p className="text-xs text-text-muted mt-1">+{status.phoneNumber || 'connected account'}</p></div><Button variant="ghost" className="w-full" onClick={async () => { try { setChats(await api('/chats')); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to refresh chats'); } }}><RefreshCw size={15}/> Refresh chats</Button><Button variant="ghost" className="w-full text-danger" onClick={() => disconnect(true)}><LogOut size={15}/> Logout & clear session</Button></div> : <EmptyState icon={<QrCode size={30}/>} title="Not connected" description="Connect WhatsApp to generate a QR code." action={<Button onClick={connect}><QrCode size={15}/> Generate QR</Button>} />}
      </Card>

      <Card hover={false}>
        <div className="flex items-center justify-between mb-4"><div><h3 className="font-semibold text-white">Chats & destinations</h3><p className="text-xs text-text-muted">Select where automatic tournament announcements should go.</p></div><span className="text-xs text-text-muted">{chats.length} synced</span></div>
        {selected && <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between"><div><p className="text-xs text-text-muted">Selected destination</p><p className="text-sm font-medium text-white">{selected.name}</p></div><Badge>{selected.type}</Badge></div>}
        {status.status !== 'CONNECTED' ? <EmptyState icon={<Users size={30}/>} title="Connect first" description="Your WhatsApp groups/chats will appear here after connection."/> : chats.length === 0 ? <EmptyState icon={<Users size={30}/>} title="No synced chats yet" description="Send/receive a message or refresh after WhatsApp finishes syncing."/> : <div className="max-h-[420px] overflow-y-auto space-y-1">
          {[['GROUPS', grouped.groups, Users], ['CHANNELS', grouped.channels, Radio], ['CHATS', grouped.chats, MessageCircle]].map(([label, items, Icon]: any) => items.length ? <div key={label as string} className="mb-4"><p className="text-[11px] uppercase tracking-wider text-text-muted px-2 mb-1">{label as string}</p>{(items as Chat[]).map(chat => <button key={chat.id} onClick={() => choose(chat)} className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition ${selected?.id === chat.id ? 'bg-primary/15 border border-primary/30' : 'hover:bg-white/5 border border-transparent'}`}><Icon size={17} className="text-primary"/><span className="flex-1 min-w-0"><span className="block text-sm text-white truncate">{chat.name}</span><span className="block text-[10px] text-text-muted truncate">{chat.id}</span></span><Badge>{chat.type}</Badge></button>)}</div> : null)}
        </div>}
      </Card>
    </div>

    <Card hover={false} className="mt-5"><h3 className="font-semibold text-white mb-1">Test announcement</h3><p className="text-xs text-text-muted mb-3">Use this to verify the selected group/channel before enabling automatic tournament announcements.</p><div className="flex gap-2"><input value={testMessage} onChange={e => setTestMessage(e.target.value)} placeholder="Test ZyroBattle announcement..." className="flex-1 rounded-lg bg-surface border border-border text-text px-3 py-2 text-sm"/><Button onClick={sendTest} disabled={!selected || !testMessage.trim() || status.status !== 'CONNECTED'}><Send size={15}/> Send</Button></div></Card>
  </div>;
}
