import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import api from '../lib/api';

const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);
const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconLock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

function formatPrice(cents, currency = 'eur') {
  return `${(cents / 100).toFixed(2).replace('.00', '')}€`;
}

function formatDuration(value, unit) {
  if (!value || !unit) return '';
  const labels = { minutes: 'min', hours: 'h', days: 'j', weeks: 'sem', months: 'mois', years: 'an' };
  return `${value} ${labels[unit] || unit}`;
}

function PlanBadge({ plan, canPurchase }) {
  return (
    <div style={{ background: plan.isPopular ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${plan.isPopular ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 100 }}>
      <div style={{ fontWeight: 700, color: '#f9fafb', fontSize: 15 }}>{formatPrice(plan.price, plan.currency)}</div>
      <div style={{ color: '#9ca3af', fontSize: 11 }}>
        {plan.accessDurationValue ? formatDuration(plan.accessDurationValue, plan.accessDurationUnit) : (plan.interval === 'month' ? '1 mois' : plan.interval === 'year' ? '1 an' : plan.interval)}
      </div>
      {!canPurchase && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444', fontSize: 11 }}>
          <IconLock /> Indisponible
        </div>
      )}
    </div>
  );
}

function VendorCard({ profile, plans, canPurchase }) {
  const initial = (profile.displayName || '?')[0].toUpperCase();
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'border-color 0.2s, transform 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Header */}
      <div style={{ padding: '24px 24px 16px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22, color: '#fff', flexShrink: 0 }}>
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3 style={{ fontWeight: 700, color: '#f9fafb', fontSize: 17, margin: 0 }}>{profile.displayName}</h3>
            {canPurchase ? (
              <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 99, padding: '2px 8px', fontSize: 11, color: '#86efac', fontWeight: 600 }}>Actif</div>
            ) : (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 99, padding: '2px 8px', fontSize: 11, color: '#fca5a5', fontWeight: 600 }}>Indisponible</div>
            )}
          </div>
          {profile.serviceName && (
            <p style={{ color: '#7c3aed', fontSize: 13, fontWeight: 600, margin: '3px 0 0' }}>{profile.serviceName}</p>
          )}
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p style={{ margin: '0 24px 16px', color: '#9ca3af', fontSize: 13, lineHeight: 1.6 }}>
          {profile.bio.slice(0, 120)}{profile.bio.length > 120 ? '…' : ''}
        </p>
      )}

      {/* Plans */}
      {plans.length > 0 && (
        <div style={{ padding: '0 24px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {plans.map(p => <PlanBadge key={p._id} plan={p} canPurchase={canPurchase} />)}
        </div>
      )}

      {/* Benefits */}
      {profile.benefits?.length > 0 && (
        <div style={{ padding: '0 24px 16px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {profile.benefits.slice(0, 3).map((b, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 99, padding: '3px 10px', fontSize: 12, color: '#d1d5db' }}>
              <span style={{ color: '#22c55e' }}><IconCheck /></span>{b}
            </span>
          ))}
        </div>
      )}

      {/* CTA */}
      <div style={{ marginTop: 'auto', padding: '12px 24px 20px' }}>
        <Link href={`/c/${profile.slug}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 12, fontWeight: 600, fontSize: 14, textDecoration: 'none', background: canPurchase ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'rgba(255,255,255,0.06)', color: canPurchase ? '#fff' : '#6b7280', border: canPurchase ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
          {canPurchase ? <><IconArrow /> Voir les offres</> : 'Voir la page'}
        </Link>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🏪</div>
      <h3 style={{ fontWeight: 700, color: '#9ca3af', fontSize: 18, marginBottom: 8 }}>Aucun vendeur pour l'instant</h3>
      <p style={{ fontSize: 14, marginBottom: 24 }}>Soyez le premier à créer votre communauté sur SubLaunch.</p>
      <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
        Créer votre espace vendeur
      </Link>
    </div>
  );
}

export default function Marketplace() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/creator/list')
      .then(r => setVendors(r.data || []))
      .catch(() => setError('Impossible de charger la marketplace.'))
      .finally(() => setLoading(false));
  }, []);

  const activeVendors = vendors.filter(v => v.canPurchase);
  const inactiveVendors = vendors.filter(v => !v.canPurchase);

  return (
    <Layout title="Marketplace — SubLaunch">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 20px 80px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <p style={{ color: '#a78bfa', fontWeight: 600, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Marketplace</p>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800, color: '#f9fafb', marginBottom: 12 }}>
            Rejoignez une communauté privée
          </h1>
          <p style={{ color: '#9ca3af', fontSize: 'clamp(15px, 2vw, 17px)', maxWidth: 500, margin: '0 auto' }}>
            Découvrez les vendeurs actifs sur SubLaunch. Achat sécurisé, accès Telegram immédiat.
          </p>
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '16px 20px', color: '#fca5a5', textAlign: 'center', marginBottom: 24 }}>
            {error}
          </div>
        )}

        {!loading && !error && vendors.length === 0 && <EmptyState />}

        {/* Active vendors */}
        {activeVendors.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
              <h2 style={{ fontWeight: 700, color: '#f9fafb', fontSize: 16, margin: 0 }}>Vendeurs actifs ({activeVendors.length})</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {activeVendors.map((v, i) => (
                <VendorCard key={i} profile={v.profile} plans={v.plans} canPurchase={v.canPurchase} />
              ))}
            </div>
          </div>
        )}

        {/* Inactive vendors (dimmed) */}
        {inactiveVendors.length > 0 && (
          <div style={{ opacity: 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6b7280' }} />
              <h2 style={{ fontWeight: 600, color: '#6b7280', fontSize: 15, margin: 0 }}>Vendeurs temporairement indisponibles ({inactiveVendors.length})</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {inactiveVendors.map((v, i) => (
                <VendorCard key={i} profile={v.profile} plans={v.plans} canPurchase={v.canPurchase} />
              ))}
            </div>
          </div>
        )}

        {/* Footer CTA for vendors */}
        {!loading && (
          <div style={{ marginTop: 60, padding: '32px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 18, textAlign: 'center' }}>
            <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 16 }}>
              Vous voulez vendre votre propre accès Telegram ?
            </p>
            <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 12, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
              Créer votre espace vendeur <IconArrow />
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
