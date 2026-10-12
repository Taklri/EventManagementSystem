import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55',
  {
    variants: {
      variant: {
        default: 'bg-nu-navy text-white hover:bg-nu-dark',
        outline:
          'border border-slate-200 bg-white text-nu-navy hover:border-nu-navy hover:bg-slate-50',
        ghost: 'text-nu-navy hover:bg-slate-100',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export const Button = ({ asChild = false, className, variant, ...props }) => {
  const Component = asChild ? Slot : 'button';
  return <Component className={cn(buttonVariants({ variant }), className)} {...props} />;
};
