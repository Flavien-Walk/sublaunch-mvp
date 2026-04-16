import { useEffect, useState } from 'react';
import Layout from '../../../../components/Layout';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import api from '../../../../lib/api';
import Link from 'next/link';
import { Search, Filter } from 'lucide-react';

const STATUS_LABELS = { active: 'Actif', past_due: 'En attente', canceled: 'Annulé', unpaid: 'Impayé' };
const STATUS_COLORS = { active: 'badge-active', past_due: 'badge-pending', canceled: 'badge-inactive', unpaid: 'badge-inactive' };

export default function Subscribers() {
  const [data, setData] = useState({ data: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(p, s) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 20 });
      if (s) params.set('status', s);
      const res = await api.get(`/api/creator/subscribers?${params}`);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(page, statusFilter); }, [page, statusFilter]);

  return (
    <Layout title="Abonnés — Dashboard créateur">
      <ProtectedRoute requiredRole="creator">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Abonnés</h1>
              <p className="text-gray-400 text-sm mt-1">{data.total} abonné(s) au total</p>
            </div>
            <Link href="/dashboard/creator" className="text-sm text-gray-400 hover:text-white">← Dashboard</Link>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-6 flex-wrap">
            {['', 'active', 'past_due', 'canceled'].map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${statusFilter === s ? 'bg-primary-500 border-primary-500 text-white' : 'border-white/10 text-gray-400 hover:text-white'}`}>
                {s === '' ? 'Tous' : STATUS_LABELS[s] || s}
              </button>
            ))}
          </div>

          <div className="card">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : data.data.length === 0 ? (
              <p className="text-gray-500 text-center py-12">Aucun abonné dans cette catégorie</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-white/5">
                      <th className="pb-3 pr-4">Utilisateur</th>
                      <th className="pb-3 pr-4">Plan</th>
                      <th className="pb-3 pr-4">Statut</th>
                      <th className="pb-3 pr-4">Telegram</th>
                      <th className="pb-3 pr-4">Depuis</th>
                      <th className="pb-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.data.map(sub => (
                      <tr key={sub._id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 pr-4">
                          <p className="text-white font-medium">
                            {sub.userId?.firstName || ''} {sub.userId?.lastName || ''}
                          </p>
                          <p className="text-gray-500 text-xs">{sub.userId?.email}</p>
                        </td>
                        <td className="py-3 pr-4 text-gray-300">{sub.planId?.name}</td>
                        <td className="py-3 pr-4">
                          <span className={STATUS_COLORS[sub.status] || 'badge-pending'}>
                            {STATUS_LABELS[sub.status] || sub.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-xs text-gray-500">
                          {sub.userId?.telegramUserId ? `@${sub.userId.telegramUsername || sub.userId.telegramUserId}` : '—'}
                        </td>
                        <td className="py-3 pr-4 text-gray-500 text-xs">
                          {new Date(sub.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3">
                          <Link href={`/dashboard/creator/subscribers/${sub._id}`}
                            className="text-primary-400 hover:text-primary-300 text-xs font-medium transition-colors">
                            Voir →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {data.pages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="btn-secondary text-sm !py-2 !px-4 disabled:opacity-40">
                  Précédent
                </button>
                <span className="text-gray-400 text-sm">Page {page} / {data.pages}</span>
                <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages}
                  className="btn-secondary text-sm !py-2 !px-4 disabled:opacity-40">
                  Suivant
                </button>
              </div>
            )}
          </div>
        </div>
      </ProtectedRoute>
    </Layout>
  );
}
