import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../lib/api';

const RESEND_COOLDOWN_SECONDS = 60;

export default function OtpPage({ kind }) {
  const isLogin = kind === 'login';
  const location = useLocation();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [digits, setDigits] = useState(Array(6).fill(''));
  const [secondsLeft, setSecondsLeft] = useState(location.state?.retryAfterSeconds ?? RESEND_COOLDOWN_SECONDS);
  const [expiresAt, setExpiresAt] = useState(location.state?.expiresAt);
  const [now, setNow] = useState(() => Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const inputs = useRef([]);
  const challengeId = location.state?.challengeId;
  const email = location.state?.email;
  const resend = isLogin ? authApi.resendLoginOtp : authApi.resendRegistrationOtp;
  const expiresInSeconds = expiresAt ? Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000)) : null;
  const isExpired = expiresInSeconds === 0;

  useEffect(() => {
    if (!challengeId) navigate(isLogin ? '/' : '/register', { replace: true });
  }, [challengeId, isLogin, navigate]);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function updateDigit(index, value) {
    const numbers = value.replace(/\D/g, '').slice(-6);
    const inputError = /\D/.test(value) ? 'Only digits are allowed. Other characters were removed.' : '';
    if (numbers.length > 1) {
      const next = [...digits];
      numbers.split('').forEach((digit, offset) => { if (index + offset < 6) next[index + offset] = digit; });
      setDigits(next);
      inputs.current[Math.min(index + numbers.length, 5)]?.focus();
      setError(inputError);
      return;
    }
    const next = [...digits];
    next[index] = numbers;
    setDigits(next);
    if (numbers && index < 5) inputs.current[index + 1]?.focus();
    setError(inputError);
  }

  function handleKeyDown(index, event) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < 5) inputs.current[index + 1]?.focus();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting || isResending) return;
    if (isExpired) { setError('This code has expired. Please start again.'); return; }
    const otp = digits.join('');
    if (otp.length !== 6) { setError('Enter all 6 digits from your email.'); return; }
    setIsSubmitting(true);
    setError('');
    setNotice('');
    try {
      const result = await (isLogin ? authApi.verifyLoginOtp : authApi.verifyRegistrationOtp)({ challengeId, otp });
      signIn(result.accesstoken, result.user);
      navigate('/home', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.status === 410) setNotice('This code has expired. Please start again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (isResending || isSubmitting || secondsLeft > 0 || isExpired) return;
    setIsResending(true);
    setError('');
    setNotice('');
    try {
      const result = await resend({ challengeId });
      setDigits(Array(6).fill(''));
      setSecondsLeft(result.retryAfterSeconds ?? RESEND_COOLDOWN_SECONDS);
      setExpiresAt(result.expiresAt);
      setNow(Date.now());
      setNotice('A new verification code has been sent.');
      inputs.current[0]?.focus();
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.retryAfterSeconds) setSecondsLeft(requestError.retryAfterSeconds);
      if ([401, 404, 410].includes(requestError.status)) setNotice('This challenge is no longer available. Please start again.');
    } finally {
      setIsResending(false);
    }
  }

  if (!challengeId) return null;

  return (
    <AuthLayout compact centered>
      <Link to={isLogin ? '/' : '/register'} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2">
        <ArrowLeft className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
        Back
      </Link>
      <h2 className="mt-4 text-center text-2xl font-bold text-nu-dark">{isLogin ? 'OTP Verification' : 'Verify your email'}</h2>
      <p className="mx-auto mt-2 max-w-sm text-center text-sm text-slate-500">Enter the 6-digit code we sent to <span className="font-medium text-slate-700">{email || 'your email address'}</span>.</p>
      <form onSubmit={handleSubmit} className="mt-7">
        <fieldset disabled={isSubmitting || isResending || isExpired}>
          <legend className="sr-only">Six-digit verification code</legend>
          <div className="mx-auto grid max-w-sm grid-cols-6 gap-2 sm:gap-3">
            {digits.map((digit, index) => (
              <input key={index} ref={(element) => { inputs.current[index] = element; }} type="text" inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'} pattern="[0-9]*" maxLength={6} value={digit}
                aria-label={`Verification code digit ${index + 1}`} onFocus={(event) => event.target.select()} onChange={(event) => updateDigit(index, event.target.value)} onKeyDown={(event) => handleKeyDown(index, event)}
                className="h-12 min-w-0 w-full rounded-lg border border-slate-300 text-center text-xl font-semibold text-nu-navy outline-none transition focus:border-nu-navy focus:ring-2 focus:ring-nu-navy/20 sm:h-14" />
            ))}
          </div>
        </fieldset>
        {expiresInSeconds !== null && <p className={`mt-3 text-center text-xs ${isExpired ? 'text-red-700' : 'text-slate-500'}`}>{isExpired ? 'Your code has expired. Use Back to start again.' : `Code expires in ${Math.floor(expiresInSeconds / 60)}:${String(expiresInSeconds % 60).padStart(2, '0')}`}</p>}
        {error && <p role="alert" className="mt-3 text-center text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-3 text-center text-sm text-emerald-700">{notice}</p>}
        <button type="submit" disabled={isSubmitting || isResending || isExpired} className="mt-5 w-full rounded-lg bg-nu-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-nu-dark focus:outline-none focus:ring-2 focus:ring-nu-navy focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? 'Verifying…' : 'Verify Code'}
        </button>
      </form>
      <div className="mt-5 flex flex-col items-center gap-2 text-xs text-slate-500 sm:flex-row sm:justify-center">
        <span>Didn’t receive the code?</span>
        <button type="button" disabled={secondsLeft > 0 || isResending || isSubmitting || isExpired} onClick={handleResend} className="font-semibold text-nu-navy underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline">
          {isResending ? 'Sending…' : secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend code'}
        </button>
      </div>
    </AuthLayout>
  );
}
