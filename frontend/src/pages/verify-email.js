import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Mail, CheckCircle } from 'lucide-react';

export default function VerifyEmail() {
  const [codes, setCodes] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resent, setResent] = useState(false);
  const inputs = useRef([]);
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  function handleInput(index, value) {
    if (!/^\d*$/.test(value)) return;
    const newCodes = [...codes];
    newCodes[index] = value.slice(-1);
    setCodes(newCodes);
    if (value && index < 5) inputs.current[index + 1]?.focus();
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !codes[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCodes(pasted.split(''));
      inputs.current[5]?.focus();
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const code = codes.join('');
    if (code.length !== 6) return setError('Entrez le code à 6 chiffres');
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/verify-email', { code });
      setSuccess(true);
      await refreshUser();
      setTimeout(() => router.push(user?.role === 'creator' ? '/dashboard/creator' : '/dashboard'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Code invalide ou expiré');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      await api.post('/api/auth/resend-verification');
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch {}
  }

  if (success) {
    return (
      <Layout title="Email vérifié">
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="text-center">
            <CheckCircle size={64} className="text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white">Email vérifié !</h2>
            <p className="text-gray-400 mt-2">Redirection en cours...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Vérifier votre email — SubLaunch">
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-500/20 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mail size={24} className="text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Vérifiez votre email</h1>
            <p className="text-gray-400 mt-2">
              Nous avons envoyé un code à 6 chiffres à<br />
              <span className="text-white font-medium">{user?.email}</span>
            </p>
          </div>

          <div className="card">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                {codes.map((c, i) => (
                  <input
                    key={i}
                    ref={el => inputs.current[i] = el}
                    className="w-11 h-14 text-center text-xl font-bold bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-all"
                    maxLength={1}
                    value={c}
                    onChange={e => handleInput(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    inputMode="numeric"
                    autoComplete="off"
                  />
                ))}
              </div>

              {error && <p className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>}

              <button type="submit" className="btn-primary w-full" disabled={loading || codes.join('').length !== 6}>
                {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Vérifier'}
              </button>
            </form>

            <div className="text-center mt-4">
              {resent ? (
                <p className="text-green-400 text-sm">✅ Code renvoyé !</p>
              ) : (
                <button onClick={handleResend} className="text-sm text-gray-400 hover:text-primary-400 transition-colors">
                  Renvoyer le code
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
