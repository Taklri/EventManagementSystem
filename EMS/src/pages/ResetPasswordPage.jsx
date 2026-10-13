import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import PasswordVisibilityToggle from '../components/PasswordVisibilityToggle';
import { authApi } from '../lib/api';
import { validatePassword } from '../lib/authValidation';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const resetToken = location.state?.resetToken;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const passwordError = passwordTouched ? validatePassword(password) : '';
  const confirmError = confirmTouched && password !== confirmPassword ? 'Passwords do not match.' : '';

  useEffect(() => {
    if (!resetToken) navigate('/forgot-password', { replace: true });
  }, [navigate, resetToken]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting || !resetToken) return;
    setPasswordTouched(true);
    setConfirmTouched(true);
    const nextPasswordError = validatePassword(password);
    const nextConfirmError = password !== confirmPassword ? 'Passwords do not match.' : '';
    if (nextPasswordError || nextConfirmError) {
      event.currentTarget.elements.namedItem(nextPasswordError ? 'password' : 'confirmPassword')?.focus();
      return;
    }
    setIsSubmitting(true);
    setFormError('');
    try {
      await authApi.resetPassword({ resetToken, password });
      navigate('/', { replace: true, state: { notice: 'Your password was updated. Please sign in.' } });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!resetToken) return null;

  return (
    <AuthLayout compact centered>
      <h2 className="text-center text-2xl font-bold text-nu-dark">Create a new password</h2>
      <p className="mb-7 mt-1 text-center text-sm text-slate-500">
        Choose a new password for your account. You will sign in again after saving it.
      </p>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="reset-password" className="mb-1.5 block text-sm font-medium text-slate-700">New password</label>
          <div className={`flex rounded-lg border focus-within:ring-2 ${passwordError ? 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500/20' : 'border-slate-200 focus-within:border-nu-navy focus-within:ring-nu-navy/20'}`}>
            <input
              id="reset-password"
              name="password"
              required
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(event) => { setPassword(event.target.value); setPasswordTouched(true); setFormError(''); }}
              onBlur={() => setPasswordTouched(true)}
              aria-invalid={Boolean(passwordError)}
              aria-describedby={passwordError ? 'reset-password-error' : undefined}
              placeholder="Enter a new password"
              className="min-w-0 flex-1 rounded-l-lg px-3.5 py-3 text-sm outline-none"
            />
            <PasswordVisibilityToggle visible={showPassword} onToggle={() => setShowPassword((value) => !value)} controls="reset-password" label="new password" />
          </div>
          {passwordError && <p aria-live="polite" id="reset-password-error" className="mt-1 text-xs text-red-700">{passwordError}</p>}
        </div>
        <div>
          <label htmlFor="reset-confirm-password" className="mb-1.5 block text-sm font-medium text-slate-700">Confirm password</label>
          <div className={`flex rounded-lg border focus-within:ring-2 ${confirmError ? 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500/20' : 'border-slate-200 focus-within:border-nu-navy focus-within:ring-nu-navy/20'}`}>
            <input
              id="reset-confirm-password"
              name="confirmPassword"
              required
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => { setConfirmPassword(event.target.value); setConfirmTouched(true); setFormError(''); }}
              onBlur={() => setConfirmTouched(true)}
              aria-invalid={Boolean(confirmError)}
              aria-describedby={confirmError ? 'reset-confirm-error' : undefined}
              placeholder="Re-enter your new password"
              className="min-w-0 flex-1 rounded-l-lg px-3.5 py-3 text-sm outline-none"
            />
            <PasswordVisibilityToggle visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((value) => !value)} controls="reset-confirm-password" label="password confirmation" />
          </div>
          {confirmError && <p aria-live="polite" id="reset-confirm-error" className="mt-1 text-xs text-red-700">{confirmError}</p>}
        </div>
        {formError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800">{formError}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-nu-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-nu-dark focus:outline-none focus:ring-2 focus:ring-nu-navy focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
        >
          {isSubmitting ? 'Saving password…' : 'Save new password'}
        </button>
      </form>
      <p className="mt-7 text-center text-sm text-slate-600">
        <Link to="/" className="font-semibold text-nu-navy underline-offset-2 hover:underline">Back to login</Link>
      </p>
    </AuthLayout>
  );
}
