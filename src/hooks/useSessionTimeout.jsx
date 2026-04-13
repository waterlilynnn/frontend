import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

const INACTIVITY_MS = 5 * 60 * 1000;       
const WARNING_MS    = INACTIVITY_MS - 30_000; 

export const useSessionTimeout = () => {
  const { user, logout } = useAuth();
  const idleRef    = useRef(null);
  const warnRef    = useRef(null);
  const toastIdRef = useRef(null);

  const clearAll = useCallback(() => {
    clearTimeout(idleRef.current);
    clearTimeout(warnRef.current);
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, []);

  const arm = useCallback(() => {
    clearAll();
    if (!user) return;

    warnRef.current = setTimeout(() => {
      toastIdRef.current = toast('⏱ Session expires in 30 seconds due to inactivity.', {
        duration: 30_000,
        icon: '⚠️',
      });
    }, WARNING_MS);

    idleRef.current = setTimeout(() => {
      clearAll();
      toast.error('Logged out due to inactivity.', { duration: 4000 });
      setTimeout(logout, 400);
    }, INACTIVITY_MS);
  }, [user, logout, clearAll]);

  useEffect(() => {
    if (!user) { clearAll(); return; }

    const EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click', 'touchmove'];
    EVENTS.forEach(e => window.addEventListener(e, arm, { passive: true }));
    arm();

    return () => {
      EVENTS.forEach(e => window.removeEventListener(e, arm));
      clearAll();
    };
  }, [user, arm, clearAll]);
};