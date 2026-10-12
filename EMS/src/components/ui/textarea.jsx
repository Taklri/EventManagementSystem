import { cn } from '../../lib/utils';

export const Textarea = ({ className, ...props }) => {
  return (
    <textarea
      className={cn(
        'flex min-h-32 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-nu-dark outline-none transition placeholder:text-slate-400 focus:border-nu-navy focus:ring-2 focus:ring-nu-navy/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
};
