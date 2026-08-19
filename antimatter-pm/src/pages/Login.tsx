import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useStore } from '../store';
import { FlipText } from '../components/common/FlipText';
import { GravityStarsBackground } from '../components/common/GravityStarsBackground';
import iattLogo from '../assets/IATT Logo.jpeg';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        username_or_email: email,
        password: password,
      });
      if (response.data.csrf_token) {
        api.defaults.headers.common['X-CSRF-Token'] = response.data.csrf_token;
      }
      await useStore.getState().fetchInitialData();
      toast.success('Logged in successfully');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Always-dark login page — white stars need a dark backdrop */
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
      {/* ── Gravity Stars ── */}
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

      {/* Blue radial bloom */}
      <div
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(59,158,255,0.08) 0%, transparent 70%)',
        }}
      />
      {/* ── Login Card ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '420px',
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          background: 'rgba(8, 14, 28, 0.65)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        }}
      >
        {/* ── Header ── */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%' }}>
          {/* Black gradient logo box with IATT Logo */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(145deg, #090f1e 0%, #0d1b38 50%, #070c18 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
            }}
          >
            <img
              src={iattLogo}
              alt="IATT Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>

          {/* White FlipText title */}
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>
              <FlipText duration={3} delay={0} loop={true} style={{ color: '#ffffff' }}>
                IAT Technologies
              </FlipText>
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: '0.8125rem', color: 'rgba(122,251,255,0.50)' }}>
              Sign in to your workspace
            </p>
          </div>
        </div>

        {/* ── Cyberpunk Form Widget ── */}
        <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>

          {/* ── Scanline Input Panel ── */}
          <div className="cp-input-container">
            <div className="cp-input-content">
              <div className="cp-input-dist">
                <div className="cp-input-type">

                  {/* Email field */}
                  <div>
                    <p className="cp-label">Email or Username</p>
                    <input
                      type="text"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="you@company.com"
                      className="cp-input-is"
                      autoComplete="username"
                    />
                  </div>

                  {/* Password field + eye toggle */}
                  <div>
                    <p className="cp-label">Password</p>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="cp-input-is"
                        style={{ paddingRight: '2.2em' }}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="cp-eye-btn"
                        onClick={() => setShowPass(v => !v)}
                        aria-label={showPass ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showPass
                          ? <EyeOff style={{ width: 15, height: 15 }} />
                          : <Eye style={{ width: 15, height: 15 }} />
                        }
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={loading}
            className="cp-submit-button"
          >
            {loading
              ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite', display: 'inline-block' }} />
              : 'SIGN IN'
            }
          </button>
        </form>

        <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(122,251,255,0.28)', textAlign: 'center' }}>
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
