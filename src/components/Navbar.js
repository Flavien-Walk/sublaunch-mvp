import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { Menu, X, Zap } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const close = () => setOpen(false);
  const dashHref = user?.role === 'creator' ? '/dashboard/creator' : '/dashboard';
  const isActive = (path) => router.pathname === path || router.pathname.startsWith(path + '/');

  return (
    <nav className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white flex-shrink-0" style={{ textDecoration: 'none' }}>
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span>SubLaunch</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/marketplace" className="text-gray-300 hover:text-white text-sm px-3 py-2 rounded-lg transition-colors hover:bg-white/5" style={{ textDecoration: 'none', fontWeight: isActive('/marketplace') ? 600 : 400, color: isActive('/marketplace') ? '#fff' : undefined }}>
              Marketplace
            </Link>
            {user ? (
              <>
                <Link href={dashHref} className="text-gray-300 hover:text-white text-sm px-3 py-2 rounded-lg transition-colors hover:bg-white/5" style={{ textDecoration: 'none' }}>
                  {user.role === 'creator' ? 'Dashboard' : 'Mon espace'}
                </Link>
                <button
                  onClick={logout}
                  className="text-sm text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-all ml-1"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-400 hover:text-white text-sm px-3 py-2 rounded-lg transition-colors hover:bg-white/5" style={{ textDecoration: 'none' }}>
                  Se connecter
                </Link>
                <Link href="/register" className="btn-primary text-sm !py-2 !px-4 ml-1" style={{ textDecoration: 'none' }}>
                  S'inscrire gratuitement
                </Link>
              </>
            )}
          </div>

          {/* Mobile burger */}
          <button
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all"
            onClick={() => setOpen(o => !o)}
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-black/90 backdrop-blur-xl px-4 py-5 flex flex-col gap-1">
          <Link href="/marketplace" className="flex items-center px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 font-medium transition-all" onClick={close} style={{ textDecoration: 'none' }}>
            Marketplace
          </Link>
          {user ? (
            <>
              <Link href={dashHref} className="flex items-center px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 font-medium transition-all" onClick={close} style={{ textDecoration: 'none' }}>
                {user.role === 'creator' ? 'Dashboard' : 'Mon espace'}
              </Link>
              <button
                onClick={() => { logout(); close(); }}
                className="flex items-center px-4 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/5 text-left font-medium transition-all w-full"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="flex items-center px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 font-medium transition-all" onClick={close} style={{ textDecoration: 'none' }}>
                Se connecter
              </Link>
              <div className="px-4 pt-2">
                <Link href="/register" className="btn-primary w-full justify-center" onClick={close} style={{ textDecoration: 'none' }}>
                  S'inscrire gratuitement
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
