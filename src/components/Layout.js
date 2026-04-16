import Navbar from './Navbar';
import Head from 'next/head';

export default function Layout({ children, title = 'SubLaunch' }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Vendez un accès récurrent à votre groupe Telegram privé" />
      </Head>
      <div className="min-h-screen">
        <Navbar />
        <main>{children}</main>
        <footer className="border-t border-white/10 py-8 mt-16">
          <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
            © 2024 SubLaunch — Plateforme d'abonnement Telegram
          </div>
        </footer>
      </div>
    </>
  );
}
