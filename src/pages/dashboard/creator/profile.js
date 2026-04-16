import { useEffect, useState } from 'react';
import Layout from '../../../components/Layout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../lib/api';
import Link from 'next/link';
import { ArrowLeft, Save, Eye, CheckCircle } from 'lucide-react';

export default function CreatorProfile() {
  const [form, setForm] = useState({
    displayName: '',
    slug: '',
    bio: '',
    serviceName: '',
    serviceDescription: '',
    benefits: '',
    telegramGroupId: '',
    telegramGroupName: '',
    isPublished: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get('/api/creator/profile')
      .then(res => {
        if (res.data && res.data._id) {
          setForm({
            displayName: res.data.displayName || '',
            slug: res.data.slug || '',
            bio: res.data.bio || '',
            serviceName: res.data.serviceName || '',
            serviceDescription: res.data.serviceDescription || '',
            benefits: (res.data.benefits || []).join('\n'),
            telegramGroupId: res.data.telegramGroupId || '',
            telegramGroupName: res.data.telegramGroupName || '',
            isPublished: res.data.isPublished || false,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.put('/api/creator/profile', {
        ...form,
        benefits: form.benefits.split('\n').map(b => b.trim()).filter(Boolean),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Layout title="Mon profil — SubLaunch">
        <ProtectedRoute requiredRole="creator">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </ProtectedRoute>
      </Layout>
    );
  }

  return (
    <Layout title="Mon profil vendeur — SubLaunch">
      <ProtectedRoute requiredRole="creator">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
          <div className="mb-6">
            <Link href="/dashboard/creator" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-2 transition-colors w-fit">
              <ArrowLeft size={16} /> Dashboard
            </Link>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h1 className="text-2xl font-bold text-white">Mon profil vendeur</h1>
              {form.slug && (
                <Link
                  href={`/c/${form.slug}`}
                  target="_blank"
                  className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
                >
                  <Eye size={15} /> Voir ma page
                </Link>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Identité */}
            <div className="card flex flex-col gap-4">
              <h2 className="font-semibold text-white text-sm uppercase tracking-wide text-gray-400">Identité</h2>
              <div>
                <label className="label">Nom affiché *</label>
                <input className="input" placeholder="Ex: Coccibet" required value={form.displayName}
                  onChange={e => setForm({ ...form, displayName: e.target.value })} />
              </div>
              <div>
                <label className="label">Slug URL *</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm whitespace-nowrap">sublaunch.com/c/</span>
                  <input className="input" placeholder="coccibet" required value={form.slug}
                    onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />
                </div>
                <p className="text-xs text-gray-500 mt-1">Uniquement lettres minuscules, chiffres et tirets.</p>
              </div>
              <div>
                <label className="label">Bio (courte présentation)</label>
                <textarea className="input resize-none h-20 text-sm"
                  placeholder="Décrivez votre communauté en quelques mots..."
                  value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
              </div>
            </div>

            {/* Service */}
            <div className="card flex flex-col gap-4">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-400">Service</h2>
              <div>
                <label className="label">Nom du service</label>
                <input className="input" placeholder="Ex: Alertes sportives premium" value={form.serviceName}
                  onChange={e => setForm({ ...form, serviceName: e.target.value })} />
              </div>
              <div>
                <label className="label">Description du service</label>
                <textarea className="input resize-none h-20 text-sm"
                  placeholder="Ce que vos abonnés reçoivent exactement..."
                  value={form.serviceDescription} onChange={e => setForm({ ...form, serviceDescription: e.target.value })} />
              </div>
              <div>
                <label className="label">Avantages (un par ligne)</label>
                <textarea className="input resize-none h-24 text-sm"
                  placeholder={"Alertes en temps réel\nAnalyses exclusives\nSupport privé"}
                  value={form.benefits} onChange={e => setForm({ ...form, benefits: e.target.value })} />
              </div>
            </div>

            {/* Telegram */}
            <div className="card flex flex-col gap-4">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-400">Groupe Telegram</h2>
              <div>
                <label className="label">ID du groupe Telegram</label>
                <input className="input" placeholder="Ex: -1001234567890" value={form.telegramGroupId}
                  onChange={e => setForm({ ...form, telegramGroupId: e.target.value })} />
                <p className="text-xs text-gray-500 mt-1">
                  L'ID négatif de votre groupe privé (ex: -1001234567890). Le bot doit être admin du groupe.
                </p>
              </div>
              <div>
                <label className="label">Nom du groupe (facultatif)</label>
                <input className="input" placeholder="Ex: Coccibet Premium" value={form.telegramGroupName}
                  onChange={e => setForm({ ...form, telegramGroupName: e.target.value })} />
              </div>
            </div>

            {/* Publication */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">Publier dans la marketplace</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Votre profil sera visible et vos offres achetables sur la marketplace SubLaunch.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isPublished: !form.isPublished })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isPublished ? 'bg-primary-500' : 'bg-white/20'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.isPublished ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {form.isPublished && (
                <div className="mt-3 flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle size={14} /> Votre profil sera visible dans la marketplace
                </div>
              )}
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>
            )}
            {success && (
              <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 flex items-center gap-2">
                <CheckCircle size={15} /> Profil sauvegardé avec succès !
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={16} /> Sauvegarder</>}
            </button>
          </form>
        </div>
      </ProtectedRoute>
    </Layout>
  );
}
