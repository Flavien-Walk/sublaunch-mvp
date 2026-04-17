import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import Link from 'next/link';
import { MessageCircle, CreditCard, Users, Copy, RefreshCw, CheckCircle, AlertTriangle, XCircle, ExternalLink, Store, ArrowRight, Link2 } from 'lucide-react';

function StatusBadge({ status }) {
  const map = {
    active: { label: 'Actif', cls: 'badge-active' },
    past_due: { label: 'Paiement en attente', cls: 'badge-pending' },
    canceled: { label: 'Annulé', cls: 'badge-inactive' },
    unpaid: { label: 'Impayé', cls: 'badge-inactive' },
    trialing: { label: 'Essai', cls: 'badge-pending' },
  };
  const s = map[status] || { label: status, cls: 'badge-pending' };
  return <span className={s.cls}>{s.label}</span>;
}

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [becomingCreator, setBecomingCreator] = useState(false);
  const [telegram, setTelegram] = useState(null);
  const [affiliate, setAffiliate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [tgLinkLoading, setTgLinkLoading] = useState(false);
  const [tgDeepLink, setTgDeepLink] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [subRes, tgRes, affRes] = await Promise.allSettled([
          api.get('/api/subscriptions/active'),
          api.get('/api/telegram/access'),
          api.get('/api/affiliate/stats'),
        ]);
        if (subRes.status === 'fulfilled') setSubscription(subRes.value.data);
        if (tgRes.status === 'fulfilled') setTelegram(tgRes.value.data);
        if (affRes.status === 'fulfilled') setAffiliate(affRes.value.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function copyAffLink() {
    navigator.clipboard.writeText(affiliate?.affiliateLink || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleBecomeCreator() {
    setBecomingCreator(true);
    try {
      await api.patch('/api/users/me/become-creator');
      await refreshUser();
      // refreshUser updates user.role → ProtectedRoute on /dashboard/creator will let them in
      window.location.href = '/dashboard/creator';
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
      setBecomingCreator(false);
    }
  }

  async function generateTgDeepLink() {
    setTgLinkLoading(true);
    try {
      const res = await api.post('/api/telegram/generate-link-token', {
        subscriptionId: subscription?._id,
      });
      setTgDeepLink(res.data.deepLink);
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    } finally {
      setTgLinkLoading(false);
    }
  }

  async function regenLink() {
    setRegenLoading(true);
    try {
      const res = await api.post('/api/telegram/regenerate-link');
      setTelegram(prev => ({ ...prev, inviteLink: res.data.inviteLink, inviteLinkExpiry: res.data.expiresAt }));
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    } finally {
      setRegenLoading(false);
    }
  }

  if (loading) {
    return (
      <Layout title="Mon espace — SubLaunch">
        <ProtectedRoute>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </ProtectedRoute>
      </Layout>
    );
  }

  return (
    <Layout title="Mon espace — SubLaunch">
      <ProtectedRoute>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Bonjour, {user?.firstName || user?.email} 👋</h1>
            <p className="text-gray-400 mt-1">
              {!user?.isEmailVerified && (
                <span className="text-yellow-400">⚠️ Email non vérifié — <Link href="/verify-email" className="underline hover:text-yellow-300">Vérifier maintenant</Link></span>
              )}
            </p>
          </div>

          {/* Abonnement */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CreditCard size={20} className="text-primary-400" /> Mon abonnement
            </h2>
            {subscription ? (
              <div className="card">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <p className="font-semibold text-white text-lg">{subscription.planId?.name}</p>
                    <p className="text-gray-400 text-sm mt-1">
                      {(subscription.planId?.price / 100).toFixed(2)}€/{subscription.planId?.interval === 'month' ? 'mois' : 'an'}
                    </p>
                    {subscription.stripeCurrentPeriodEnd && (
                      <p className="text-gray-500 text-xs mt-1">
                        Prochaine échéance : {new Date(subscription.stripeCurrentPeriodEnd).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={subscription.status} />
                </div>
                {subscription.canceledAt && !subscription.expiredAt && (
                  <p className="text-yellow-400 text-sm mt-3">⚠️ Abonnement annulé — accès actif jusqu'à la fin de la période</p>
                )}
              </div>
            ) : (
              <div className="card text-center py-8">
                <p className="text-gray-400 mb-4">Vous n'avez pas encore d'abonnement actif.</p>
                <Link href="/" className="btn-primary mx-auto w-fit">Voir les offres</Link>
              </div>
            )}
          </section>

          {/* Accès Telegram */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MessageCircle size={20} className="text-blue-400" /> Accès Telegram
            </h2>
            <div className="card">
              {telegram?.hasAccess && telegram?.inviteLink ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-400">Votre lien d'accès (usage unique, 24h)</p>
                    <button onClick={regenLink} disabled={regenLoading}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                      <RefreshCw size={14} className={regenLoading ? 'animate-spin' : ''} />
                      Regénérer
                    </button>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 flex items-center justify-between gap-3 break-all">
                    <span className="text-sm text-primary-400 font-mono">{telegram.inviteLink}</span>
                    <a href={telegram.inviteLink} target="_blank" rel="noopener noreferrer"
                      className="text-primary-400 hover:text-primary-300 flex-shrink-0">
                      <ExternalLink size={18} />
                    </a>
                  </div>
                  {telegram.inviteLinkExpiry && (
                    <p className="text-gray-500 text-xs mt-2">
                      Expire le {new Date(telegram.inviteLinkExpiry).toLocaleString('fr-FR')}
                    </p>
                  )}

                  {/* Account linking — needed for automatic removal at expiry */}
                  {!telegram.telegramLinked && (
                    <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                      <p className="text-xs text-blue-300 mb-2 flex items-center gap-1.5">
                        <Link2 size={12} /> Liez votre compte Telegram pour que le bot puisse vous gérer automatiquement
                      </p>
                      {tgDeepLink ? (
                        <a href={tgDeepLink} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 underline break-all">
                          {tgDeepLink}
                        </a>
                      ) : (
                        <button onClick={generateTgDeepLink} disabled={tgLinkLoading}
                          className="btn-secondary text-xs !py-1.5 !px-3">
                          {tgLinkLoading
                            ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                            : <><Link2 size={12} /> Générer le lien de liaison</>}
                        </button>
                      )}
                    </div>
                  )}
                  {telegram.telegramLinked && (
                    <p className="text-green-400 text-xs mt-3 flex items-center gap-1">
                      <CheckCircle size={12} /> Compte Telegram lié — suppression automatique active
                    </p>
                  )}
                </div>
              ) : subscription?.status === 'active' ? (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm mb-3">Aucun lien actif. Générez votre accès Telegram.</p>
                  <button onClick={regenLink} disabled={regenLoading} className="btn-primary mx-auto w-fit">
                    <MessageCircle size={16} /> Obtenir mon accès
                  </button>
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">
                  Un abonnement actif est requis pour accéder au groupe Telegram.
                </p>
              )}
            </div>
          </section>

          {/* Devenir vendeur — uniquement pour les clients */}
          {user?.role !== 'creator' && (
            <section className="mb-6">
              <div className="card" style={{ background: 'rgba(124,58,237,0.06)', borderColor: 'rgba(124,58,237,0.2)' }}>
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <Store size={20} className="text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-white">Vous voulez vendre votre propre communauté ?</h2>
                    <p className="text-gray-400 text-sm mt-1">
                      Passez en mode vendeur pour créer vos offres, connecter votre groupe Telegram et être visible sur la marketplace.
                    </p>
                  </div>
                  <button
                    onClick={handleBecomeCreator}
                    disabled={becomingCreator}
                    className="btn-primary text-sm !py-2 !px-4 flex-shrink-0"
                  >
                    {becomingCreator
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <><ArrowRight size={15} /> Devenir vendeur</>
                    }
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Affiliation */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users size={20} className="text-green-400" /> Mon programme d'affiliation
            </h2>
            <div className="card">
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-white">{affiliate?.stats?.totalConversions || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">Conversions</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-white">{affiliate?.stats?.totalSignups || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">Inscriptions</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">{((affiliate?.stats?.validatedCommissions || 0) / 100).toFixed(2)}€</p>
                  <p className="text-xs text-gray-400 mt-1">Commissions validées</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-2">Votre lien d'affiliation</p>
                <div className="bg-white/5 rounded-xl p-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-300 font-mono truncate">{affiliate?.affiliateLink}</span>
                  <button onClick={copyAffLink} className="text-gray-400 hover:text-white flex-shrink-0 transition-colors">
                    {copied ? <CheckCircle size={18} className="text-green-400" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </ProtectedRoute>
    </Layout>
  );
}
