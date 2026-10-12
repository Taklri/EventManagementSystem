import { Toaster as SonnerToaster } from 'sonner';

export const Toaster = () => (
  <SonnerToaster
    position="top-right"
    closeButton
    toastOptions={{
      duration: 4000,
      classNames: {
        toast: 'font-sans rounded-xl border border-slate-200 bg-white text-nu-dark shadow-sm',
        title: 'text-sm font-medium',
        success: 'border-green-200',
      },
    }}
  />
);
