export function validateEmail(email: string): boolean {
  if (!email || email.length > 255) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function validatePasswordStrength(password: string): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character' };
  }
  return { isValid: true };
}

export function validatePhone(phone?: string | null): boolean {
  if (!phone) return true; // Phone is optional
  if (phone.length < 10 || phone.length > 15) return false;
  const regex = /^\+?[0-9\s\-]+$/;
  return regex.test(phone);
}

export function validateName(name: string): boolean {
  if (!name || name.trim().length === 0 || name.length > 50) return false;
  // Allows letters, spaces, apostrophes, and hyphens
  const regex = /^[a-zA-Z\s'\-]+$/;
  return regex.test(name);
}
