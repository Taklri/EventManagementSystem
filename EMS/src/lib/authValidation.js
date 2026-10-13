export const emailPattern = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+$/i;
export const studentIdPattern = /^\d{4}-\d{6}$/;
export const namePattern = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;
export const YEAR_LEVEL_OPTIONS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  '5th Year',
  '6th Year',
  '7th Year',
];
export const PROGRAM_OPTIONS = [
  'Bachelor of Science in Accountancy',
  'Bachelor of Science in Business Administration (Majors in Financial Management & Marketing Management)',
  'Bachelor of Science in Management Accounting',
  'Bachelor of Science in Hospitality Management',
  'Bachelor of Science in Tourism Management',
  'Bachelor of Science in Architecture',
  'Bachelor of Science in Computer Science',
  'Bachelor of Science in Information Technology with specialization in Mobile and Web Applications',
  'Bachelor of Science in Psychology',
  'Bachelor of Science in Nursing',
  'Bachelor of Science in Medical Technology',
  'Doctor of Optometry',
  'Doctor of Dental Medicine',
  'Dental Hygiene IV',
  'Dental Technology NC IV',
];

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

export function validateYearLevel(value) {
  const trimmed = value.trim();
  if (!trimmed) return 'Year level is required.';
  if (!YEAR_LEVEL_OPTIONS.includes(trimmed)) return 'Select a valid year level.';
  return '';
}

export function validateProgram(value) {
  if (!value) return 'Program is required.';
  return PROGRAM_OPTIONS.includes(value) ? '' : 'Select a valid program.';
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
