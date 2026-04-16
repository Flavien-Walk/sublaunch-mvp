import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../../components/Layout';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import api from '../../../../lib/api';
import Link from 'next/link';
import { Mail, MessageCircle, ArrowLeft, Send } from 'lucide-react';

export default function SubscriberDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [emailForm, setEmailForm] = useState({ subject: '', message: '' });
  const [emailSent, setEmailSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/api/creator/subscribers/${id}`)
      .then(res => {
        setData(res.data);
        setNotes(res.data.subscription?.notes || '');
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function saveNotes() {
    await api.patch(`/api/creator/subscribers/${id}/notes`, { notes });
  }

  async function sendEmail(e) {
    e.preventDefault();
    setEmailLoading(true);
    try {
      await api.post(`/api/creator/subscribers/${id}/email`, emailForm);
      setEmailSent(true);
      setEmailForm({ subject: '', message: '' });
      setTimeout(() => setEmailSent(false), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur envoi email');
    } finally {
      setEmailLoading(false);
    }
  }

  if (loading) {
    return (
      <Layout title="Fiche abonné — SubLaunch">
        <ProtectedRoute requiredRole="creator">
          <div className="flex justify-center min-h-[60vh] items-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </ProtectedRoute>
      </Layout>
    );
  }

  const sub = data?.subscription;
  const user = sub?.userId;
  const plan = sub?.planId;

  return (
    <Layout title={`${user?.email} — SubLaunch`}>
      <ProtectedRoute requiredRole="creator">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Link href="/dashboard/creator/subscribers" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors w-fit">
            <ArrowLeft size={16} /> Retour aux abonnés
          </Link>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Profile card */}
            <div className="lg:col-span-1 flex flex-col gap-4">
              <div className="card">
                <div className="w-12 h-12 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-lg font-bold text-primary-400 mb-3">
                  {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase()}
                </div>
                <h2 className="font-semibold text-white">{user?.firstName} {user?.lastName}</h2>
                <p className="text-gray-400 text-sm">{user?.email}</p>
                {user?.telegramUsername && (
                  <p className="text-blue-400 text-sm flex items-center gap-1 mt-1">
                    <MessageCircle size={14} /> @{user.telegramUsername}
                  </p>
                )}

                <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Plan</span>
                    <span className="text-white font-medium">{plan?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Statut</span>
                    <span className={sub?.status === 'active' ? 'badge-active' : 'badge-inactive'}>
                      {sub?.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Prix</span>
                    <span className="text-white">{plan ? `${(plan.price / 100).toFixed(2)}€/mois` : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Telegram</span>
                    <span className={sub?.telegramAccessActive ? 'text-green-400' : 'text-gray-500'}>
                      {sub?.telegramAccessActive ? '✅ Actif' : '—'}
                    </span>
                  </div>
                  {sub?.stripeCurrentPeriodEnd && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Échéance</span>
                      <span className="text-white text-xs">{new Date(sub.stripeCurrentPeriodEnd).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payments */}
              <div className="card">
                <h3 className="font-medium text-white mb-3 text-sm">Paiements récents</h3>
                {data?.payments?.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {data.payments.map(p => (
                      <div key={p._id} className="flex justify-between text-xs">
                        <span className={p.status === 'succeeded' ? 'text-green-400' : 'text-red-400'}>
                          {p.status === 'succeeded' ? '✅' : '❌'} {new Date(p.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="text-white">{(p.amount / 100).toFixed(2)}€</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs">Aucun paiement</p>
                )}
              </div>
            </div>

            {/* Right side */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* CRM Notes */}
              <div className="card">
                <h3 className="font-medium text-white mb-3 flex items-center gap-2">Notes CRM</h3>
                <textarea
                  className="input resize-none h-28 text-sm"
                  placeholder="Notes internes sur cet abonné..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
                <button onClick={saveNotes} className="btn-secondary text-sm !py-2 !px-4 mt-2 w-fit">
                  Sauvegarder
                </button>
              </div>

              {/* Send email */}
              <div className="card">
                <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                  <Mail size={16} className="text-primary-400" /> Envoyer un email
                </h3>
                {emailSent && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-green-400 text-sm mb-3">
                    ✅ Email envoyé !
                  </div>
                )}
                <form onSubmit={sendEmail} className="flex flex-col gap-3">
                  <div>
                    <label className="label text-xs">Sujet</label>
                    <input className="input text-sm" placeholder="Sujet de l'email" required
                      value={emailForm.subject} onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })} />
                  </div>
                  <div>
                    <label className="label text-xs">Message</label>
                    <textarea className="input resize-none h-24 text-sm" placeholder="Votre message..." required
                      value={emailForm.message} onChange={e => setEmailForm({ ...emailForm, message: e.target.value })} />
                  </div>
                  <button type="submit" className="btn-primary text-sm !py-2 !px-4 w-fit" disabled={emailLoading}>
                    <Send size={14} /> {emailLoading ? 'Envoi...' : 'Envoyer'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    </Layout>
  );
}
