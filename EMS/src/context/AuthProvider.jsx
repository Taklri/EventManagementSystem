import { useEffect, useMemo, useState } from 'react';
import { authApi } from '../lib/api';
import { AuthContext } from './AuthContext';

export default function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    let active = true;
    authApi.refresh()
      .then(({ accesstoken }) => { if (active) setAccessToken(accesstoken); })
      .catch(() => { if (active) setAccessToken(null); })
      .finally(() => { if (active) setIsRestoring(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!accessToken) return undefined;
    let active = true;
    const timer = window.setTimeout(() => {
      authApi.refresh()
        .then(({ accesstoken }) => { if (active) setAccessToken(accesstoken); })
        .catch(() => { if (active) setAccessToken(null); });
    }, 14 * 60 * 1000);
    return () => { active = false; window.clearTimeout(timer); };
  }, [accessToken]);

  const value = useMemo(() => ({
    accessToken,
    isRestoring,
    signIn: (token) => setAccessToken(token),
    signOut: async () => {
      await authApi.logout();
      setAccessToken(null);
    },
  }), [accessToken, isRestoring]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
