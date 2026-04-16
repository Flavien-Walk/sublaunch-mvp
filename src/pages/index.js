import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

// ── Icons inline (svg) to avoid over-depending on lucide classes ──────────────
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
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconArrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);
const IconStar = ({ filled = true }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepNumber({ n }) {
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%',
      background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: 16, color: '#fff', flexShrink: 0,
    }}>{n}</div>
  );
}

// ── Testimonial card ───────────────────────────────────────────────────────────
function Testimonial({ name, handle, text, avatar }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {[...Array(5)].map((_, i) => <IconStar key={i} />)}
      </div>
      <p style={{ color: '#d1d5db', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{text}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 14, color: '#fff',
        }}>{avatar}</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#f9fafb' }}>{name}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{handle}</div>
        </div>
      </div>
    </div>
  );
}

// ── Vendor pricing card ────────────────────────────────────────────────────────
function VendorPlan({ name, price, period, commission, features, highlighted, badge }) {
  return (
    <div style={{
      position: 'relative',
      background: highlighted ? 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(168,85,247,0.08))' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${highlighted ? '#7c3aed' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 20, padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      {badge && (
        <div style={{
          position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          color: '#fff', fontWeight: 700, fontSize: 11, letterSpacing: '0.05em',
          textTransform: 'uppercase', padding: '4px 14px', borderRadius: 99,
          whiteSpace: 'nowrap',
        }}>{badge}</div>
      )}
      <div>
        <p style={{ color: '#9ca3af', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>{name}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 40, fontWeight: 800, color: '#f9fafb' }}>{price}€</span>
          <span style={{ color: '#6b7280', fontSize: 14 }}>/{period}</span>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8,
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 99, padding: '3px 10px',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: 12, color: '#86efac', fontWeight: 500 }}>Commission {commission}</span>
        </div>
      </div>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: 0, padding: 0, listStyle: 'none' }}>
        {features.map((f, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#d1d5db', fontSize: 14 }}>
            <span style={{ color: '#22c55e', flexShrink: 0 }}><IconCheck /></span>{f}
          </li>
        ))}
      </ul>
      <Link href="/register" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '13px 24px', borderRadius: 12, fontWeight: 600, fontSize: 15,
        textDecoration: 'none', transition: 'all 0.2s',
        background: highlighted ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'transparent',
        color: highlighted ? '#fff' : '#a78bfa',
        border: highlighted ? 'none' : '1px solid rgba(124,58,237,0.4)',
      }}>
        Démarrer <IconArrow />
      </Link>
    </div>
  );
}

