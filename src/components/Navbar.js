import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { Menu, X, Zap } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <nav className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            SubLaunch
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                {user.role === 'creator' ? (
                  <Link href="/dashboard/creator" className="text-gray-300 hover:text-white text-sm transition-colors">
                    Dashboard
                  </Link>
                ) : (
                  <Link href="/dashboard" className="text-gray-300 hover:text-white text-sm transition-colors">
                    Mon espace
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all border border-white/10"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-300 hover:text-white text-sm transition-colors">
                  Connexion
                </Link>
                <Link href="/register" className="btn-primary text-sm !py-2 !px-4">
                  Commencer
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden text-gray-400" onClick={() => setOpen(!open)}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-black/80 px-4 py-4 flex flex-col gap-3">
          {user ? (
            <>
              <Link href={user.role === 'creator' ? '/dashboard/creator' : '/dashboard'} className="text-gray-300 hover:text-white" onClick={() => setOpen(false)}>
                Dashboard
              </Link>
              <button onClick={logout} className="text-left text-red-400 hover:text-red-300">
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-300" onClick={() => setOpen(false)}>Connexion</Link>
              <Link href="/register" className="btn-primary !py-2 text-center" onClick={() => setOpen(false)}>Commencer</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
