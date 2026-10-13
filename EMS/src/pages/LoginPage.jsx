import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import PasswordVisibilityToggle from '../components/PasswordVisibilityToggle';
import { authApi } from '../lib/api';
import { validateEmail } from '../lib/authValidation';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const notice = location.state?.notice || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const emailError = emailTouched ? validateEmail(email) : '';
  const passwordError = passwordTouched && !password ? 'Password is required.' : '';

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setEmailTouched(true);
    setPasswordTouched(true);
    if (validateEmail(email) || !password) {
      event.currentTarget.elements.namedItem(validateEmail(email) ? 'email' : 'password')?.focus();
      return;
    }
    setIsSubmitting(true);
    setFormError('');
    try {
      const result = await authApi.login({ email: email.trim(), password });
      navigate('/login/otp', { state: { challengeId: result.challengeId, expiresAt: result.expiresAt, retryAfterSeconds: result.retryAfterSeconds, email: email.trim() } });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout compact>
      <h2 className="text-center text-2xl font-bold text-nu-dark">Login</h2>
      <p className="mb-7 mt-1 text-center text-sm text-slate-500">Sign in to continue to your account.</p>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
          <input id="login-email" name="email" required type="email" autoComplete="email" inputMode="email" value={email}
            onChange={(event) => { setEmail(event.target.value); setEmailTouched(true); setFormError(''); }}
            onBlur={() => setEmailTouched(true)} aria-invalid={Boolean(emailError)} aria-describedby={emailError ? 'login-email-error' : undefined}
            placeholder="name@example.com" className={`w-full rounded-lg border px-3.5 py-3 text-sm outline-none transition focus:ring-2 focus:ring-nu-navy/20 ${emailError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-nu-navy'}`} />
          {emailError && <p aria-live="polite" id="login-email-error" className="mt-1 text-xs text-red-700">{emailError}</p>}
        </div>
        <div>
          <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
          <div className="flex rounded-lg border border-slate-200 focus-within:border-nu-navy focus-within:ring-2 focus-within:ring-nu-navy/20">
            <input id="login-password" name="password" required type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password}
              onChange={(event) => { setPassword(event.target.value); setPasswordTouched(true); setFormError(''); }}
              onBlur={() => setPasswordTouched(true)} aria-invalid={Boolean(passwordError)} aria-describedby={passwordError ? 'login-password-error' : undefined}
              placeholder="Enter your password" className="min-w-0 flex-1 rounded-l-lg px-3.5 py-3 text-sm outline-none" />
            <PasswordVisibilityToggle visible={showPassword} onToggle={() => setShowPassword((value) => !value)} controls="login-password" />
          </div>
          {passwordError && <p aria-live="polite" id="login-password-error" className="mt-1 text-xs text-red-700">{passwordError}</p>}
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-sm font-semibold text-nu-navy underline-offset-2 hover:underline">Forgot password?</Link>
          </div>
        </div>
        {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">{notice}</p>}
        {formError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800">{formError}</p>}
        <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-nu-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-nu-dark focus:outline-none focus:ring-2 focus:ring-nu-navy focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
          {isSubmitting ? 'Sending verification code…' : 'Login Account'}
        </button>
      </form>
      <p className="mt-7 text-center text-sm text-slate-600">Don’t have an account? <Link to="/register" className="font-semibold text-nu-navy underline-offset-2 hover:underline">Create one</Link></p>
    </AuthLayout>
  );
}
