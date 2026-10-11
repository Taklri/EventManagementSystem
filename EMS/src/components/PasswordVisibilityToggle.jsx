import { Eye, EyeOff } from 'lucide-react';

export default function PasswordVisibilityToggle({ visible, onToggle, controls, label = 'password' }) {
  const Icon = visible ? EyeOff : Eye;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${visible ? 'Hide' : 'Show'} ${label}`}
      aria-controls={controls}
      title={`${visible ? 'Hide' : 'Show'} ${label}`}
      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-r-lg text-nu-navy transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nu-navy"
    >
      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
