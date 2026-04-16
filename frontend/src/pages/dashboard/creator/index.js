import { useEffect, useState } from 'react';
import Layout from '../../../components/Layout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../lib/api';
import Link from 'next/link';
import { Users, TrendingUp, DollarSign, AlertTriangle, Settings, BarChart3 } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [dashRes, subRes] = await Promise.all([
          api.get('/api/creator/dashboard'),
          api.get('/api/creator/subscribers?limit=5'),
        ]);
        setStats(dashRes.data);
        setSubscribers(subRes.data.data || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
            <div className="flex gap-3">
              <Link href="/dashboard/creator/plans" className="btn-secondary text-sm !py-2 !px-4">
                <Settings size={16} /> Gérer les offres
              </Link>
              <Link href="/dashboard/creator/subscribers" className="btn-primary text-sm !py-2 !px-4">
                <Users size={16} /> Voir tous les abonnés
              </Link>
            </div>
          </div>

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
