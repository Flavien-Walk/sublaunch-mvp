import { useEffect, useState } from 'react';
import Layout from '../../../components/Layout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import Link from 'next/link';
import { Plus, Trash2, Star, ArrowLeft } from 'lucide-react';

const BLANK_PLAN = { name: '', description: '', features: '', price: '', currency: 'eur', interval: 'month', isPopular: false, sortOrder: 0 };

export default function Plans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_PLAN);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      api.get(`/api/plans?creatorId=${user.id}`).then(res => setPlans(res.data));
    }
  }, [user]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/plans', {
        ...form,
        price: Math.round(parseFloat(form.price) * 100),
        features: form.features.split('\n').map(f => f.trim()).filter(Boolean),
      });
      setPlans(p => [...p, res.data]);
      setShowForm(false);
      setForm(BLANK_PLAN);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  async function deletePlan(id) {
    if (!confirm('Désactiver cette offre ?')) return;
    await api.delete(`/api/plans/${id}`);
    setPlans(p => p.filter(plan => plan._id !== id));
  }

  return (
    <Layout title="Gérer les offres — SubLaunch">
      <ProtectedRoute requiredRole="creator">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <Link href="/dashboard/creator" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-2 transition-colors w-fit">
                <ArrowLeft size={16} /> Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-white">Mes offres</h1>
            </div>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm !py-2 !px-4">
              <Plus size={16} /> Créer une offre
            </button>
          </div>

          {/* Create form */}
          {showForm && (
            <div className="card mb-6">
              <h2 className="font-semibold text-white mb-4">Nouvelle offre</h2>
              <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nom de l'offre *</label>
                  <input className="input" placeholder="Ex: Pro" required value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Prix (€) *</label>
                  <input className="input" type="number" min="0.99" step="0.01" placeholder="9.99" required
                    value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Description</label>
                  <input className="input" placeholder="Description courte" value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Avantages (un par ligne)</label>
                  <textarea className="input resize-none h-24 text-sm" placeholder={"Accès groupe privé\nAlertes quotidiennes\nSupport email"}
                    value={form.features} onChange={e => setForm({ ...form, features: e.target.value })} />
                </div>
                <div>
                  <label className="label">Intervalles</label>
                  <select className="input" value={form.interval} onChange={e => setForm({ ...form, interval: e.target.value })}>
                    <option value="month">Mensuel</option>
                    <option value="year">Annuel</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 self-end pb-1">
                  <input type="checkbox" id="popular" className="w-4 h-4 accent-primary-500"
                    checked={form.isPopular} onChange={e => setForm({ ...form, isPopular: e.target.checked })} />
                  <label htmlFor="popular" className="text-sm text-gray-300 cursor-pointer">Marquer comme populaire</label>
                </div>
                {error && <p className="sm:col-span-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>}
                <div className="sm:col-span-2 flex gap-3">
                  <button type="submit" className="btn-primary text-sm !py-2 !px-4" disabled={loading}>
                    {loading ? 'Création...' : 'Créer l\'offre'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm !py-2 !px-4">
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Plans list */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.length === 0 && (
              <div className="sm:col-span-3 text-center text-gray-500 py-12">
                Aucune offre créée. Créez votre première offre ci-dessus.
              </div>
            )}
            {plans.map(plan => (
              <div key={plan._id} className={`card relative flex flex-col gap-3 ${plan.isPopular ? 'border-primary-500' : ''}`}>
                {plan.isPopular && (
                  <div className="absolute -top-2 right-4">
                    <Star size={14} className="text-yellow-400" />
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-white">{plan.name}</p>
                    <p className="text-primary-400 font-bold text-xl mt-1">
                      {(plan.price / 100).toFixed(2)}€<span className="text-sm font-normal text-gray-400">/{plan.interval === 'month' ? 'mois' : 'an'}</span>
                    </p>
                  </div>
                  <button onClick={() => deletePlan(plan._id)} className="text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                {plan.description && <p className="text-sm text-gray-400">{plan.description}</p>}
                {plan.features?.length > 0 && (
                  <ul className="text-sm text-gray-300 flex flex-col gap-1">
                    {plan.features.map((f, i) => <li key={i}>✓ {f}</li>)}
                  </ul>
                )}
                {plan.stripePriceId ? (
                  <p className="text-xs text-green-400">✅ Stripe configuré</p>
                ) : (
                  <p className="text-xs text-yellow-400">⚠️ Stripe non configuré</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </ProtectedRoute>
    </Layout>
  );
}
