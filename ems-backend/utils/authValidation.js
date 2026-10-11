const emailPattern = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+$/i;

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
