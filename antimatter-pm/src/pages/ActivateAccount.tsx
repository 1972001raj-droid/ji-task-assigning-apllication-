import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Eye, EyeOff, CheckCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { GravityStarsBackground } from '../components/common/GravityStarsBackground';
import iattLogo from '../assets/IATT Logo.jpeg';

export function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [activated, setActivated] = useState(false);
  const navigate = useNavigate();

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Missing invitation token in link.');
      return;
    }
    if (password.length < 12) {
      toast.error('Password must be at least 12 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/activate-account', {
        token: token.trim(),
        new_password: password,
        full_name: fullName.trim() || undefined,
      });
      setActivated(true);
      toast.success('Account activated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Activation failed or link expired');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: '#050c18',
        overflow: 'hidden',
      }}
    >
      <GravityStarsBackground
        style={{ position: 'absolute', inset: 0 }}
        starsCount={160}
        starsSize={1.5}
        starsOpacity={0.75}
        glowIntensity={9}
        movementSpeed={0.14}
        mouseInfluence={120}
        mouseGravity="attract"
        gravityStrength={65}
        starColor="#ffffff"
      />

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '440px',
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          background: 'rgba(8, 14, 28, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <img src={iattLogo} alt="IATT Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center justify-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" /> Activate Your Account
            </h1>
            <p className="text-xs text-slate-400 mt-1">Set your password to complete account activation</p>
          </div>
        </div>

        {activated ? (
          <div className="w-full text-center space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Account Ready</h3>
              <p className="text-xs text-slate-400 mt-1">Your password has been set. You may now log in.</p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary w-full py-2.5 text-xs font-semibold"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleActivate} className="w-full space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name (Optional)</label>
              <input
                type="text"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input text-xs w-full bg-slate-900/60 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Choose Password (Min 12 chars)</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={12}
                  placeholder="At least 12 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input text-xs w-full pr-9 bg-slate-900/60 border-slate-700 text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm Password</label>
              <input
                type="password"
                required
                minLength={12}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input text-xs w-full bg-slate-900/60 border-slate-700 text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set Password & Activate'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
