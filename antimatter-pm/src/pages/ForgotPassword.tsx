import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, MailCheck, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { GravityStarsBackground } from '../components/common/GravityStarsBackground';
import iattLogo from '../assets/IATT Logo.jpeg';

export function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetTokenDev, setResetTokenDev] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', {
        identifier: identifier.trim(),
      });
      setSubmitted(true);
      if (res.data.reset_token) {
        setResetTokenDev(res.data.reset_token);
      }
      toast.success('Password reset instructions processed');
    } catch (error: any) {
      toast.error('An error occurred. Please try again.');
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
              <KeyRound className="w-5 h-5 text-indigo-400" /> Reset Password
            </h1>
            <p className="text-xs text-slate-400 mt-1">Enter your username or email address</p>
          </div>
        </div>

        {submitted ? (
          <div className="w-full text-center space-y-4 py-2">
            <div className="w-12 h-12 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
              <MailCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Request Processed</h3>
              <p className="text-xs text-slate-400 mt-1">
                If the account exists and is active, password reset instructions have been generated.
              </p>
            </div>

            {resetTokenDev && (
              <div className="p-3 bg-indigo-950/60 border border-indigo-500/30 rounded-xl text-left text-xs space-y-2">
                <p className="font-mono text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Dev Reset Link:</p>
                <Link
                  to={`/reset-password?token=${resetTokenDev}`}
                  className="block text-indigo-400 hover:underline break-all font-mono text-[11px]"
                >
                  /reset-password?token={resetTokenDev}
                </Link>
              </div>
            )}

            <button
              onClick={() => navigate('/login')}
              className="btn-secondary w-full py-2 text-xs font-semibold"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Username or Email</label>
              <input
                type="text"
                required
                placeholder="e.g. admin or dev@yourcompany.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="input text-xs w-full bg-slate-900/60 border-slate-700 text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
            </button>

            <div className="text-center pt-2">
              <Link to="/login" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
