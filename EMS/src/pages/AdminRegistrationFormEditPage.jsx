import { useEffect, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import RegistrationFormBuilder from '../components/RegistrationFormBuilder';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../lib/api';

const toEditorItems = (items = []) =>
  items.map((item) => ({
    ...item,
    type:
      item.type === 'radio' || item.type === 'shortText' || item.type === 'longText'
        ? item.type === 'radio'
          ? 'multipleChoice'
          : 'text'
        : item.type,
    options: Array.isArray(item.options)
      ? item.options.map((option) => ({
          value: typeof option === 'string' ? option : option.value || '',
        }))
      : [],
  }));
const toPayloadItems = (items = []) =>
  items.map((item) => ({
    key: item.key,
    type: item.type,
    label: item.label.trim(),
    helpText: (item.helpText || '').trim(),
    required: item.type === 'instructions' ? false : Boolean(item.required),
    options: ['multipleChoice', 'multipleAnswer', 'dropdown'].includes(item.type)
      ? (item.options || [])
          .map((option) => (typeof option === 'string' ? option : option.value || '').trim())
          .filter(Boolean)
      : [],
  }));
const itemSchema = z.object({
  key: z.string().min(1),
  type: z.enum(['text', 'multipleChoice', 'multipleAnswer', 'dropdown', 'instructions']),
  label: z.string().trim().min(2, 'Write at least 2 characters.').max(1000),
  helpText: z.string().trim().max(500),
  required: z.boolean(),
  options: z.array(z.object({ value: z.string() })),
});
const editorSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'Form name must be at least 3 characters.')
      .max(120, 'Form name must be 120 characters or fewer.'),
    description: z.string().trim().max(500, 'Description must be 500 characters or fewer.'),
    registrationForm: z.object({ items: z.array(itemSchema).max(12, 'Use up to 12 form items.') }),
  })
  .superRefine((values, context) => {
    values.registrationForm.items.forEach((item, index) => {
      if (
        item.type === 'text' &&
        (item.label.trim().length < 5 || item.label.trim().length > 100)
      ) {
        context.addIssue({
          code: 'custom',
          path: ['registrationForm', 'items', index, 'label'],
          message: 'Text questions must be 5 to 100 characters.',
        });
      }
      if (!['multipleChoice', 'multipleAnswer', 'dropdown'].includes(item.type)) return;
      const options = item.options.map((option) => option.value.trim()).filter(Boolean);
      const optionLimit = item.type === 'multipleChoice' ? 10 : 12;
      if (
        options.length < 2 ||
        options.length > optionLimit ||
        new Set(options).size !== options.length
      ) {
        context.addIssue({
          code: 'custom',
          path: ['registrationForm', 'items', index, 'options'],
          message: `Add 2 to ${optionLimit} unique options.`,
        });
      }
    });
  });

const AdminRegistrationFormEditPage = () => {
  const { id } = useParams();
  const editing = Boolean(id);
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: editing, saving: false, error: '' });
  const form = useForm({
    resolver: zodResolver(editorSchema),
    mode: 'onChange',
    defaultValues: { name: '', description: '', registrationForm: { items: [] } },
  });
  const fields = useFieldArray({ control: form.control, name: 'registrationForm.items' });
  const errors = form.formState.errors;

  useEffect(() => {
    if (!editing) return undefined;
    let active = true;
    adminApi
      .registrationForm(id, accessToken)
      .then((result) => {
        if (active)
          form.reset({
            name: result.form.name,
            description: result.form.description || '',
            registrationForm: { items: toEditorItems(result.form.items) },
          });
      })
      .catch((error) => {
        if (active)
          setState({
            loading: false,
            saving: false,
            error: error.message || 'Unable to load this form.',
          });
      })
      .finally(() => {
        if (active) setState((current) => ({ ...current, loading: false }));
      });
    return () => {
      active = false;
    };
  }, [accessToken, editing, form, id]);

  const submit = async (valuesToSave) => {
    setState((current) => ({ ...current, saving: true, error: '' }));
    try {
      const body = {
        name: valuesToSave.name.trim(),
        description: valuesToSave.description.trim(),
        items: toPayloadItems(valuesToSave.registrationForm?.items),
      };
      if (editing) await adminApi.updateRegistrationForm(id, body, accessToken);
      else await adminApi.createRegistrationForm(body, accessToken);
      navigate('/admin/registration-forms', { replace: true });
    } catch (error) {
      (error.issues || []).forEach((issue) => {
        if (issue.path && issue.message) {
          form.setError(issue.path, { type: 'server', message: issue.message });
        }
      });
      if (error.field)
        form.setError(error.field === 'items' ? 'registrationForm' : error.field, {
          type: 'server',
          message: error.message,
        });
      setState((current) => ({
        ...current,
        saving: false,
        error: error.message || 'Unable to save registration form.',
      }));
    }
  };

  if (state.loading)
    return (
      <div
        role="status"
        className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500"
      >
        Loading form…
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        to="/admin/registration-forms"
        className="inline-flex items-center gap-2 text-sm font-semibold text-nu-navy underline"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Back to registration forms
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Registration forms
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-nu-dark">
          {editing ? 'Edit registration form' : 'Create registration form'}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Keep questions focused. Student identity is provided by the signed-in school account.
        </p>
      </header>
      <form onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-5">
        <section className="order-1 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="text-lg font-semibold text-nu-dark">Form details</h2>
          <div className="mt-5 grid gap-5">
            <div>
              <Label htmlFor="form-name">Name</Label>
              <Input
                id="form-name"
                className="mt-2"
                placeholder="e.g. Leadership summit registration"
                {...form.register('name', { required: 'Form name is required.' })}
              />
              {errors.name?.message && (
                <p className="mt-1 text-xs text-red-700">{errors.name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="form-description">Description (optional)</Label>
              <Textarea
                id="form-description"
                className="mt-2"
                rows={3}
                maxLength={500}
                placeholder="Explain when this form should be used."
                {...form.register('description')}
              />
            </div>
          </div>
        </section>
        <div className="order-2">
          <RegistrationFormBuilder
            form={form}
            fields={fields}
            errors={errors}
            disabled={state.saving}
            allowAdd
          />
        </div>
        {state.error && (
          <p
            role="alert"
            className="order-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {state.error}
          </p>
        )}
        <div className="order-4 flex flex-col-reverse justify-end gap-2 border-t border-slate-200 pt-5 sm:flex-row">
          <Button asChild variant="outline">
            <Link to="/admin/registration-forms">Cancel</Link>
          </Button>
          <Button type="submit" disabled={state.saving}>
            <Save size={16} aria-hidden="true" />
            {state.saving ? 'Saving…' : editing ? 'Save form' : 'Create form'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminRegistrationFormEditPage;
