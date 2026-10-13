import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Eye, EyeOff, Lock, Mail, Pencil, UserRound, X } from 'lucide-react';
import { profileApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { sanitizeName, sanitizeStudentId, validateEmail, validateName, validatePassword, validateStudentId } from '../lib/authValidation';

const fieldClass = (invalid) =>
  `w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-nu-navy focus:ring-2 focus:ring-nu-navy/15 ${invalid ? 'border-red-500' : 'border-slate-200'}`;

const maskEmail = (email = '') => {
  const [local = '', domain = ''] = email.split('@');
  if (!domain) return email;
  const [name = '', ...rest] = domain.split('.');
  const hiddenLocal = '*'.repeat(Math.max(local.length - 2, 4));
  const hiddenDomain = '*'.repeat(Math.max(name.length - 1, 4));
  return `${local.slice(0, 2)}${hiddenLocal}@${name.slice(0, 1)}${hiddenDomain}${rest.length ? `.${rest.join('.')}` : ''}`;
};

const fullName = (person) => [person?.firstName, person?.middleName, person?.lastName].filter(Boolean).join(' ');

const CodeStep = ({ email, challenge, onVerify, onResend, onCancel }) => {
  const [digits, setDigits] = useState(Array(6).fill(''));
  const [secondsLeft, setSecondsLeft] = useState(challenge.retryAfterSeconds ?? 60);
  const [expiresAt, setExpiresAt] = useState(challenge.expiresAt);
  const [now, setNow] = useState(() => Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const inputs = useRef([]);
  const expiresInSeconds = expiresAt ? Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000)) : null;
  const isExpired = expiresInSeconds === 0;

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
    if (numbers.length > 1) {
      const next = [...digits];
      numbers.split('').forEach((digit, offset) => {
        if (index + offset < 6) next[index + offset] = digit;
      });
      setDigits(next);
      inputs.current[Math.min(index + numbers.length, 5)]?.focus();
      return;
    }
    const next = [...digits];
    next[index] = numbers;
    setDigits(next);
    if (numbers && index < 5) inputs.current[index + 1]?.focus();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting || isResending || isExpired) return;
    const otp = digits.join('');
    if (otp.length !== 6) {
      setError('Enter all 6 digits from your email.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await onVerify({ challengeId: challenge.challengeId, otp });
    } catch (requestError) {
      setError(requestError.message);
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
      const result = await onResend({ challengeId: challenge.challengeId });
      setDigits(Array(6).fill(''));
      setSecondsLeft(result.retryAfterSeconds ?? 60);
      setExpiresAt(result.expiresAt);
      setNow(Date.now());
      setNotice('A new verification code has been sent.');
      inputs.current[0]?.focus();
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.retryAfterSeconds) setSecondsLeft(requestError.retryAfterSeconds);
    } finally {
      setIsResending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <p className="text-sm text-slate-600">
        Enter the 6-digit code sent to <span className="font-medium text-nu-dark">{email}</span>.
      </p>
      <fieldset className="mt-4" disabled={isSubmitting || isResending || isExpired}>
        <legend className="sr-only">Six-digit verification code</legend>
        <div className="grid max-w-sm grid-cols-6 gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => { inputs.current[index] = element; }}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={6}
              value={digit}
              aria-label={`Verification code digit ${index + 1}`}
              onChange={(event) => updateDigit(index, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Backspace' && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
              }}
              className="h-12 min-w-0 rounded-lg border border-slate-300 bg-white text-center text-lg font-semibold text-nu-navy outline-none focus:border-nu-navy focus:ring-2 focus:ring-nu-navy/20"
            />
          ))}
        </div>
      </fieldset>
      {expiresInSeconds !== null && (
        <p className={`mt-3 text-xs ${isExpired ? 'text-red-700' : 'text-slate-500'}`}>
          {isExpired ? 'This code has expired. Start again to request a new one.' : `Code expires in ${Math.floor(expiresInSeconds / 60)}:${String(expiresInSeconds % 60).padStart(2, '0')}`}
        </p>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-3 text-sm text-emerald-700">{notice}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" disabled={isSubmitting || isResending || isExpired} className="rounded-lg bg-nu-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-nu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy focus-visible:ring-offset-2 disabled:opacity-60">
          {isSubmitting ? 'Verifying…' : 'Verify code'}
        </button>
        <button type="button" onClick={handleResend} disabled={secondsLeft > 0 || isResending || isSubmitting || isExpired} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-nu-navy hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy disabled:text-slate-400">
          {isResending ? 'Sending…' : secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend code'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy">
          Cancel
        </button>
      </div>
    </form>
  );
};

const Dialog = ({ title, onClose, children }) => {
  const titleId = useId();
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
};

const SecretField = ({ label, value, onChange, onBlur, autoComplete, invalid, error }) => {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <span className={`mt-1.5 flex rounded-lg border bg-white focus-within:border-nu-navy focus-within:ring-2 focus-within:ring-nu-navy/15 ${invalid ? 'border-red-500' : 'border-slate-200'}`}>
        <input type={visible ? 'text' : 'password'} value={value} onChange={onChange} onBlur={onBlur} autoComplete={autoComplete} className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none" />
        <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? `Hide ${label}` : `Show ${label}`} className="px-3 text-slate-500">
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </span>
      {error && <span className="mt-1 block text-xs font-normal text-red-700">{error}</span>}
    </label>
  );
};

