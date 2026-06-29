import React, { useState } from 'react';
import { useAuthStore } from '../stores';
import { Hexagon, Shield, Eye, EyeOff, Lock, Mail, ArrowRight, AlertTriangle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, verifyMFA, mfaPendingUser, setMfaPending } = useAuthStore();
  const [email, setEmail] = useState('lakshaysoni@cybercrime.gov.in');
  const [password, setPassword] = useState('SecurePass@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    await new Promise((r) => setTimeout(r, 600));

    const success = await login(email, password);
    if (!success) {
      setError('Incorrect email or password. Please verify your credentials.');
    }
    setIsLoading(false);
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    await new Promise((r) => setTimeout(r, 600));
    const success = await verifyMFA(mfaCode);
    if (!success) {
      setError('Invalid 6-digit verification code. Please check your TOTP authenticator device.');
    }
    setIsLoading(false);
  };

  const handleOAuthLogin = async (provider: string) => {
    setIsLoading(true);
    setError('');
    await new Promise((r) => setTimeout(r, 800));
    
    // Simulated credentials
    const simulatedEmail = `officer.${provider}@cybercrime.gov.in`;
    await login(simulatedEmail, 'SecurePass@2026', true);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-dark-950 grid-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-purple/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-primary-500/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[1100px] rounded-full border border-primary-500/3" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-slide-down">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-cyber-teal flex items-center justify-center shadow-glow-cyan">
            <Hexagon size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">LEATrace</h1>
          <p className="text-sm text-dark-400 mt-1">National Cybercrime Investigation Platform (I4C & CBI)</p>
        </div>

        {/* Login Card */}
        {mfaPendingUser ? (
          <div className="glass-card p-8 animate-slide-up">
            <div className="flex items-center gap-2 mb-6">
              <Shield size={16} className="text-primary-400" />
              <h2 className="text-lg font-semibold text-white">MFA Verification Required</h2>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-accent-gold/5 border border-accent-gold/20 mb-4">
              <AlertTriangle size={14} className="text-accent-gold mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-dark-300">A multi-factor authentication check is enabled for this identity. Access requires a 6-digit TOTP token.</p>
            </div>

            <div className="p-3.5 rounded-lg bg-primary-500/10 border border-primary-500/30 mb-6 text-xs text-dark-300">
              <p className="text-center">Authorized Device: **{mfaPendingUser.email}**</p>
              <p className="mt-2 text-dark-400 font-mono text-[10px] text-center">
                Enter the code from your authenticator app.
                <br />
                (Temporary Bypass Code: <span className="text-primary-400 font-bold font-mono">123456</span>)
              </p>
            </div>

            <form onSubmit={handleVerifyMfa} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5 text-center">Enter 6-Digit Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="input-field tracking-[0.75em] text-center font-bold text-lg text-primary-300 font-mono bg-dark-900 border-dark-750"
                  placeholder="000000"
                  required
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-accent-red/10 border border-accent-red/20">
                  <p className="text-xs text-accent-red">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg
                  hover:from-primary-400 hover:to-primary-500 transition-all duration-200 shadow-glow-cyan
                  disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Verify & Authorize <ArrowRight size={16} /></>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMfaPending(null, null)}
                className="w-full text-center text-xs text-dark-400 hover:text-white transition-colors pt-2"
              >
                Back to Login
              </button>
            </form>
          </div>
        ) : (
          <div className="glass-card p-8 animate-slide-up">
            <div className="flex items-center gap-2 mb-6">
              <Shield size={16} className="text-primary-400" />
              <h2 className="text-lg font-semibold text-white">Secure Authentication</h2>
            </div>

            {/* Security Notice */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-accent-gold/5 border border-accent-gold/20 mb-4">
              <AlertTriangle size={14} className="text-accent-gold mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-dark-300">This system is for authorized law enforcement personnel only. All access is logged and monitored.</p>
            </div>

            {/* Credentials Guide Card */}
            <div className="p-3.5 rounded-lg bg-primary-500/10 border border-primary-500/30 mb-6 space-y-1.5 text-xs text-dark-300">
              <span className="font-bold text-white block uppercase tracking-wider text-[10px]">Authorized Access Credentials:</span>
              <div className="flex justify-between border-b border-dark-800 pb-1">
                <span className="text-dark-400">Email:</span>
                <code className="text-primary-300 select-all font-mono">lakshaysoni@cybercrime.gov.in</code>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Password:</span>
                <code className="text-primary-300 select-all font-mono">SecurePass@2026</code>
              </div>
              <span className="text-[10px] text-dark-400 block italic pt-1 text-center">
                (You must use these exact credentials to authenticate)
              </span>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-10"
                    placeholder="officer@cybercrime.gov.in"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-10 pr-10"
                    placeholder="••••••••••"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-accent-red/10 border border-accent-red/20">
                  <p className="text-xs text-accent-red">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg
                  hover:from-primary-400 hover:to-primary-500 transition-all duration-200 shadow-glow-cyan
                  disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Access Platform <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-dark-800"></div>
              <span className="px-3 text-[10px] text-dark-500 uppercase tracking-wider">or sign in with</span>
              <div className="flex-1 border-t border-dark-800"></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleOAuthLogin('google')}
                className="py-2.5 px-4 rounded-lg bg-dark-900 border border-dark-800 hover:bg-dark-850 hover:border-dark-700 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              <button
                type="button"
                onClick={() => handleOAuthLogin('microsoft')}
                className="py-2.5 px-4 rounded-lg bg-dark-900 border border-dark-800 hover:bg-dark-850 hover:border-dark-700 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200"
              >
                <svg className="w-4 h-4" viewBox="0 0 23 23" fill="none">
                  <path d="M0 0h11v11H0z" fill="#F25022"/>
                  <path d="M12 0h11v11H12z" fill="#7FBA00"/>
                  <path d="M0 12h11v11H0z" fill="#00A4EF"/>
                  <path d="M12 12h11v11H12z" fill="#FFB900"/>
                </svg>
                Microsoft
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-dark-800 text-center">
              <p className="text-[10px] text-dark-500">Session secured with AES-256 encryption</p>
              <p className="text-[10px] text-dark-500 mt-1">NIST SP 800-53 Compliant • OWASP ASVS Level 2</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-[10px] text-dark-500">Government of India • Cyber Crime Investigation Cell</p>
          <p className="text-[10px] text-dark-600 mt-1">© 2026 LEATrace Forensics Portal. Joint Agency System (I4C, CBI, NIA, Cyber Crime Cell).</p>
        </div>
      </div>
    </div>
  );
};
