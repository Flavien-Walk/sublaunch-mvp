import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Check, Zap, Users, Shield, ArrowRight } from 'lucide-react';

export default function CreatorPage() {
  const router = useRouter();
  const { slug } = router.query;
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  useEffect(() => {
    if (!slug) return;
    api.get(`/api/creator/public/${slug}`)
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));

    // Track affiliate
    const ref = router.query.ref;
    if (ref) {
      api.post('/api/affiliate/click', { code: ref }).catch(() => {});
      sessionStorage.setItem('affiliateCode', ref);
    }
  }, [slug]);

  async function handleSubscribe(planId) {
    if (!user) return router.push(`/register?ref=${router.query.ref || ''}`);
    if (!user.isEmailVerified) return router.push('/verify-email');
    setCheckoutLoading(planId);
    try {
      const affiliateCode = sessionStorage.getItem('affiliateCode') || '';
      const res = await api.post('/api/stripe/create-checkout', { planId, affiliateCode });
      window.location.href = res.data.url;
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors du paiement');
      setCheckoutLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f13]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f0f13] text-white gap-4">
        <h1 className="text-2xl font-bold">Page introuvable</h1>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300">Retour à l'accueil</Link>
      </div>
    );
  }

  const { profile, plans } = data;

  return (
    <>
      <Head>
        <title>{profile.displayName} — SubLaunch</title>
        <meta name="description" content={profile.bio || profile.serviceDescription} />
      </Head>
      <div className="min-h-screen bg-[#0f0f13] text-white">
        {/* Nav minimal */}
        <nav className="border-b border-white/10 bg-black/40 backdrop-blur-xl">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-sm">
              <div className="w-6 h-6 bg-indigo-500 rounded flex items-center justify-center"><Zap size={13} /></div>
              SubLaunch
            </Link>
            {user ? (
              <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">Mon espace</Link>
            ) : (
              <Link href="/login" className="text-sm text-gray-400 hover:text-white">Connexion</Link>
            )}
          </div>
        </nav>

        {/* Hero creator */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-indigo-400">
            {profile.displayName?.[0]?.toUpperCase()}
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">{profile.displayName}</h1>
          {profile.bio && <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-4">{profile.bio}</p>}
          {profile.serviceName && (
            <p className="text-2xl font-semibold text-white mt-6 mb-2">{profile.serviceName}</p>
          )}
          {profile.serviceDescription && (
            <p className="text-gray-400 max-w-2xl mx-auto">{profile.serviceDescription}</p>
          )}

          {profile.benefits?.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              {profile.benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-gray-300">
                  <Check size={14} className="text-green-400" /> {b}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Plans */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
          <h2 className="text-2xl font-bold text-center text-white mb-10">Choisissez votre accès</h2>
          <div className={`grid gap-6 ${plans.length === 1 ? 'max-w-sm mx-auto' : plans.length === 2 ? 'sm:grid-cols-2 max-w-2xl mx-auto' : 'sm:grid-cols-3'}`}>
            {plans.map(plan => (
              <div key={plan._id}
                className={`rounded-2xl p-6 border flex flex-col gap-4 relative ${plan.isPopular ? 'bg-indigo-500/10 border-indigo-500' : 'bg-white/5 border-white/10'}`}>
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                    Populaire
                  </div>
                )}
                <div>
                  <p className="text-gray-400 font-medium text-sm">{plan.name}</p>
                  <p className="text-4xl font-bold text-white mt-2">
                    {(plan.price / 100).toFixed(2).replace('.', ',')}€
                    <span className="text-base font-normal text-gray-400">/{plan.interval === 'month' ? 'mois' : 'an'}</span>
                  </p>
                  {plan.description && <p className="text-gray-400 text-sm mt-2">{plan.description}</p>}
                </div>

                {plan.features?.length > 0 && (
                  <ul className="flex flex-col gap-2 flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <Check size={14} className="text-green-400 mt-0.5 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  onClick={() => handleSubscribe(plan._id)}
                  disabled={checkoutLoading === plan._id}
                  className={`w-full rounded-xl py-3 font-medium transition-all flex items-center justify-center gap-2 ${
                    plan.isPopular
                      ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                  } disabled:opacity-50`}>
                  {checkoutLoading === plan._id ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><ArrowRight size={16} /> {user ? 'S\'abonner' : 'Commencer'}</>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-gray-500">
            <div className="flex items-center gap-2"><Shield size={16} className="text-green-500" /> Paiement sécurisé Stripe</div>
            <div className="flex items-center gap-2"><Zap size={16} className="text-blue-500" /> Accès immédiat</div>
            <div className="flex items-center gap-2"><Users size={16} className="text-purple-500" /> Résiliable à tout moment</div>
          </div>
        </section>
      </div>
    </>
  );
}
