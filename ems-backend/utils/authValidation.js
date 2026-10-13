const emailPattern = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+$/i;

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

export const YEAR_LEVEL_OPTIONS = [
    '1st Year',
    '2nd Year',
    '3rd Year',
    '4th Year',
    '5th Year',
    '6th Year',
    '7th Year',
];

export const isValidEmail = (email) => {
    const localPart = email.split('@')[0];
    return email.length <= 254 && localPart.length <= 64 && emailPattern.test(email)
        && !localPart.startsWith('.') && !localPart.endsWith('.') && !localPart.includes('..');
};

export const passwordValidationError = (password) => {
    if (password.length < 8 || !/\p{Ll}/u.test(password) || !/\p{Lu}/u.test(password)
        || !/\d/.test(password) || !/[^\p{L}\p{N}\s]/u.test(password)) {
        return 'Password must be at least 8 characters and include uppercase and lowercase letters, a number, and a symbol';
    }
    if (Buffer.byteLength(password, 'utf8') > 72) return 'Password is too long. Use fewer characters.';
    return '';
};

export const yearLevelValidationError = (yearLevel) => {
    if (typeof yearLevel !== 'string' || !yearLevel.trim()) return 'Year level is required';
    if (yearLevel.trim().length > 40) return 'Year level must be 40 characters or fewer';
    if (!YEAR_LEVEL_OPTIONS.includes(yearLevel.trim())) return 'Please select a valid year level';
    return '';
};

export const programValidationError = (program) => {
    if (typeof program !== 'string' || !program.trim()) return 'Program is required';
    if (!PROGRAM_OPTIONS.includes(program.trim())) return 'Please select a valid program';
    return '';
};