// ── Free test pack component ───────────────────────────────────────────────────
function TestPack({ user }) {
  const [status, setStatus] = useState('idle'); // idle | loading | active | expired | error
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [telegramLink, setTelegramLink] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const intervalRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (status === 'active' && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setStatus('expired');
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [status]);

  // Check if already has active test
  useEffect(() => {
    if (!user) return;
    api.get('/api/test/status').then(r => {
      if (r.data.active) {
        setStatus('active');
        setSecondsLeft(r.data.secondsLeft || 0);
        setTelegramLink(r.data.telegramLink || '');
      }
    }).catch(() => {});
  }, [user]);

  async function handleClaim() {
    if (!user) { router.push('/register'); return; }
    setStatus('loading');
    setErrorMsg('');
    try {
      const r = await api.post('/api/test/free-access');
      setStatus('active');
      setSecondsLeft(60);
      setTelegramLink(r.data.telegramLink || '');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.response?.data?.error || 'Erreur lors de la création du pack test');
    }
  }

  return (
    <div style={{
      background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)',
      borderRadius: 20, padding: '28px 32px', maxWidth: 480, margin: '0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          background: 'rgba(124,58,237,0.2)', borderRadius: 10, padding: 8, color: '#a78bfa',
        }}><IconZap /></div>
        <div>
          <p style={{ fontWeight: 700, color: '#f9fafb', fontSize: 16, margin: 0 }}>Pack Test Gratuit</p>
          <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>1 minute d'accès · Aucune carte requise</p>
        </div>
        <div style={{
          marginLeft: 'auto', background: 'rgba(34,197,94,0.12)',
          border: '1px solid rgba(34,197,94,0.25)', borderRadius: 99,
          padding: '3px 10px', fontSize: 12, color: '#86efac', fontWeight: 600,
        }}>GRATUIT</div>
      </div>

      {status === 'idle' && (
        <button onClick={handleClaim} style={{
          width: '100%', padding: '13px', borderRadius: 12,
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          color: '#fff', fontWeight: 600, fontSize: 15, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          Tester maintenant <IconArrow />
        </button>
      )}

      {status === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '13px', color: '#a78bfa' }}>
          <span style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #7c3aed', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', display: 'block' }} />
          Préparation de votre accès...
        </div>
      )}

      {status === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 12, padding: '12px 16px',
          }}>
            <span style={{ color: '#22c55e' }}><IconCheck /></span>
            <span style={{ color: '#86efac', fontWeight: 600 }}>Accès actif</span>
            <span style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
              <IconClock /> {secondsLeft}s
            </span>
          </div>
          {telegramLink && (
            <a href={telegramLink} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '13px', borderRadius: 12,
              background: 'linear-gradient(135deg, #0088cc, #0099dd)',
              color: '#fff', fontWeight: 600, fontSize: 15, textDecoration: 'none',
            }}>
              Rejoindre le groupe Telegram <IconArrow />
            </a>
          )}
          <div style={{
            height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: 'linear-gradient(90deg, #22c55e, #16a34a)',
              width: `${(secondsLeft / 60) * 100}%`, transition: 'width 1s linear',
            }} />
          </div>
        </div>
      )}

      {status === 'expired' && (
        <div style={{
          padding: '12px 16px', borderRadius: 12,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#fca5a5', fontSize: 14, textAlign: 'center',
        }}>
          Accès expiré — Vous avez été retiré du groupe. <br />
          <Link href="/register" style={{ color: '#f87171', fontWeight: 600 }}>Souscrire pour un accès complet →</Link>
        </div>
      )}

      {status === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: 14 }}>
            {errorMsg}
          </div>
          <button onClick={() => setStatus('idle')} style={{
            padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,0.06)',
            color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 14,
          }}>Réessayer</button>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const ref = router.query.ref;
    if (ref) {
      api.post('/api/affiliate/click', { code: ref }).catch(() => {});
      sessionStorage.setItem('affiliateCode', ref);
    }
  }, [router.query.ref]);

  const features = [
    { icon: <IconZap />, color: '#a78bfa', bg: 'rgba(124,58,237,0.15)', title: 'Paiement Stripe', desc: 'Abonnements récurrents automatiques. Factures générées, renouvellements gérés.' },
    { icon: <IconShield />, color: '#34d399', bg: 'rgba(16,185,129,0.12)', title: 'Accès sécurisé', desc: 'Lien Telegram unique à usage unique par acheteur. Révoqué automatiquement.' },
    { icon: <IconTrending />, color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', title: 'CRM intégré', desc: 'MRR, churn, ARPU, conversion — tout votre business en un dashboard.' },
    { icon: <IconUsers />, color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', title: 'Affiliation', desc: 'Programme de parrainage intégré. Vos clients deviennent vos ambassadeurs.' },
  ];

  const steps = [
    { title: 'Créez votre compte vendeur', desc: 'Inscription en 2 minutes. Aucune carte bancaire requise pour démarrer.' },
    { title: 'Connectez votre groupe Telegram', desc: 'Ajoutez notre bot à votre groupe privé, on vérifie les permissions automatiquement.' },
    { title: 'Publiez vos offres', desc: 'Définissez vos plans, leurs durées, leurs prix. Votre page est en ligne en 5 minutes.' },
  ];

  const testimonials = [
    { name: 'Thomas M.', handle: '@thomastrading', avatar: 'T', text: 'J\'ai lancé mon canal de signaux en une journée. Les accès Telegram sont gérés automatiquement, je n\'ai rien à faire. 340€ de MRR le premier mois.' },
    { name: 'Sébastien R.', handle: '@sebfoot', avatar: 'S', text: 'Avant je gérais mes accès à la main sur Excel. Maintenant tout est automatique. Le bot retire les membres expirés sans que j\'intervienne.' },
    { name: 'Karim B.', handle: '@karimcrypto', avatar: 'K', text: 'Interface clean, paiement Stripe, bot Telegram qui fonctionne — exactement ce qu\'il me fallait pour lancer ma communauté crypto privée.' },
  ];

  return (
    <Layout title="SubLaunch — Monétisez votre groupe Telegram privé">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-glow { 0%,100%{box-shadow:0 0 0 0 rgba(124,58,237,0);} 50%{box-shadow:0 0 0 16px rgba(124,58,237,0);} }
        .hero-badge { animation: fadeUp 0.5s ease forwards; }
        .hero-title { animation: fadeUp 0.6s ease 0.1s forwards; opacity:0; }
        .hero-desc { animation: fadeUp 0.6s ease 0.2s forwards; opacity:0; }
        .hero-ctas { animation: fadeUp 0.6s ease 0.3s forwards; opacity:0; }
        .feature-card:hover { transform: translateY(-4px); border-color: rgba(124,58,237,0.3) !important; }
        .feature-card { transition: all 0.25s ease; }
        .step-card:hover { background: rgba(124,58,237,0.06) !important; }
        .step-card { transition: background 0.2s ease; }
      `}</style>

      {/* ── HERO ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
        <div className="hero-badge" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)',
          borderRadius: 99, padding: '6px 16px', marginBottom: 28,
          color: '#a78bfa', fontSize: 13, fontWeight: 500,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', display: 'inline-block', animation: 'pulse-glow 2s infinite' }} />
          Infrastructure SaaS pour groupes Telegram payants
        </div>

        <h1 className="hero-title" style={{
          fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, color: '#f9fafb',
          lineHeight: 1.1, marginBottom: 20, letterSpacing: '-0.02em',
        }}>
          Vendez votre accès Telegram.<br />
          <span style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Automatiquement.
          </span>
        </h1>

        <p className="hero-desc" style={{
          fontSize: 18, color: '#9ca3af', maxWidth: 580, margin: '0 auto 36px',
          lineHeight: 1.65,
        }}>
          Stripe intégré, bot Telegram automatique, accès unique sécurisé, CRM vendeur.
          Lancez votre communauté privée payante en moins d'une heure.
        </p>

        <div className="hero-ctas" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 28px', borderRadius: 14,
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            color: '#fff', fontWeight: 600, fontSize: 16, textDecoration: 'none',
            boxShadow: '0 8px 32px rgba(124,58,237,0.35)',
          }}>
            Démarrer gratuitement <IconArrow />
          </Link>
          <a href="#demo" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 28px', borderRadius: 14,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#d1d5db', fontWeight: 600, fontSize: 16, textDecoration: 'none',
          }}>
            Voir la démo
          </a>
        </div>

        {/* Trust bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
          marginTop: 40, flexWrap: 'wrap',
        }}>
          {['Paiements Stripe sécurisés', 'Sans abonnement annuel bloquant', 'Setup en moins d\'1h'].map((t, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 13 }}>
              <span style={{ color: '#22c55e' }}><IconCheck /></span>{t}
            </span>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ color: '#a78bfa', fontWeight: 600, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Simple par design</p>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, color: '#f9fafb', marginBottom: 12 }}>Opérationnel en 3 étapes</h2>
          <p style={{ color: '#9ca3af', fontSize: 16 }}>De l'inscription à votre première vente, tout est guidé.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {steps.map((step, i) => (
            <div key={i} className="step-card" style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 18, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <StepNumber n={i + 1} />
                <h3 style={{ fontWeight: 700, color: '#f9fafb', fontSize: 16, margin: 0, lineHeight: 1.3 }}>{step.title}</h3>
              </div>
              <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {features.map((f, i) => (
            <div key={i} className="feature-card" style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 18, padding: '24px', display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color }}>
                {f.icon}
              </div>
              <h3 style={{ fontWeight: 700, color: '#f9fafb', fontSize: 15, margin: 0 }}>{f.title}</h3>
              <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── DEMO SECTION ── */}
      <section id="demo" style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 60px' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(168,85,247,0.04))',
          border: '1px solid rgba(124,58,237,0.2)', borderRadius: 24, padding: '48px 32px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <p style={{ color: '#a78bfa', fontWeight: 600, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Exemple live</p>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 800, color: '#f9fafb', marginBottom: 12 }}>
              Voici à quoi ressemble une page vendeur
            </h2>
            <p style={{ color: '#9ca3af', fontSize: 15 }}>Testez gratuitement pendant 1 minute — accès réel au groupe Telegram.</p>
          </div>

          {/* Coccibet vendor card */}
          <div style={{
            background: 'rgba(0,0,0,0.35)', borderRadius: 20, overflow: 'hidden',
            maxWidth: 680, margin: '0 auto', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {/* Banner */}
            <div style={{ position: 'relative', height: 140, overflow: 'hidden' }}>
              <img src="/banniere.jpg" alt="Coccibet" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.7))' }} />
            </div>

            {/* Profile */}
            <div style={{ padding: '0 24px 24px', marginTop: -28, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 16 }}>
                <img src="/photo-profil.jpg" alt="Coccibet" style={{
                  width: 64, height: 64, borderRadius: 16, objectFit: 'cover',
                  border: '3px solid #0f0f13', flexShrink: 0,
                }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h3 style={{ fontWeight: 800, color: '#f9fafb', fontSize: 18, margin: 0 }}>Coccibet</h3>
                    <div style={{
                      background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)',
                      borderRadius: 99, padding: '2px 8px', fontSize: 11, color: '#86efac', fontWeight: 600,
                    }}>Vérifié</div>
                  </div>
                  <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                    {[...Array(5)].map((_, i) => <IconStar key={i} />)}
                    <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 4 }}>4.9 · 214 membres</span>
                  </div>
                </div>
              </div>

              <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                Signaux sportifs premium, analyses exclusives et accès à une communauté de parieurs sérieux. Résultats vérifiés depuis 2021.
              </p>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
                {[
                  { v: '+180', l: 'Signaux/mois' },
                  { v: '68%', l: 'Taux de réussite' },
                  { v: '2021', l: 'Actif depuis' },
                ].map((s, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 8px', textAlign: 'center',
                  }}>
                    <div style={{ fontWeight: 800, color: '#f9fafb', fontSize: 18 }}>{s.v}</div>
                    <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>

              <TestPack user={user} />
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <Link href="/c/coccibet" style={{ color: '#a78bfa', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>
              Voir la page complète de Coccibet →
            </Link>
          </div>
        </div>
      </section>

      {/* ── PRICING VENDOR ── */}
      <section id="tarifs" style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ color: '#a78bfa', fontWeight: 600, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Offres vendeur</p>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, color: '#f9fafb', marginBottom: 12 }}>
            Choisissez votre plan SubLaunch
          </h2>
          <p style={{ color: '#9ca3af', fontSize: 16 }}>Plus votre volume augmente, plus le mensuel est rentable.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, maxWidth: 700, margin: '0 auto' }}>
          <VendorPlan
            name="Hebdomadaire"
            price="30"
            period="semaine"
            commission="8%"
            highlighted={false}
            features={[
              'Bot Telegram automatisé',
              'Dashboard CRM complet',
              'Gestion des accès illimitée',
              'Support email',
              '8% de commission sur ventes',
            ]}
          />
          <VendorPlan
            name="Mensuel"
            price="100"
            period="mois"
            commission="2%"
            highlighted={true}
            badge="Recommandé"
            features={[
              'Tout du plan hebdo',
              'Commission réduite à 2%',
              'Accès API vendeur',
              'Export CSV illimité',
              'Support prioritaire',
            ]}
          />
        </div>

        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 13, marginTop: 20 }}>
          Exemple : avec 500€/mois de ventes, le plan mensuel vous économise 30€ vs l'hebdomadaire.
        </p>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 800, color: '#f9fafb', marginBottom: 10 }}>Ils ont lancé leur communauté</h2>
          <p style={{ color: '#9ca3af', fontSize: 15 }}>Des vendeurs réels, des résultats réels.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {testimonials.map((t, i) => <Testimonial key={i} {...t} />)}
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(168,85,247,0.08))',
          border: '1px solid rgba(124,58,237,0.3)', borderRadius: 24,
          padding: 'clamp(36px, 6vw, 64px)', textAlign: 'center',
        }}>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 800, color: '#f9fafb', marginBottom: 14 }}>
            Prêt à lancer votre communauté ?
          </h2>
          <p style={{ color: '#9ca3af', fontSize: 16, marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
            Créez votre compte en 2 minutes. Aucune carte bancaire requise pour démarrer.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 32px', borderRadius: 14,
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              color: '#fff', fontWeight: 600, fontSize: 16, textDecoration: 'none',
              boxShadow: '0 8px 32px rgba(124,58,237,0.35)',
            }}>
              Commencer gratuitement <IconArrow />
            </Link>
            <a href="#tarifs" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 28px', borderRadius: 14,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#d1d5db', fontWeight: 600, fontSize: 16, textDecoration: 'none',
            }}>
              Voir les offres
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
}
