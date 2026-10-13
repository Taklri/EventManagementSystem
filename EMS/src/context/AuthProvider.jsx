import { useEffect, useMemo, useState } from 'react';
import { authApi } from '../lib/api';
import { AuthContext } from './AuthContext';

export default function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    let active = true;
    authApi.refresh()
      .then(({ accesstoken, user: restoredUser }) => { if (active) { setAccessToken(accesstoken); setUser(restoredUser); } })
      .catch(() => { if (active) { setAccessToken(null); setUser(null); } })
      .finally(() => { if (active) setIsRestoring(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!accessToken) return undefined;
    let active = true;
    const timer = window.setTimeout(() => {
      authApi.refresh()
        .then(({ accesstoken, user: refreshedUser }) => { if (active) { setAccessToken(accesstoken); setUser(refreshedUser); } })
        .catch(() => { if (active) { setAccessToken(null); setUser(null); } });
    }, 14 * 60 * 1000);
    return () => { active = false; window.clearTimeout(timer); };
  }, [accessToken]);

  const value = useMemo(() => ({
    accessToken,
    user,
    isRestoring,
    signIn: (token, signedInUser) => { setAccessToken(token); setUser(signedInUser); },
    updateUser: (patch) => setUser((current) => (current ? { ...current, ...patch } : current)),
    signOut: async () => {
      await authApi.logout();
      setAccessToken(null);
      setUser(null);
    },
  }), [accessToken, user, isRestoring]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
