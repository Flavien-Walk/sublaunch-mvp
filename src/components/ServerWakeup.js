/**
 * ServerWakeup — handles Render free tier cold starts gracefully.
 * Shows a countdown + polling state while the backend is sleeping,
 * then calls onReady() when the server responds. Never spams the server.
 */
import { useState, useEffect, useRef, useCallback } from 'react';

const PROD_API = 'https://sublaunch-mvp.onrender.com';
const DEV_API  = 'http://localhost:5000';
const HEALTH_PATH = '/api/health';
const POLL_INTERVAL_MS = 5000;  // check every 5s
const INITIAL_WAIT_S = 30;       // show countdown from 30s
const MAX_ATTEMPTS = 24;         // ~2 minutes total

function getApiBase() {
  if (typeof window === 'undefined') return PROD_API;
  const h = window.location.hostname;
  return (h === 'localhost' || h === '127.0.0.1') ? DEV_API : PROD_API;
}

export default function ServerWakeup({ children }) {
  const [state, setState] = useState('checking'); // checking | awake | sleeping
  const [countdown, setCountdown] = useState(INITIAL_WAIT_S);
  const attemptsRef = useRef(0);
  const pollRef = useRef(null);
  const countRef = useRef(null);

  const stopAll = useCallback(() => {
    clearInterval(pollRef.current);
    clearInterval(countRef.current);
  }, []);

  const markAwake = useCallback(() => {
    stopAll();
    setState('awake');
  }, [stopAll]);

  const checkHealth = useCallback(async () => {
    attemptsRef.current += 1;
    if (attemptsRef.current > MAX_ATTEMPTS) {
      stopAll();
      // Give up gracefully — show the form anyway, errors will surface naturally
      setState('awake');
      return;
    }
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(`${getApiBase()}${HEALTH_PATH}`, { signal: ctrl.signal });
      clearTimeout(timeout);
      if (res.ok) markAwake();
    } catch {
      // Still sleeping — continue polling
    }
  }, [markAwake, stopAll]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Quick first check
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 3000);
        const res = await fetch(`${getApiBase()}${HEALTH_PATH}`, { signal: ctrl.signal });
        clearTimeout(timeout);
        if (!cancelled && res.ok) { setState('awake'); return; }
      } catch { /* timed out or refused */ }

      if (cancelled) return;

      // Server is sleeping — start countdown + polling
      setState('sleeping');
      setCountdown(INITIAL_WAIT_S);

      countRef.current = setInterval(() => {
        setCountdown(c => Math.max(0, c - 1));
      }, 1000);

      // Wait 3s before first poll attempt (avoid hammering)
      setTimeout(() => {
        if (!cancelled) {
          checkHealth();
          pollRef.current = setInterval(checkHealth, POLL_INTERVAL_MS);
        }
      }, 3000);
    }

    init();
    return () => {
      cancelled = true;
      stopAll();
    };
  }, [checkHealth, stopAll]);

  if (state === 'awake') return children;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', padding: '40px 20px',
      textAlign: 'center',
    }}>
      {/* Spinner */}
      <div style={{ position: 'relative', width: 64, height: 64, marginBottom: 28 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '2px solid rgba(124,58,237,0.15)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '3px solid transparent',
          borderTopColor: '#7c3aed',
          animation: 'spin 0.9s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: '14px', borderRadius: '50%',
          background: 'rgba(124,58,237,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
      </div>

      <h2 style={{ fontWeight: 700, color: '#f9fafb', fontSize: 20, marginBottom: 10 }}>
        Le serveur se réveille
      </h2>
      <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, maxWidth: 340, marginBottom: 24 }}>
        Notre serveur est en veille pour économiser des ressources. Il redémarre automatiquement — patientez quelques secondes.
      </p>

      {/* Countdown bar */}
      <div style={{ width: '100%', maxWidth: 300, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: '#9ca3af', fontSize: 13 }}>Réveil en cours…</span>
          <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: 13 }}>~{countdown}s</span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
            width: `${100 - (countdown / INITIAL_WAIT_S) * 100}%`,
            transition: 'width 1s linear',
          }} />
        </div>
      </div>

      <p style={{ color: '#4b5563', fontSize: 12 }}>
        Cela n'arrive qu'au premier accès après une période d'inactivité.
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
