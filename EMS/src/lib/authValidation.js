export const emailPattern = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+$/i;
export const studentIdPattern = /^\d{4}-\d{6}$/;
export const namePattern = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;

export function validateEmail(value) {
  if (!value.trim()) return 'Email is required.';
  const email = value.trim();
  const localPart = email.split('@')[0];
  if (email.length > 254 || localPart.length > 64 || !emailPattern.test(email)
    || localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) return 'Enter a valid email address.';
  return '';
}

export function validateName(value, required = true) {
  const trimmed = value.trim();
  if (!trimmed) return required ? 'This field is required.' : '';
  if (!namePattern.test(trimmed)) return 'Use letters, spaces, apostrophes, or hyphens only.';
  return '';
}

export function validateStudentId(value) {
  if (!value.trim()) return 'Student ID is required.';
  if (!studentIdPattern.test(value.trim())) return 'Use the format YYYY-######.';
  return '';
}

export function validatePassword(value) {
  if (!value) return 'Password is required.';
  if (value.length < 8) return 'Use at least 8 characters.';
  if (new TextEncoder().encode(value).length > 72) return 'Password is too long. Use fewer characters.';
  if (!/\p{Ll}/u.test(value) || !/\p{Lu}/u.test(value) || !/\d/.test(value) || !/[^\p{L}\p{N}\s]/u.test(value)) {
    return 'Include uppercase and lowercase letters, a number, and a symbol.';
  }
  return '';
}

export const sanitizeName = (value) => value.replace(/[^\p{L}\p{M} '\u2019-]/gu, '');
export const sanitizeStudentId = (value) => value.replace(/[^\d-]/g, '').slice(0, 11);
