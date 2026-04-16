import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Zap } from 'lucide-react';

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace(user.role === 'creator' ? '/dashboard/creator' : '/dashboard');
  }, [user, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const affiliateCode = sessionStorage.getItem('affiliateCode') || router.query.ref || '';
      await register({ ...form, affiliateCode });
      router.push('/verify-email');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création du compte');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Créer un compte — SubLaunch">
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Créer votre compte</h1>
            <p className="text-gray-400 mt-2">Rejoignez SubLaunch et accédez à votre communauté</p>
          </div>

          <div className="card">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Prénom</label>
                  <input className="input" placeholder="Jean" value={form.firstName}
                    onChange={e => setForm({ ...form, firstName: e.target.value })} />
                </div>
                <div>
                  <label className="label">Nom</label>
                  <input className="input" placeholder="Dupont" value={form.lastName}
                    onChange={e => setForm({ ...form, lastName: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="label">Email *</label>
                <input className="input" type="email" placeholder="vous@exemple.com" required
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>

              <div>
                <label className="label">Mot de passe *</label>
                <div className="relative">
                  <input className="input pr-12" type={showPwd ? 'text' : 'password'}
                    placeholder="Minimum 8 caractères" required minLength={8}
                    value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                  <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    onClick={() => setShowPwd(!showPwd)}>
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>}

              <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
                {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Créer mon compte'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-400 mt-4">
              Déjà un compte ?{' '}
              <Link href="/login" className="text-primary-400 hover:text-primary-300 font-medium">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
