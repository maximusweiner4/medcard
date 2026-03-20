import Toast from 'react-native-toast-message';

export function showSuccess(message: string) {
  Toast.show({ type: 'success', text1: message, visibilityTime: 3000 });
}

export function showError(message: string) {
  Toast.show({ type: 'error', text1: message, visibilityTime: 4000 });
}

/** Maps raw API / Supabase errors to plain-English messages for elderly users. */
export function friendlyError(err: any): string {
  const msg: string = err?.response?.data?.error || err?.message || '';
  if (/invalid.*(login|credentials)/i.test(msg) || msg.includes('invalid_grant'))
    return 'Email or password is incorrect. Please try again.';
  if (/email.*not.*confirmed|email_not_confirmed/i.test(msg))
    return 'Please confirm your email address before signing in.';
  if (/already registered|user.*exists/i.test(msg))
    return 'An account with this email already exists. Try signing in instead.';
  if (/password.*at least/i.test(msg))
    return 'Password must be at least 6 characters long.';
  if (/validate email|invalid.*email/i.test(msg))
    return 'Please enter a valid email address.';
  if (/no account found/i.test(msg))
    return 'No account found with that email. Ask them to sign up first.';
  if (/admin permission/i.test(msg))
    return 'You need admin permission to make this change.';
  if (/unique constraint/i.test(msg))
    return 'This record already exists.';
  return msg || 'Something went wrong. Please try again.';
}
