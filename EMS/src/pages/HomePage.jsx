import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [error, setError] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch {
      setError('We could not reach the server. Try signing out again.');
    } finally {
      setIsSigningOut(false);
    }
  }

  return <AuthLayout compact>
    <div className="text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-700" aria-hidden="true">✓</span>
      <h1 className="mt-4 text-2xl font-bold text-nu-dark">You’re signed in</h1>
      <p className="mt-2 text-sm text-slate-600">Welcome to the National University Event Management System.</p>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <button type="button" onClick={handleSignOut} disabled={isSigningOut} className="mt-7 w-full rounded-lg bg-nu-navy px-4 py-3 text-sm font-semibold text-white hover:bg-nu-dark disabled:opacity-60">{isSigningOut ? 'Signing out…' : 'Sign out'}</button>
    </div>
  </AuthLayout>;
}
