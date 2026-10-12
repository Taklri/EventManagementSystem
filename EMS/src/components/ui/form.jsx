import { FormProvider } from 'react-hook-form';

export const Form = FormProvider;

export const FormMessage = ({ id, children }) => {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs font-medium leading-5 text-red-700">
      {children}
    </p>
  );
};