const ReadOnlyRow = ({ icon: Icon, label, value }) => (
  <div>
    <p className="flex items-center gap-2 text-sm font-medium text-slate-600">
      <Icon size={15} aria-hidden="true" />
      {label}
    </p>
    <p className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-nu-dark">{value}</p>
  </div>
);

export default function ProfilePage() {
  const { accessToken, signIn, updateUser } = useAuth();
  const photoInput = useRef(null);
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [form, setForm] = useState({ firstName: '', middleName: '', lastName: '', studentId: '', email: '', currentPassword: '' });
  const [touched, setTouched] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [photoPending, setPhotoPending] = useState(false);
  const [emailChallenge, setEmailChallenge] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', password: '', confirmPassword: '' });
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordChallenge, setPasswordChallenge] = useState(null);
  const [passwordError, setPasswordError] = useState('');
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState('');

  useEffect(() => {
    let active = true;
    profileApi.get(accessToken)
      .then((result) => {
        if (!active) return;
        setProfile(result.user);
        setLoadError('');
      })
      .catch((error) => {
        if (active) setLoadError(error.message || 'Unable to load profile.');
      });
    return () => { active = false; };
  }, [accessToken, attempt]);

  const isStudent = profile?.role === 'student';
  const emailChanged = form.email.trim().toLowerCase() !== (profile?.email || '').toLowerCase();
  const nameErrors = {
    firstName: touched.firstName ? validateName(form.firstName) : '',
    middleName: touched.middleName ? validateName(form.middleName, false) : '',
    lastName: touched.lastName ? validateName(form.lastName) : '',
    studentId: isStudent && touched.studentId ? validateStudentId(form.studentId) : '',
    email: touched.email ? validateEmail(form.email) : '',
    currentPassword: emailChanged && touched.currentPassword && !form.currentPassword ? 'Current password is required.' : '',
  };
  const passwordFieldError = passwordTouched ? validatePassword(passwordForm.password) : '';
  const confirmError = passwordTouched && passwordForm.confirmPassword !== passwordForm.password
    ? (passwordForm.confirmPassword ? 'Passwords do not match.' : 'Confirm password is required.')
    : '';
  const passwordRules = passwordTouched ? [
    passwordForm.password.length < 8 && 'Password must be at least 8 characters long',
    !/\p{Lu}/u.test(passwordForm.password) && 'Password must contain at least one uppercase letter',
    !/\p{Ll}/u.test(passwordForm.password) && 'Password must contain at least one lowercase letter',
    !/\d/.test(passwordForm.password) && 'Password must contain at least one number',
    !/[^\p{L}\p{N}\s]/u.test(passwordForm.password) && 'Password must contain a symbol',
    passwordForm.confirmPassword !== passwordForm.password && (passwordForm.confirmPassword ? 'Passwords do not match.' : 'Confirm password is required'),
  ].filter(Boolean) : [];

  function applyProfile(user) {
    setProfile(user);
    updateUser({ firstName: user.firstName, lastName: user.lastName, imageUrl: user.imageUrl || null });
  }

  function openEditor() {
    setForm({
      firstName: profile.firstName || '',
      middleName: profile.middleName || '',
      lastName: profile.lastName || '',
      studentId: profile.studentId || '',
      email: profile.email || '',
      currentPassword: '',
    });
    setTouched({});
    setProfileError('');
    setEmailChallenge(null);
    setEditing(true);
  }

  function closeEditor() {
    setEditing(false);
    setEmailChallenge(null);
    setProfileError('');
  }

  async function saveDetails(event) {
    event.preventDefault();
    if (savingProfile) return;
    setTouched({ firstName: true, middleName: true, lastName: true, studentId: true, email: true, currentPassword: true });
    const invalid = validateName(form.firstName) || validateName(form.middleName, false) || validateName(form.lastName)
      || (isStudent && validateStudentId(form.studentId)) || validateEmail(form.email)
      || (emailChanged && !form.currentPassword);
    if (invalid) return;
    setSavingProfile(true);
    setProfileError('');
    setProfileMessage('');
    try {
      const result = await profileApi.update({
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim(),
        lastName: form.lastName.trim(),
        ...(isStudent ? { studentId: form.studentId.trim() } : {}),
      }, accessToken);
      applyProfile(result.user);
      if (!emailChanged) {
        setProfileMessage('Profile saved.');
        setEditing(false);
        return;
      }
      const challenge = await profileApi.requestEmailChange({
        email: form.email.trim(),
        currentPassword: form.currentPassword,
      }, accessToken);
      setEmailChallenge(challenge);
    } catch (error) {
      setProfileError(error.message || 'Unable to update profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function uploadPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || photoPending) return;
    setPhotoPending(true);
    setPhotoError('');
    try {
      const result = await profileApi.uploadPhoto(file, accessToken);
      applyProfile(result.user);
    } catch (error) {
      setPhotoError(error.message || 'Unable to update profile photo.');
    } finally {
      setPhotoPending(false);
    }
  }

  async function removePhoto() {
    if (photoPending) return;
    setPhotoPending(true);
    setPhotoError('');
    try {
      const result = await profileApi.removePhoto(accessToken);
      applyProfile(result.user);
    } catch (error) {
      setPhotoError(error.message || 'Unable to remove profile photo.');
    } finally {
      setPhotoPending(false);
    }
  }

  async function startPasswordChange(event) {
    event.preventDefault();
    if (passwordPending) return;
    setPasswordTouched(true);
    if (!passwordForm.currentPassword || validatePassword(passwordForm.password) || passwordForm.confirmPassword !== passwordForm.password) return;
    setPasswordPending(true);
    setPasswordError('');
    setPasswordSaved('');
    try {
      const result = await profileApi.requestPasswordChange({
        password: passwordForm.password,
        currentPassword: passwordForm.currentPassword,
      }, accessToken);
      setPasswordChallenge(result);
    } catch (error) {
      setPasswordError(error.message || 'Unable to start password change.');
    } finally {
      setPasswordPending(false);
    }
  }

  if (loadError && !profile) {
    return (
      <section className="mx-auto max-w-3xl rounded-2xl border border-red-100 bg-white px-6 py-12 text-center">
        <h1 className="text-lg font-semibold">Profile unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">{loadError}</p>
        <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-4 rounded-lg bg-nu-navy px-4 py-2.5 text-sm font-semibold text-white">
          Try again
        </button>
      </section>
    );
  }

  if (!profile) {
    return (
      <div role="status" className="mx-auto max-w-3xl space-y-4">
        <span className="sr-only">Loading profile…</span>
        <div aria-hidden="true" className="h-40 rounded-2xl border border-slate-200 bg-white motion-safe:animate-pulse" />
        <div aria-hidden="true" className="h-64 rounded-2xl border border-slate-200 bg-white motion-safe:animate-pulse" />
      </div>
    );
  }

  const initials = [profile.firstName?.[0], profile.lastName?.[0]].filter(Boolean).join('').toLocaleUpperCase() || 'U';

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-6">
          {profile.imageUrl ? (
            <img src={profile.imageUrl} alt={`${fullName(profile)} profile photo`} className="h-40 w-40 rounded-full object-cover" />
          ) : (
            <span className="flex h-40 w-40 items-center justify-center rounded-full bg-nu-navy text-4xl font-semibold text-white" aria-hidden="true">{initials}</span>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">Profile photo</h1>
            <p className="mt-1 text-sm text-slate-500">This photo appears on your account.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={uploadPhoto} />
              <button type="button" onClick={() => photoInput.current?.click()} disabled={photoPending} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-nu-dark hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy disabled:opacity-60">
                <Camera size={16} aria-hidden="true" />
                {photoPending ? 'Saving…' : 'Upload photo'}
              </button>
              {profile.imageUrl && (
                <button type="button" onClick={removePhoto} disabled={photoPending} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy disabled:opacity-60">
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
        {photoError && <p role="alert" className="mt-3 text-sm text-red-700">{photoError}</p>}
      </section>

      <section className="border-t border-slate-200 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Personal information</h2>
            <p className="mt-1 text-sm text-slate-500">Keep your account details current.</p>
          </div>
          <button type="button" onClick={openEditor} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-nu-dark hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy">
            <Pencil size={15} aria-hidden="true" />
            Edit
          </button>
        </div>
        <div className="mt-5 max-w-md space-y-4">
          <ReadOnlyRow icon={Mail} label="Email" value={maskEmail(profile.email)} />
          <ReadOnlyRow icon={UserRound} label="Full name" value={fullName(profile)} />
          {isStudent && <ReadOnlyRow icon={UserRound} label="Student ID" value={profile.studentId} />}
        </div>
        {profileMessage && <p role="status" className="mt-4 text-sm text-emerald-700">{profileMessage}</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Security</h2>
        <p className="mt-1 text-sm text-slate-500">Use a strong password. Email and password changes are confirmed with a code sent to your current email.</p>
        {passwordSaved && <p role="status" className="mt-3 text-sm text-emerald-700">{passwordSaved}</p>}
        <button
          type="button"
          onClick={() => {
            setPasswordForm({ currentPassword: '', password: '', confirmPassword: '' });
            setPasswordTouched(false);
            setPasswordError('');
            setPasswordChallenge(null);
            setChangingPassword(true);
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-nu-dark hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy"
        >
          <Lock size={15} aria-hidden="true" />
          Change password
        </button>
      </section>

      {editing && (
        <Dialog title="Edit personal information" onClose={closeEditor}>
          {emailChallenge ? (
            <CodeStep
              email={profile.email}
              challenge={emailChallenge}
              onVerify={async (body) => {
                const result = await profileApi.verifyEmailChange(body, accessToken);
                applyProfile(result.user);
                setProfileMessage('Email updated.');
                closeEditor();
              }}
              onResend={(body) => profileApi.resendEmailChange(body, accessToken)}
              onCancel={() => setEmailChallenge(null)}
            />
          ) : (
            <form onSubmit={saveDetails} className="mt-4 space-y-4" noValidate>
              {emailChanged && (
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-nu-dark">Verify before saving the new email</p>
                  <p className="mt-1 text-sm text-slate-500">We will send a one-time code to your current email after checking your password. Your name and student ID save immediately.</p>
                </div>
              )}
              <label className="block text-sm font-medium text-slate-700">
                Email
                <input type="email" value={form.email} onBlur={() => setTouched((current) => ({ ...current, email: true }))} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className={`mt-1.5 ${fieldClass(nameErrors.email)}`} autoComplete="email" />
                {nameErrors.email && <span className="mt-1 block text-xs font-normal text-red-700">{nameErrors.email}</span>}
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  First name
                  <input value={form.firstName} onBlur={() => setTouched((current) => ({ ...current, firstName: true }))} onChange={(event) => setForm((current) => ({ ...current, firstName: sanitizeName(event.target.value) }))} className={`mt-1.5 ${fieldClass(nameErrors.firstName)}`} autoComplete="given-name" />
                  {nameErrors.firstName && <span className="mt-1 block text-xs font-normal text-red-700">{nameErrors.firstName}</span>}
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Middle name <span className="font-normal text-slate-400">(optional)</span>
                  <input value={form.middleName} onBlur={() => setTouched((current) => ({ ...current, middleName: true }))} onChange={(event) => setForm((current) => ({ ...current, middleName: sanitizeName(event.target.value) }))} className={`mt-1.5 ${fieldClass(nameErrors.middleName)}`} autoComplete="additional-name" />
                  {nameErrors.middleName && <span className="mt-1 block text-xs font-normal text-red-700">{nameErrors.middleName}</span>}
                </label>
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Last name
                <input value={form.lastName} onBlur={() => setTouched((current) => ({ ...current, lastName: true }))} onChange={(event) => setForm((current) => ({ ...current, lastName: sanitizeName(event.target.value) }))} className={`mt-1.5 ${fieldClass(nameErrors.lastName)}`} autoComplete="family-name" />
                {nameErrors.lastName && <span className="mt-1 block text-xs font-normal text-red-700">{nameErrors.lastName}</span>}
              </label>
              {isStudent && (
                <label className="block text-sm font-medium text-slate-700">
                  Student ID
                  <input value={form.studentId} onBlur={() => setTouched((current) => ({ ...current, studentId: true }))} onChange={(event) => setForm((current) => ({ ...current, studentId: sanitizeStudentId(event.target.value) }))} className={`mt-1.5 ${fieldClass(nameErrors.studentId)}`} inputMode="numeric" autoComplete="off" />
                  {nameErrors.studentId && <span className="mt-1 block text-xs font-normal text-red-700">{nameErrors.studentId}</span>}
                </label>
              )}
              {emailChanged && (
                <SecretField
                  label="Current password"
                  value={form.currentPassword}
                  onBlur={() => setTouched((current) => ({ ...current, currentPassword: true }))}
                  onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))}
                  autoComplete="current-password"
                  invalid={Boolean(nameErrors.currentPassword)}
                  error={nameErrors.currentPassword}
                />
              )}
              {profileError && <p role="alert" className="text-sm text-red-700">{profileError}</p>}
              <button type="submit" disabled={savingProfile} className="w-full rounded-lg bg-nu-navy px-4 py-3 text-sm font-semibold text-white hover:bg-nu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy focus-visible:ring-offset-2 disabled:opacity-60">
                {savingProfile ? 'Saving…' : emailChanged ? 'Continue with OTP' : 'Save'}
              </button>
            </form>
          )}
        </Dialog>
      )}

      {changingPassword && (
        <Dialog title="Change password" onClose={() => setChangingPassword(false)}>
          {passwordChallenge ? (
            <CodeStep
              email={profile.email}
              challenge={passwordChallenge}
              onVerify={async (body) => {
                const result = await profileApi.verifyPasswordChange(body, accessToken);
                signIn(result.accesstoken, result.user);
                setPasswordSaved('Password updated.');
                setChangingPassword(false);
              }}
              onResend={(body) => profileApi.resendPasswordChange(body, accessToken)}
              onCancel={() => setPasswordChallenge(null)}
            />
          ) : (
            <form onSubmit={startPasswordChange} className="mt-4 space-y-4" noValidate>
              <SecretField label="Current password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} autoComplete="current-password" invalid={passwordTouched && !passwordForm.currentPassword} error={passwordTouched && !passwordForm.currentPassword ? 'Current password is required.' : ''} />
              <SecretField label="New password" value={passwordForm.password} onBlur={() => setPasswordTouched(true)} onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))} autoComplete="new-password" invalid={Boolean(passwordFieldError)} />
              <SecretField label="Confirm password" value={passwordForm.confirmPassword} onBlur={() => setPasswordTouched(true)} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} autoComplete="new-password" invalid={Boolean(confirmError)} />
              {passwordRules.length > 0 && (
                <ul className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {passwordRules.map((rule) => <li key={rule}>{rule}</li>)}
                </ul>
              )}
              {passwordError && <p role="alert" className="text-sm text-red-700">{passwordError}</p>}
              <button type="submit" disabled={passwordPending} className="w-full rounded-lg bg-nu-navy px-4 py-3 text-sm font-semibold text-white hover:bg-nu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy focus-visible:ring-offset-2 disabled:opacity-60">
                {passwordPending ? 'Sending…' : 'Continue'}
              </button>
            </form>
          )}
        </Dialog>
      )}
    </div>
  );
}
