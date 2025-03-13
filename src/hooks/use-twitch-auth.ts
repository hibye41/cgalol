import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { authStateAtom, loginAtom, logoutAtom, checkAuthAtom } from '../lib/auth-store';

export const useTwitchAuth = () => {
  const [authState] = useAtom(authStateAtom);
  const [, login] = useAtom(loginAtom);
  const [, logout] = useAtom(logoutAtom);
  const [, checkAuth] = useAtom(checkAuthAtom);

  // Check for auth token in URL hash on component mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    ...authState,
    login,
    logout
  };
}; 