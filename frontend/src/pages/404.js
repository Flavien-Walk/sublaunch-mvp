import Layout from '../components/Layout';
import Link from 'next/link';

export default function NotFound() {
  return (
    <Layout title="404 — SubLaunch">
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-4">
        <p className="text-8xl font-bold text-primary-500/30 mb-4">404</p>
        <h1 className="text-2xl font-bold text-white mb-2">Page introuvable</h1>
        <p className="text-gray-400 mb-8">Cette page n'existe pas ou a été déplacée.</p>
        <Link href="/" className="btn-primary">Retour à l'accueil</Link>
      </div>
    </Layout>
  );
}
