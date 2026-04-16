import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Check, Zap, Users, Shield, ArrowRight, Lock } from 'lucide-react';

function formatDuration(value, unit) {
  if (!value || !unit) return null;
  const labels = { minutes: 'min', hours: 'h', days: 'j', weeks: 'semaine', months: 'mois', years: 'an' };
  const suffix = value > 1 && ['days', 'weeks', 'years'].includes(unit) ? 's' : '';
  return `${value} ${(labels[unit] || unit)}${suffix}`;
}

function formatPrice(cents) {
  return `${(cents / 100).toFixed(2).replace('.00', '').replace('.', ',')}€`;
}

export default function CreatorPage() {
  const router = useRouter();
  const { slug } = router.query;
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    if (!slug) return;
    api.get(`/api/creator/public/${slug}`)
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));

    const ref = router.query.ref;
    if (ref) {
      api.post('/api/affiliate/click', { code: ref }).catch(() => {});
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('affiliateCode', ref);
    }
  }, [slug]);

  async function handleSubscribe(planId) {
    setCheckoutError('');

    // Auth gate — save return URL so user comes back here after login/register
    if (!user) {
      const returnUrl = encodeURIComponent(`/c/${slug}`);
      router.push(`/login?returnTo=${returnUrl}`);
      return;
    }
    if (!user.isEmailVerified) {
      router.push('/verify-email');
      return;
    }

    setCheckoutLoading(planId);
    try {
      const affiliateCode = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('affiliateCode')) || '';
      const res = await api.post('/api/stripe/create-checkout', {
        planId,
        affiliateCode,
        returnSlug: slug,
      });
      window.location.href = res.data.url;
    } catch (err) {
      const msg = err.response?.data?.error || 'Erreur lors de la création du paiement';
      setCheckoutError(msg);
      setCheckoutLoading(null);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f13' }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f0f13', color: '#fff', gap: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Page introuvable</h1>
        <Link href="/marketplace" style={{ color: '#818cf8', textDecoration: 'none' }}>← Retour à la marketplace</Link>
      </div>
    );
  }

  const { profile, plans, canPurchase } = data;

  return (
    <>
      <Head>
        <title>{profile.displayName} — SubLaunch</title>
        <meta name="description" content={profile.bio || profile.serviceDescription || ''} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#0f0f13', color: '#fff' }}>
        {/* Nav */}
        <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              <div style={{ width: 26, height: 26, background: '#6366f1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={14} color="#fff" />
              </div>
              SubLaunch
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link href="/marketplace" style={{ color: '#9ca3af', fontSize: 13, textDecoration: 'none' }}>Marketplace</Link>
              {user ? (
                <Link href="/dashboard" style={{ color: '#9ca3af', fontSize: 13, textDecoration: 'none' }}>Mon espace</Link>
              ) : (
                <Link href={`/login?returnTo=${encodeURIComponent(`/c/${slug}`)}`} style={{ color: '#9ca3af', fontSize: 13, textDecoration: 'none' }}>Connexion</Link>
              )}
            </div>
          </div>
        </nav>

        {/* Vendor not purchasable banner */}
        {!canPurchase && (
          <div style={{ background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid rgba(245,158,11,0.2)', padding: '10px 16px', textAlign: 'center', color: '#fbbf24', fontSize: 13 }}>
            <Lock size={14} style={{ display: 'inline', marginRight: 6 }} />
            Ce vendeur n'accepte plus de nouveaux abonnements pour le moment.
          </div>
        )}

        {/* Payment canceled notification */}
        {router.query.payment === 'canceled' && (
          <div style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)', padding: '10px 16px', textAlign: 'center', color: '#fca5a5', fontSize: 13 }}>
            Paiement annulé. Vous pouvez réessayer quand vous le souhaitez.
          </div>
        )}

        {/* Hero */}
        <section style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(40px,6vw,80px) 16px 40px', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32, fontWeight: 800, color: '#818cf8' }}>
            {profile.displayName?.[0]?.toUpperCase()}
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800, marginBottom: 12 }}>{profile.displayName}</h1>
          {profile.bio && <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: '#9ca3af', maxWidth: 600, margin: '0 auto 12px', lineHeight: 1.6 }}>{profile.bio}</p>}
          {profile.serviceName && <p style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 8 }}>{profile.serviceName}</p>}
          {profile.serviceDescription && <p style={{ color: '#9ca3af', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>{profile.serviceDescription}</p>}
          {profile.benefits?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 24 }}>
              {profile.benefits.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 99, padding: '6px 14px', fontSize: 13, color: '#d1d5db' }}>
                  <Check size={13} color="#4ade80" /> {b}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Plans */}
        <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px clamp(40px,6vw,80px)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 32 }}>Choisissez votre accès</h2>

          {/* Checkout error */}
          {checkoutError && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 16px', color: '#fca5a5', fontSize: 14, marginBottom: 20, textAlign: 'center' }}>
              {checkoutError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: plans.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, maxWidth: plans.length === 1 ? 380 : '100%', margin: '0 auto' }}>
            {plans.map(plan => {
              const duration = formatDuration(plan.accessDurationValue, plan.accessDurationUnit);
              const isLoading = checkoutLoading === plan._id;
              return (
                <div key={plan._id} style={{ position: 'relative', borderRadius: 20, padding: '24px 20px', border: `1px solid ${plan.isPopular ? '#6366f1' : 'rgba(255,255,255,0.1)'}`, background: plan.isPopular ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {plan.isPopular && (
                    <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: '#6366f1', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '4px 14px', borderRadius: 99, whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                      Populaire
                    </div>
                  )}
                  <div>
                    <p style={{ color: '#9ca3af', fontWeight: 500, fontSize: 14, marginBottom: 6 }}>{plan.name}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 38, fontWeight: 800, color: '#f9fafb' }}>{formatPrice(plan.price)}</span>
                      {duration && <span style={{ color: '#6b7280', fontSize: 14 }}>/ {duration}</span>}
                    </div>
                    {plan.description && <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>{plan.description}</p>}
                  </div>

                  {plan.features?.length > 0 && (
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: 9, margin: 0, padding: 0, listStyle: 'none', flex: 1 }}>
                      {plan.features.map((f, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#d1d5db' }}>
                          <Check size={13} color="#4ade80" style={{ flexShrink: 0, marginTop: 2 }} /> {f}
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    onClick={() => handleSubscribe(plan._id)}
                    disabled={isLoading || !canPurchase}
                    style={{ width: '100%', borderRadius: 12, padding: '13px', fontWeight: 600, fontSize: 15, border: 'none', cursor: canPurchase ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'opacity 0.2s', opacity: (!canPurchase || isLoading) ? 0.6 : 1, background: plan.isPopular ? '#6366f1' : 'rgba(255,255,255,0.1)', color: '#fff' }}
                  >
                    {isLoading ? (
                      <span style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} />
                    ) : !canPurchase ? (
                      <><Lock size={15} /> Indisponible</>
                    ) : !user ? (
                      <><ArrowRight size={16} /> Se connecter pour souscrire</>
                    ) : (
                      <><ArrowRight size={16} /> S'abonner</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* No plans */}
          {plans.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
              <p>Ce vendeur n'a pas encore publié d'offres.</p>
            </div>
          )}

          {/* Trust signals */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '12px 24px', marginTop: 40, color: '#6b7280', fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={15} color="#4ade80" /> Paiement sécurisé Stripe</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={15} color="#60a5fa" /> Accès Telegram immédiat</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={15} color="#a78bfa" /> Résiliable à tout moment</div>
          </div>
        </section>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
