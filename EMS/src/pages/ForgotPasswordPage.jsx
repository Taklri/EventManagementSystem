import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { authApi } from '../lib/api';
import { validateEmail } from '../lib/authValidation';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const emailError = emailTouched ? validateEmail(email) : '';

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setEmailTouched(true);
    if (validateEmail(email)) {
      event.currentTarget.elements.namedItem('email')?.focus();
      return;
    }
    setIsSubmitting(true);
    setFormError('');
    setNotice('');
    try {
      const result = await authApi.forgotPassword({ email: email.trim() });
      if (result.challengeId) {
        navigate('/forgot-password/otp', {
          state: {
            challengeId: result.challengeId,
            expiresAt: result.expiresAt,
            retryAfterSeconds: result.retryAfterSeconds,
            email: email.trim(),
          },
        });
        return;
      }
      setNotice(result.message);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout compact centered>
      <h2 className="text-center text-2xl font-bold text-nu-dark">Forgot password</h2>
      <p className="mb-7 mt-1 text-center text-sm text-slate-500">
        Enter the email for your account. If it matches, we will send a verification code.
      </p>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="reset-email" className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
          <input
            id="reset-email"
            name="email"
            required
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => { setEmail(event.target.value); setEmailTouched(true); setFormError(''); setNotice(''); }}
            onBlur={() => setEmailTouched(true)}
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? 'reset-email-error' : undefined}
            placeholder="name@example.com"
            className={`w-full rounded-lg border px-3.5 py-3 text-sm outline-none transition focus:ring-2 focus:ring-nu-navy/20 ${emailError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-nu-navy'}`}
          />
          {emailError && <p aria-live="polite" id="reset-email-error" className="mt-1 text-xs text-red-700">{emailError}</p>}
        </div>
        {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">{notice}</p>}
        {formError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800">{formError}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-nu-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-nu-dark focus:outline-none focus:ring-2 focus:ring-nu-navy focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
        >
          {isSubmitting ? 'Sending verification code…' : 'Send verification code'}
        </button>
      </form>
      <p className="mt-7 text-center text-sm text-slate-600">
        Remember your password? <Link to="/" className="font-semibold text-nu-navy underline-offset-2 hover:underline">Back to login</Link>
      </p>
    </AuthLayout>
  );
}
