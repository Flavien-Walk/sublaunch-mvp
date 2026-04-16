import Layout from '../components/Layout';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import api from '../lib/api';
import { Zap, Shield, TrendingUp, Users, ArrowRight, Check } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Track affiliate click
    const ref = router.query.ref;
    if (ref) {
      api.post('/api/affiliate/click', { code: ref }).catch(() => {});
      sessionStorage.setItem('affiliateCode', ref);
    }
  }, [router.query.ref]);

  return (
    <Layout title="SubLaunch — Vendez votre accès Telegram">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-4 py-1.5 text-sm text-primary-400 mb-8">
          <Zap size={14} />
          Plateforme d'abonnement Telegram
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
          Monétisez votre<br />
          <span className="text-primary-500">communauté Telegram</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Vendez un accès récurrent à votre groupe privé. Paiement Stripe, accès automatique, gestion simplifiée.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register" className="btn-primary text-base !py-4 !px-8">
            Démarrer gratuitement <ArrowRight size={18} />
          </Link>
          <Link href="#plans" className="btn-secondary text-base !py-4 !px-8">
            Voir les tarifs
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: <Zap size={24} className="text-primary-400" />, title: 'Paiement Stripe', desc: 'Abonnements récurrents, factures automatiques' },
            { icon: <Shield size={24} className="text-green-400" />, title: 'Accès sécurisé', desc: 'Lien Telegram unique et temporaire par membre' },
            { icon: <TrendingUp size={24} className="text-blue-400" />, title: 'Dashboard vendeur', desc: 'Suivi CRM, revenus, abonnés en temps réel' },
            { icon: <Users size={24} className="text-yellow-400" />, title: 'Affiliation', desc: 'Programme de parrainage intégré' },
          ].map((f, i) => (
            <div key={i} className="card flex flex-col gap-3">
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">{f.icon}</div>
              <h3 className="font-semibold text-white">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Demo plans section */}
      <section id="plans" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Exemple de page vendeur</h2>
          <p className="text-gray-400">Vos clients verront une page comme celle-ci</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { name: 'Starter', price: '9.99', features: ['Accès groupe privé', 'Alertes quotidiennes', 'Support email'], popular: false },
            { name: 'Pro', price: '19.99', features: ['Tout Starter', 'Analyses hebdo', 'Chat exclusif', 'Priorité support'], popular: true },
            { name: 'VIP', price: '49.99', features: ['Tout Pro', 'Sessions live', 'Coaching 1:1', 'Accès archives'], popular: false },
          ].map((plan, i) => (
            <div key={i} className={`card relative flex flex-col gap-4 ${plan.popular ? 'border-primary-500 bg-primary-500/5' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Populaire
                </div>
              )}
              <div>
                <p className="text-sm text-gray-400 font-medium">{plan.name}</p>
                <p className="text-3xl font-bold text-white mt-1">{plan.price}€<span className="text-base font-normal text-gray-400">/mois</span></p>
              </div>
              <ul className="flex flex-col gap-2 flex-1">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-gray-300">
                    <Check size={14} className="text-green-400 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className={plan.popular ? 'btn-primary' : 'btn-secondary'}>
                Souscrire
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="card max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4">Prêt à lancer votre communauté ?</h2>
          <p className="text-gray-400 mb-8">Créez votre compte en 2 minutes. Aucune carte requise.</p>
          <Link href="/register" className="btn-primary mx-auto w-fit">
            Commencer maintenant <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </Layout>
  );
}
