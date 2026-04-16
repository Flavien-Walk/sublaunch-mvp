import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import api from '../lib/api';
import { Eye, EyeOff, Lock } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas');
    if (password.length < 8) return setError('Minimum 8 caractères');
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token: router.query.token, password });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Lien invalide ou expiré');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Nouveau mot de passe — SubLaunch">
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary-500/20 border border-primary-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock size={24} className="text-primary-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Nouveau mot de passe</h1>
          </div>
          <div className="card">
            {success ? (
              <p className="text-green-400 text-center">✅ Mot de passe modifié ! Redirection...</p>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="label">Nouveau mot de passe</label>
                  <div className="relative">
                    <input className="input pr-12" type={showPwd ? 'text' : 'password'} required minLength={8}
                      value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 8 caractères" />
                    <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                      onClick={() => setShowPwd(!showPwd)}>
                      {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Confirmer</label>
                  <input className="input" type="password" required value={confirm}
                    onChange={e => setConfirm(e.target.value)} placeholder="Répétez le mot de passe" />
                </div>
                {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>}
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Confirmer'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
