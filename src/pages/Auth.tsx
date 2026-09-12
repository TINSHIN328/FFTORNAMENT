import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, MessageCircle } from 'lucide-react';
import { useApp } from '../store';
import { Button, Input } from '../components/ui';

export function Login() {
  const { addToast, dispatch } = useApp();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [otpStep, setOtpStep] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method:'POST', credentials:'include', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ username:username.trim(), password, ...(otpStep ? {otpVerificationId:verificationId, otp} : {}) })
      });
      const json = await response.json().catch(()=>({}));
      if (!response.ok || !json.success) throw new Error(json.message || 'Login failed.');
      if (json.requiresOtp) { setVerificationId(json.verificationId); setOtpStep(true); addToast('Login OTP sent to your WhatsApp.', 'success'); return; }
      // OTP verified successfully - user data is already in json.data, no need to call login() again
      const user = {
        id: json.data.id,
        email: json.data.email || '',
        name: json.data.name || '',
        username: json.data.username || '',
        freeFireId: json.data.free_fire_id || '',
        avatarUrl: json.data.avatar_url || '',
        role: json.data.role,
        status: json.data.status || 'ACTIVE',
        bio: '',
        createdAt: json.data.created_at || '',
        lastLogin: json.data.last_login || ''
      };
      dispatch({ type: 'LOGIN', payload: user });
      addToast('Welcome back, ' + user.name + '!', 'success');
      navigate('/dashboard');
    } catch(e) { addToast(e instanceof Error ? e.message : 'Login failed.', 'error'); }
    finally { setLoading(false); }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 hero-gradient">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="font-display font-bold text-white text-sm">ZB</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-text-muted text-sm mt-1">Sign in to your ZyroBattle account</p>
        </div>

        <div className="glass-card rounded-xl p-6">
          {/* Google Login */}
          <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-border hover:border-primary/50 hover:bg-white/5 transition-all text-sm font-medium text-text mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
            <div className="relative flex justify-center text-xs"><span className="px-3 bg-surface text-text-muted">or sign in with username</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!otpStep ? <>
              <Input label="Username" placeholder="yourusername" value={username} onChange={e => setUsername(e.target.value)} icon={<User size={16} />} required />
              <div className="relative">
                <Input label="Password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} icon={<Lock size={16} />} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-text-muted hover:text-text"><Eye size={16} /></button>
              </div>
            </> : <><div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary-light">A 6-digit login OTP was sent to your WhatsApp number.</div><Input label="OTP Code" inputMode="numeric" maxLength={6} placeholder="123456" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} required /></>}
            <Button type="submit" loading={loading} className="w-full">{otpStep ? 'Verify OTP & Sign In' : 'Sign In'}</Button>
          </form>

          <p className="text-center text-sm text-text-muted mt-6">
            Don't have an account? <Link to="/register" className="text-primary hover:text-primary-light font-medium">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function Register() {
  const { addToast } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return addToast('Password must be at least 6 characters.', 'error');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/request-registration-otp', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, username, password, phoneNumber }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.success) throw new Error(json.message || 'Could not send OTP.');
      setVerificationId(json.verificationId);
      setStep(2);
      addToast('OTP sent to your WhatsApp.', 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Could not send OTP.', 'error');
    } finally { setLoading(false); }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return addToast('Enter the 6-digit OTP.', 'error');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-registration-otp', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationId, otp }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.success) throw new Error(json.message || 'Invalid OTP.');
      addToast('Account verified! Welcome to ZyroBattle.', 'success');
      navigate('/dashboard');
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Verification failed.', 'error');
    } finally { setLoading(false); }
  };

  const resendOtp = async () => {
    setResendLoading(true);
    try {
      const response = await fetch('/api/auth/request-registration-otp', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, username, password, phoneNumber }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.success) throw new Error(json.message || 'Could not resend OTP.');
      setVerificationId(json.verificationId); setOtp(''); addToast('A new OTP was sent.', 'success');
    } catch (e) { addToast(e instanceof Error ? e.message : 'Could not resend OTP.', 'error'); }
    finally { setResendLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 hero-gradient">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6"><div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center"><span className="font-display font-bold text-white text-sm">ZB</span></div></Link>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-text-muted text-sm mt-1">Verify your WhatsApp number to join ZyroBattle</p>
        </div>
        <div className="glass-card rounded-xl p-6">
          {step === 1 ? <>
            <div className="mb-5 p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary-light">A 6-digit OTP will be sent by the ZyroBattle WhatsApp account to verify your number.</div>
            <form onSubmit={requestOtp} className="space-y-4">
              <Input label="Full Name" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} icon={<User size={16} />} required />
              <Input label="Email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} icon={<Mail size={16} />} required />
              <Input label="WhatsApp Number" type="tel" placeholder="03001234567" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} icon={<MessageCircle size={16} />} required />
              <Input label="Username" placeholder="coolplayer123" value={username} onChange={e => setUsername(e.target.value)} icon={<User size={16} />} required />
              <Input label="Password" type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} icon={<Lock size={16} />} required minLength={6} />
              <Button type="submit" loading={loading} className="w-full">Send WhatsApp OTP</Button>
            </form>
          </> : <>
            <div className="text-center mb-5"><div className="mx-auto w-14 h-14 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mb-3"><MessageCircle className="text-success" size={26}/></div><h2 className="font-semibold text-white">Verify WhatsApp</h2><p className="text-xs text-text-muted mt-1">Enter the 6-digit code sent to <span className="text-text">{phoneNumber}</span></p></div>
            <form onSubmit={verifyOtp} className="space-y-4">
              <Input label="OTP Code" inputMode="numeric" maxLength={6} placeholder="123456" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0,6))} required />
              <Button type="submit" loading={loading} className="w-full">Verify & Create Account</Button>
              <div className="flex items-center justify-between text-xs"><button type="button" onClick={() => setStep(1)} className="text-text-muted hover:text-text">Change number</button><button type="button" disabled={resendLoading} onClick={resendOtp} className="text-primary hover:text-primary-light disabled:opacity-50">{resendLoading ? 'Sending...' : 'Resend OTP'}</button></div>
            </form>
          </>}
          <p className="text-center text-sm text-text-muted mt-6">Already have an account? <Link to="/login" className="text-primary hover:text-primary-light font-medium">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}

// Admin Setup - First-time admin creation
export function AdminSetup() {
  const { createAdmin, hasAdmin, state } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState('Zohaib');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('Zohaib');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // If admin already exists, redirect to login
  if (hasAdmin()) {
    navigate('/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !username || !password) {
      return;
    }
    if (password.length < 6) {
      return;
    }
    setLoading(true);
    const success = await createAdmin(name, email, username, password);
    if (success) navigate('/admin');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 hero-gradient">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="font-display font-bold text-white text-sm">ZB</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Platform Setup</h1>
          <p className="text-text-muted text-sm mt-1">Create the administrator account to get started</p>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 mb-6">
            <p className="text-xs text-warning">⚠️ This is a one-time setup. The admin account created here will have full platform access.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Admin Name" placeholder="Zohaib" value={name} onChange={e => setName(e.target.value)} icon={<User size={16} />} required />
            <Input label="Email" type="email" placeholder="admin@zyrobattle.com" value={email} onChange={e => setEmail(e.target.value)} icon={<Mail size={16} />} required />
            <Input label="Username" placeholder="Zohaib" value={username} onChange={e => setUsername(e.target.value)} icon={<User size={16} />} required />
            <Input label="Password" type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} icon={<Lock size={16} />} required />
            <Button type="submit" loading={loading} className="w-full" variant="accent">Create Admin Account</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
