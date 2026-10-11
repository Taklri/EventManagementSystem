import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import PasswordVisibilityToggle from '../components/PasswordVisibilityToggle';
import { authApi } from '../lib/api';
import { sanitizeName, sanitizeStudentId, validateEmail, validateName, validatePassword, validateStudentId } from '../lib/authValidation';

const initialValues = { studentId: '', firstName: '', middleName: '', lastName: '', email: '', password: '', confirmPassword: '' };

function getErrors(values) {
  return {
    studentId: validateStudentId(values.studentId),
    firstName: validateName(values.firstName),
    middleName: validateName(values.middleName, false),
    lastName: validateName(values.lastName),
    email: validateEmail(values.email),
    password: validatePassword(values.password),
    confirmPassword: !values.confirmPassword ? 'Please confirm your password.' : values.password !== values.confirmPassword ? 'Passwords do not match.' : '',
  };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [rejectedInput, setRejectedInput] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const errors = getErrors(values);

  function update(field, rawValue) {
    let value = rawValue;
    let wasRejected = false;
    if (field === 'studentId') {
      value = sanitizeStudentId(rawValue);
      wasRejected = value !== rawValue;
    } else if (['firstName', 'middleName', 'lastName'].includes(field)) {
      value = sanitizeName(rawValue);
      wasRejected = value !== rawValue;
    }
    setValues((current) => ({ ...current, [field]: value }));
    setTouched((current) => ({ ...current, [field]: true }));
    setRejectedInput((current) => ({ ...current, [field]: wasRejected }));
    setFormError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setTouched(Object.fromEntries(Object.keys(initialValues).map((field) => [field, true])));
    const invalidField = Object.entries(getErrors(values)).find(([, error]) => error);
    if (invalidField) {
      event.currentTarget.elements.namedItem(invalidField[0])?.focus();
      return;
    }
    setIsSubmitting(true);
    setFormError('');
    try {
      const payload = { ...values };
      delete payload.confirmPassword;
      const result = await authApi.register({ ...payload, studentId: payload.studentId.trim(), firstName: payload.firstName.trim(), middleName: payload.middleName.trim(), lastName: payload.lastName.trim(), email: payload.email.trim() });
      navigate('/register/otp', { state: { challengeId: result.challengeId, expiresAt: result.expiresAt, retryAfterSeconds: result.retryAfterSeconds, email: values.email.trim() } });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function fieldError(field) {
    if (rejectedInput[field]) return 'That character is not allowed and was removed.';
    return touched[field] ? errors[field] : '';
  }

  function fieldClass(field) {
    return `w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-nu-navy/20 ${fieldError(field) ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-nu-navy'}`;
  }

  function field(id, label, fieldName, options = {}) {
    const error = fieldError(fieldName);
    return <div className={options.className || ''}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-700">{label}{options.optional ? <span className="ml-1 font-normal text-slate-400">(optional)</span> : <span className="ml-1 text-red-600" aria-hidden="true">*</span>}</label>
      <input id={id} name={fieldName} required={!options.optional} type={options.type || 'text'} autoComplete={options.autoComplete} inputMode={options.inputMode} maxLength={options.maxLength}
        value={values[fieldName]} onChange={(event) => update(fieldName, event.target.value)} onBlur={() => setTouched((current) => ({ ...current, [fieldName]: true }))}
        aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} placeholder={options.placeholder || ''} className={fieldClass(fieldName)} />
      {error && <p aria-live="polite" id={`${id}-error`} className="mt-1 text-[11px] leading-4 text-red-700">{error}</p>}
    </div>;
  }

  return (
    <AuthLayout>
      <h2 className="text-center text-2xl font-bold text-nu-dark">Create your account</h2>
      <p className="mb-5 mt-1 text-center text-sm text-slate-500">Register with your student details to get started.</p>
      <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
        {field('student-id', 'Student ID', 'studentId', { placeholder: '2026-123456', maxLength: 11 })}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {field('first-name', 'First name', 'firstName', { autoComplete: 'given-name', className: 'sm:col-span-2' })}
          {field('middle-name', 'Middle name', 'middleName', { optional: true, autoComplete: 'additional-name' })}
          {field('last-name', 'Last name', 'lastName', { autoComplete: 'family-name' })}
        </div>
        {field('register-email', 'Email', 'email', { type: 'email', autoComplete: 'email', inputMode: 'email', placeholder: 'name@example.com' })}
        <div>
          <label htmlFor="register-password" className="mb-1.5 block text-xs font-medium text-slate-700">Password<span className="ml-1 text-red-600" aria-hidden="true">*</span></label>
          <div className={`flex rounded-lg border ${fieldError('password') ? 'border-red-500' : 'border-slate-200'} focus-within:border-nu-navy focus-within:ring-2 focus-within:ring-nu-navy/20`}>
            <input id="register-password" name="password" required type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={values.password} onChange={(event) => update('password', event.target.value)} onBlur={() => setTouched((current) => ({ ...current, password: true }))} aria-invalid={Boolean(fieldError('password'))} aria-describedby={fieldError('password') ? 'password-guidance password-error' : 'password-guidance'} className="min-w-0 flex-1 rounded-l-lg px-3 py-2.5 text-sm outline-none" placeholder="Create a password" />
            <PasswordVisibilityToggle visible={showPassword} onToggle={() => setShowPassword((current) => !current)} controls="register-password" />
          </div>
          <p id="password-guidance" className="mt-1 text-[11px] text-slate-500">At least 8 characters with uppercase, lowercase, number, and symbol.</p>
          {fieldError('password') && <p aria-live="polite" id="password-error" className="mt-1 text-[11px] text-red-700">{fieldError('password')}</p>}
        </div>
        <div>
          <label htmlFor="register-confirm-password" className="mb-1.5 block text-xs font-medium text-slate-700">Confirm password<span className="ml-1 text-red-600" aria-hidden="true">*</span></label>
          <div className={`flex rounded-lg border ${fieldError('confirmPassword') ? 'border-red-500' : 'border-slate-200'} focus-within:border-nu-navy focus-within:ring-2 focus-within:ring-nu-navy/20`}>
            <input id="register-confirm-password" name="confirmPassword" required type={showConfirmation ? 'text' : 'password'} autoComplete="new-password" value={values.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))} aria-invalid={Boolean(fieldError('confirmPassword'))} aria-describedby={fieldError('confirmPassword') ? 'confirm-password-error' : undefined} className="min-w-0 flex-1 rounded-l-lg px-3 py-2.5 text-sm outline-none" placeholder="Enter your password again" />
            <PasswordVisibilityToggle visible={showConfirmation} onToggle={() => setShowConfirmation((current) => !current)} controls="register-confirm-password" label="confirmation password" />
          </div>
          {fieldError('confirmPassword') && <p aria-live="polite" id="confirm-password-error" className="mt-1 text-[11px] text-red-700">{fieldError('confirmPassword')}</p>}
        </div>
        {formError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800">{formError}</p>}
        <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-nu-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-nu-dark focus:outline-none focus:ring-2 focus:ring-nu-navy focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
          {isSubmitting ? 'Sending verification code…' : 'Create Account'}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-600">Already have an account? <Link to="/" className="font-semibold text-nu-navy underline-offset-2 hover:underline">Log in</Link></p>
    </AuthLayout>
  );
}
