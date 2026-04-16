import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import api from '../lib/api';

const IconCheck = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconArrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);
const IconZap = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconTrending = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
  </svg>
);
const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconStar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

function StepNumber({ n }) {
  return (
    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: '#fff', flexShrink: 0 }}>
      {n}
    </div>
  );
}

function Testimonial({ name, handle, text, initial }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {[...Array(5)].map((_, i) => <IconStar key={i} />)}
      </div>
      <p style={{ color: '#d1d5db', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{text}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff' }}>{initial}</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#f9fafb' }}>{name}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{handle}</div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const ref = router.query.ref;
    if (ref) {
      api.post('/api/affiliate/click', { code: ref }).catch(() => {});
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('affiliateCode', ref);
    }
  }, [router.query.ref]);

  const features = [
    { icon: <IconZap />, color: '#a78bfa', bg: 'rgba(124,58,237,0.15)', title: 'Paiements Stripe', desc: 'Abonnements récurrents, factures automatiques, portail client intégré.' },
    { icon: <IconShield />, color: '#34d399', bg: 'rgba(16,185,129,0.12)', title: 'Accès sécurisé', desc: 'Lien Telegram à usage unique par acheteur. Révoqué automatiquement à expiration.' },
    { icon: <IconTrending />, color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', title: 'CRM vendeur', desc: 'MRR, churn, ARPU, conversion — un cockpit business complet.' },
    { icon: <IconUsers />, color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', title: 'Affiliation intégrée', desc: 'Programme de parrainage automatique. Vos clients deviennent vos ambassadeurs.' },
  ];

  const steps = [
    { title: 'Créez votre compte vendeur', desc: 'Inscription en 2 minutes. Connectez votre bot Telegram depuis le dashboard.' },
    { title: 'Configurez vos offres', desc: 'Durée, prix, description. Votre page vendeur est générée automatiquement.' },
    { title: 'Vendez et automatisez', desc: 'Les clients paient → reçoivent l\'accès → sont retirés automatiquement à expiration.' },
  ];

  const testimonials = [
    { name: 'Thomas M.', handle: '@thomastrading', initial: 'T', text: 'J\'ai lancé mon canal de signaux en une journée. Les accès Telegram sont gérés automatiquement, je n\'ai rien à faire. 340€ de MRR le premier mois.' },
    { name: 'Sébastien R.', handle: '@sebfoot', initial: 'S', text: 'Avant je gérais mes accès à la main sur Excel. Maintenant tout est automatique. Le bot retire les membres expirés sans que j\'intervienne.' },
    { name: 'Karim B.', handle: '@karimcrypto', initial: 'K', text: 'Interface clean, Stripe, bot Telegram — exactement ce qu\'il me fallait pour lancer ma communauté crypto privée.' },
  ];

  return (
    <Layout title="SubLaunch — Monétisez votre groupe Telegram privé">
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .anim-1{animation:fadeUp 0.5s ease forwards;}
        .anim-2{animation:fadeUp 0.5s ease 0.1s forwards;opacity:0;}
        .anim-3{animation:fadeUp 0.5s ease 0.2s forwards;opacity:0;}
        .anim-4{animation:fadeUp 0.5s ease 0.3s forwards;opacity:0;}
        .fcard{transition:transform 0.2s,border-color 0.2s;}
        .fcard:hover{transform:translateY(-3px);border-color:rgba(124,58,237,0.3)!important;}
      `}</style>

      {/* ── HERO ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(60px,8vw,100px) 20px 60px', textAlign: 'center' }}>
        <div className="anim-1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 99, padding: '6px 16px', marginBottom: 28, color: '#a78bfa', fontSize: 13, fontWeight: 500 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#a78bfa', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          Infrastructure SaaS pour groupes Telegram payants
        </div>

        <h1 className="anim-2" style={{ fontSize: 'clamp(34px, 6vw, 64px)', fontWeight: 800, color: '#f9fafb', lineHeight: 1.1, marginBottom: 20, letterSpacing: '-0.02em' }}>
          Vendez l'accès à votre groupe Telegram.<br />
          <span style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Automatiquement.
          </span>
        </h1>

        <p className="anim-3" style={{ fontSize: 'clamp(16px, 2vw, 18px)', color: '#9ca3af', maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.65 }}>
          Stripe intégré, bot Telegram automatique, CRM vendeur complet.
          Lancez votre communauté privée payante en moins d'une heure.
        </p>

        <div className="anim-4" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 14, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', fontWeight: 600, fontSize: 16, textDecoration: 'none', boxShadow: '0 8px 32px rgba(124,58,237,0.35)' }}>
            Démarrer gratuitement <IconArrow />
          </Link>
          <Link href="/marketplace" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#d1d5db', fontWeight: 600, fontSize: 16, textDecoration: 'none' }}>
            Explorer les offres <IconArrow />
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 36, flexWrap: 'wrap' }}>
          {['Paiements Stripe sécurisés', 'Setup en moins d\'1h', 'Résiliable à tout moment'].map((t, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 13 }}>
              <span style={{ color: '#22c55e' }}><IconCheck /></span>{t}
            </span>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 20px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <p style={{ color: '#a78bfa', fontWeight: 600, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Simple par design</p>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 800, color: '#f9fafb', marginBottom: 10 }}>Opérationnel en 3 étapes</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {steps.map((step, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '26px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <StepNumber n={i + 1} />
                <h3 style={{ fontWeight: 700, color: '#f9fafb', fontSize: 15, margin: 0, lineHeight: 1.3 }}>{step.title}</h3>
              </div>
              <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
          {features.map((f, i) => (
            <div key={i} className="fcard" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, color: '#f9fafb', fontSize: 15, margin: 0 }}>{f.title}</h3>
              <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING VENDOR ── */}
      <section id="tarifs" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <p style={{ color: '#a78bfa', fontWeight: 600, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Tarifs vendeur</p>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 800, color: '#f9fafb', marginBottom: 10 }}>Choisissez votre plan</h2>
          <p style={{ color: '#9ca3af', fontSize: 15 }}>Plus votre volume augmente, plus le mensuel est rentable.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, maxWidth: 680, margin: '0 auto' }}>
          {[
            { name: 'Hebdomadaire', price: '30', period: 'semaine', commission: '8%', highlighted: false, features: ['Bot Telegram automatisé', 'Dashboard CRM complet', 'Accès illimité', 'Support email'] },
            { name: 'Mensuel', price: '100', period: 'mois', commission: '2%', highlighted: true, badge: 'Recommandé', features: ['Tout du plan hebdo', 'Commission réduite 2%', 'Export CSV illimité', 'Support prioritaire'] },
          ].map((plan, i) => (
            <div key={i} style={{ position: 'relative', background: plan.highlighted ? 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(168,85,247,0.08))' : 'rgba(255,255,255,0.03)', border: `1px solid ${plan.highlighted ? '#7c3aed' : 'rgba(255,255,255,0.08)'}`, borderRadius: 20, padding: '30px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {plan.badge && <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', fontWeight: 700, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '4px 14px', borderRadius: 99, whiteSpace: 'nowrap' }}>{plan.badge}</div>}
              <div>
                <p style={{ color: '#9ca3af', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>{plan.name}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 40, fontWeight: 800, color: '#f9fafb' }}>{plan.price}€</span>
                  <span style={{ color: '#6b7280', fontSize: 14 }}>/{plan.period}</span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 99, padding: '3px 10px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                  <span style={{ fontSize: 12, color: '#86efac', fontWeight: 500 }}>Commission {plan.commission}</span>
                </div>
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: 0, padding: 0, listStyle: 'none' }}>
                {plan.features.map((f, j) => (
                  <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#d1d5db', fontSize: 14 }}>
                    <span style={{ color: '#22c55e', flexShrink: 0 }}><IconCheck /></span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/register" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 24px', borderRadius: 12, fontWeight: 600, fontSize: 15, textDecoration: 'none', background: plan.highlighted ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'transparent', color: plan.highlighted ? '#fff' : '#a78bfa', border: plan.highlighted ? 'none' : '1px solid rgba(124,58,237,0.4)' }}>
                Démarrer <IconArrow />
              </Link>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 13, marginTop: 16 }}>
          Exemple : avec 500€/mois de ventes, le plan mensuel vous économise 30€ vs hebdomadaire.
        </p>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 800, color: '#f9fafb', marginBottom: 8 }}>Ils ont lancé leur communauté</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
          {testimonials.map((t, i) => <Testimonial key={i} {...t} />)}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 80px' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(168,85,247,0.08))', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 24, padding: 'clamp(32px, 6vw, 60px)', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 42px)', fontWeight: 800, color: '#f9fafb', marginBottom: 12 }}>Prêt à lancer votre communauté ?</h2>
          <p style={{ color: '#9ca3af', fontSize: 16, maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.6 }}>Créez votre compte en 2 minutes. Aucune carte bancaire requise.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 14, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', fontWeight: 600, fontSize: 16, textDecoration: 'none', boxShadow: '0 8px 32px rgba(124,58,237,0.35)' }}>
              Commencer gratuitement <IconArrow />
            </Link>
            <Link href="/marketplace" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#d1d5db', fontWeight: 600, fontSize: 16, textDecoration: 'none' }}>
              Explorer les offres
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
