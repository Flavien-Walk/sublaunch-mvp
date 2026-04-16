import { useState } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import api from '../lib/api';
import { Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch {}
    setLoading(false);
  }

  return (
    <Layout title="Mot de passe oublié — SubLaunch">
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link href="/login" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8 transition-colors">
            <ArrowLeft size={16} /> Retour à la connexion
          </Link>

          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary-500/20 border border-primary-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mail size={24} className="text-primary-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Mot de passe oublié</h1>
            <p className="text-gray-400 mt-2">Entrez votre email pour recevoir un lien de réinitialisation</p>
          </div>

          <div className="card">
            {sent ? (
              <div className="text-center py-4">
                <p className="text-green-400 font-medium">✅ Email envoyé !</p>
                <p className="text-gray-400 text-sm mt-2">Si cet email existe, vous recevrez un lien dans quelques minutes.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" required placeholder="vous@exemple.com"
                    value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Envoyer le lien'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
