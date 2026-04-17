import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../lib/api';
import Link from 'next/link';
import { Users, TrendingUp, DollarSign, AlertTriangle, Settings, BarChart3, UserCircle, Zap, CheckCircle, Lock } from 'lucide-react';

function StatCard({ icon, label, value, sub, color = 'text-white' }) {
  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{label}</p>
        <div className="text-gray-600">{icon}</div>
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

export default function CreatorDashboard() {
  const [stats, setStats] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [saas, setSaas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saasLoading, setSaasLoading] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const [dashRes, subRes, saasRes] = await Promise.all([
          api.get('/api/creator/dashboard'),
          api.get('/api/creator/subscribers?limit=5'),
          api.get('/api/saas/my-subscription'),
        ]);
        setStats(dashRes.data);
        setSubscribers(subRes.data.data || []);
        setSaas(saasRes.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSaasCheckout(plan) {
    setSaasLoading(plan);
    try {
      const res = await api.post('/api/saas/checkout', { plan });
      window.location.href = res.data.url;
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la création du paiement');
      setSaasLoading(null);
    }
  }

  if (loading) {
    return (
      <Layout title="Dashboard créateur — SubLaunch">
        <ProtectedRoute requiredRole="creator">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </ProtectedRoute>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard créateur — SubLaunch">
      <ProtectedRoute requiredRole="creator">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Dashboard créateur</h1>
              <p className="text-gray-400 mt-1">Vue d'ensemble de votre activité</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link href="/dashboard/creator/profile" className="btn-secondary text-sm !py-2 !px-4">
                <UserCircle size={16} /> Mon profil
              </Link>
              <Link href="/dashboard/creator/plans" className="btn-secondary text-sm !py-2 !px-4">
                <Settings size={16} /> Mes offres
              </Link>
              <Link href="/dashboard/creator/subscribers" className="btn-primary text-sm !py-2 !px-4">
                <Users size={16} /> Abonnés
              </Link>
            </div>
          </div>

          {/* Notifications paiement SaaS */}
          {router.query.saas === 'success' && (
            <div className="mb-6 flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-4 text-green-400">
              <CheckCircle size={18} /> Abonnement SubLaunch activé ! Votre profil est maintenant vendable sur la marketplace.
            </div>
          )}
          {router.query.saas === 'canceled' && (
            <div className="mb-6 flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-5 py-4 text-yellow-400">
              <AlertTriangle size={18} /> Paiement annulé. Souscrivez un plan pour être visible dans la marketplace.
            </div>
          )}

          {/* Statut abonnement SubLaunch (SaaS) */}
          {saas && !saas.isActive && (
            <div className="mb-8 card" style={{ borderColor: 'rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.06)' }}>
              <div className="flex items-center gap-3 mb-4">
                <Zap size={20} className="text-primary-400" />
                <h2 className="font-semibold text-white">Abonnement SubLaunch</h2>
                <span className="badge-inactive text-xs">Inactif</span>
              </div>
              <p className="text-gray-400 text-sm mb-5">
                Souscrivez à un plan SubLaunch pour publier votre profil et accepter des paiements.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { id: 'weekly',  price: '30€', period: '/semaine', commission: '8%', features: ['Bot Telegram automatisé', 'Dashboard CRM', 'Support email'] },
                  { id: 'monthly', price: '100€', period: '/mois',   commission: '2%', features: ['Tout du plan hebdo', 'Commission réduite 2%', 'Support prioritaire'], popular: true },
                ].map(plan => (
                  <div key={plan.id} className={`rounded-xl p-5 border flex flex-col gap-3 ${plan.popular ? 'border-primary-500 bg-primary-500/10' : 'border-white/10 bg-white/5'}`}>
                    {plan.popular && <span className="text-xs font-bold text-primary-400 uppercase tracking-wider">Recommandé</span>}
                    <div>
                      <span className="text-3xl font-bold text-white">{plan.price}</span>
                      <span className="text-gray-400 text-sm">{plan.period}</span>
                      <div className="mt-1 inline-flex items-center gap-1 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5 ml-2">
                        <span className="text-xs text-green-400">Commission {plan.commission}</span>
                      </div>
                    </div>
                    <ul className="flex flex-col gap-1.5 text-sm text-gray-300">
                      {plan.features.map((f, i) => <li key={i} className="flex items-center gap-2"><CheckCircle size={13} className="text-green-400 flex-shrink-0" />{f}</li>)}
                    </ul>
                    <button
                      onClick={() => handleSaasCheckout(plan.id)}
                      disabled={!!saasLoading}
                      className={`btn-${plan.popular ? 'primary' : 'secondary'} text-sm !py-2 mt-auto`}
                    >
                      {saasLoading === plan.id
                        ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : 'Souscrire via Stripe'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {saas?.isActive && (
            <div className="mb-6 flex items-center justify-between gap-4 bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-3">
              <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                <CheckCircle size={16} /> Abonnement SubLaunch actif — plan {saas.plan === 'weekly' ? 'hebdomadaire' : 'mensuel'} · commission {saas.commissionDisplay}
              </div>
              {saas.currentPeriodEnd && (
                <span className="text-xs text-gray-500">Expire le {new Date(saas.currentPeriodEnd).toLocaleDateString('fr-FR')}</span>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={<Users size={20} />} label="Abonnés actifs" value={stats?.active || 0} color="text-green-400" />
            <StatCard icon={<AlertTriangle size={20} />} label="En attente paiement" value={stats?.paused || 0} color="text-yellow-400" />
            <StatCard icon={<BarChart3 size={20} />} label="MRR estimé" value={`${((stats?.mrr || 0) / 100).toFixed(2)}€`} sub="Revenus récurrents mensuels" color="text-primary-400" />
            <StatCard icon={<DollarSign size={20} />} label="CA total" value={`${((stats?.totalRevenue || 0) / 100).toFixed(2)}€`} color="text-blue-400" />
          </div>

          {/* Recent subscribers */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Derniers abonnés</h2>
              <Link href="/dashboard/creator/subscribers" className="text-sm text-primary-400 hover:text-primary-300">
                Voir tout →
              </Link>
            </div>
            {subscribers.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Aucun abonné pour l'instant</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-white/5">
                      <th className="pb-3 pr-4">Utilisateur</th>
                      <th className="pb-3 pr-4">Plan</th>
                      <th className="pb-3 pr-4">Statut</th>
                      <th className="pb-3">Depuis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {subscribers.map(sub => (
                      <tr key={sub._id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 pr-4">
                          <Link href={`/dashboard/creator/subscribers/${sub._id}`} className="text-white hover:text-primary-400 transition-colors">
                            {sub.userId?.firstName} {sub.userId?.lastName || sub.userId?.email}
                          </Link>
                          <p className="text-gray-500 text-xs">{sub.userId?.email}</p>
                        </td>
                        <td className="py-3 pr-4 text-gray-300">{sub.planId?.name}</td>
                        <td className="py-3 pr-4">
                          <span className={sub.status === 'active' ? 'badge-active' : sub.status === 'past_due' ? 'badge-pending' : 'badge-inactive'}>
                            {sub.status === 'active' ? 'Actif' : sub.status === 'past_due' ? 'En attente' : 'Annulé'}
                          </span>
                        </td>
                        <td className="py-3 text-gray-500 text-xs">
                          {new Date(sub.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </ProtectedRoute>
    </Layout>
  );
}
