import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useWatch } from 'react-hook-form';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

const TYPES = [
  ['text', 'Text'],
  ['multipleChoice', 'Multiple choice'],
  ['multipleAnswer', 'Multiple answers'],
  ['dropdown', 'Dropdown'],
  ['instructions', 'Instructions'],
];

const CHOICE_TYPES = ['multipleChoice', 'multipleAnswer', 'dropdown'];
const isChoice = (type) => CHOICE_TYPES.includes(type);
const getOptionLimit = (type) => (type === 'multipleChoice' ? 10 : 12);

const FormItemEditor = ({ form, index, itemError, disabled, locked, itemCount, fields }) => {
  const prefix = `registrationForm.items.${index}`;
  const value = useWatch({ control: form.control, name: prefix }) || {};
  const options = useFieldArray({ control: form.control, name: `${prefix}.options` });
  const choice = isChoice(value.type);
  const optionLimit = getOptionLimit(value.type);
  const typeField = form.register(`${prefix}.type`);

  const handleTypeChange = (event) => {
    const nextType = event.target.value;
    typeField.onChange(event);
    form.setValue(`${prefix}.type`, nextType, { shouldDirty: true, shouldValidate: true });
    if (isChoice(nextType) && !(value.options || []).length) {
      options.append({ value: '' });
      options.append({ value: '' });
    }
  };

  return (
    <fieldset
      disabled={disabled || locked}
      className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <legend className="sr-only">Item {index + 1}</legend>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <p className="text-sm font-semibold text-nu-dark">Item {index + 1}</p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            className="h-9 min-h-9 w-9 p-0"
            aria-label={`Move item ${index + 1} up`}
            title="Move up"
            disabled={disabled || locked || index === 0}
            onClick={() => fields.move(index, index - 1)}
          >
            <ArrowUp size={16} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-9 min-h-9 w-9 p-0"
            aria-label={`Move item ${index + 1} down`}
            title="Move down"
            disabled={disabled || locked || index === itemCount - 1}
            onClick={() => fields.move(index, index + 1)}
          >
            <ArrowDown size={16} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-9 min-h-9 w-9 p-0 text-red-700 hover:text-red-800"
            aria-label={`Remove item ${index + 1}`}
            title="Remove item"
            disabled={disabled || locked}
            onClick={() => fields.remove(index)}
          >
            <Trash2 size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>

      <input type="hidden" {...form.register(`${prefix}.key`)} />
      <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <Label htmlFor={`form-type-${index}`}>Item type</Label>
          <div className="relative mt-2">
            <select
              id={`form-type-${index}`}
              {...typeField}
              className="min-h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy"
              value={value.type || 'text'}
              onChange={handleTypeChange}
            >
              {TYPES.map(([type, label]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={17}
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
          </div>
          {itemError.type?.message && (
            <p role="alert" className="mt-1 text-xs text-red-700">
              {itemError.type.message}
            </p>
          )}
        </div>
        {value.type !== 'instructions' && (
          <label className="flex min-h-11 items-center gap-2 text-sm text-nu-dark">
            <input
              type="checkbox"
              className="h-4 w-4 accent-nu-navy"
              {...form.register(`${prefix}.required`)}
            />
            Required answer
          </label>
        )}
      </div>

      <div className="mt-5">
        <Label htmlFor={`form-label-${index}`}>
          {value.type === 'instructions' ? 'Instruction text' : 'Question'}
        </Label>
        {value.type === 'instructions' ? (
          <Textarea
            id={`form-label-${index}`}
            rows={3}
            className="mt-2"
            placeholder="Information students should read before registering"
            {...form.register(`${prefix}.label`)}
          />
        ) : (
          <Input
            id={`form-label-${index}`}
            className="mt-2"
            placeholder="Write a clear question"
            minLength={value.type === 'text' ? 5 : 2}
            maxLength={value.type === 'text' ? 100 : 160}
            {...form.register(`${prefix}.label`)}
          />
        )}
        {itemError.label?.message && (
          <p role="alert" className="mt-1 text-xs text-red-700">
            {itemError.label.message}
          </p>
        )}
      </div>

      {value.type !== 'instructions' && (
        <div className="mt-5">
          <Label htmlFor={`form-help-${index}`}>Help text (optional)</Label>
          <Input
            id={`form-help-${index}`}
            className="mt-2"
            placeholder="Add a short hint"
            {...form.register(`${prefix}.helpText`)}
          />
          {itemError.helpText?.message && (
            <p role="alert" className="mt-1 text-xs text-red-700">
              {itemError.helpText.message}
            </p>
          )}
        </div>
      )}

      {choice && (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-nu-dark">Answer options</p>
              <p className="mt-1 text-xs text-slate-500">
                {value.type === 'multipleAnswer'
                  ? 'Students can select more than one answer.'
                  : 'Students can select one answer.'}
              </p>
            </div>
            <span className="text-xs text-slate-400">
              {options.fields.length}/{optionLimit}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {options.fields.map((option, optionIndex) => (
              <div key={option.id} className="flex items-center gap-2">
                <span className="w-5 text-center text-xs font-medium text-slate-400">
                  {optionIndex + 1}
                </span>
                <Input
                  aria-label={`Option ${optionIndex + 1}`}
                  placeholder={`Option ${optionIndex + 1}`}
                  {...form.register(`${prefix}.options.${optionIndex}.value`)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 min-h-9 w-9 shrink-0 p-0 text-slate-500 hover:text-red-700"
                  aria-label={`Remove option ${optionIndex + 1}`}
                  title="Remove option"
                  disabled={options.fields.length <= 2}
                  onClick={() => options.remove(optionIndex)}
                >
                  <Trash2 size={15} aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-9 min-h-9"
            disabled={options.fields.length >= optionLimit}
            onClick={() => options.append({ value: '' })}
          >
            <Plus size={15} aria-hidden="true" />
            Add option
          </Button>
          {(itemError.options?.message || itemError.optionsText?.message) && (
            <p role="alert" className="mt-2 text-xs text-red-700">
              {itemError.options?.message || itemError.optionsText?.message}
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
};

const RegistrationFormBuilder = ({ form, fields, errors, locked, disabled, allowAdd = true }) => {
  const itemErrors = errors.registrationForm?.items || [];
  const itemCount = fields.fields.length;

  const appendItem = () => {
    fields.append({
      key: crypto.randomUUID(),
      type: 'text',
      label: '',
      helpText: '',
      required: false,
      options: [],
    });
  };

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-7"
      aria-labelledby="form-builder-heading"
    >
      <div>
        <h2 id="form-builder-heading" className="text-base font-semibold text-nu-dark sm:text-lg">
          Questions
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Add questions or instruction blocks. Student identity is recorded automatically.
        </p>
      </div>

      {locked && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Students have already submitted this form, so its questions are locked.
        </p>
      )}
      {errors.registrationForm?.message && (
        <p role="alert" className="mt-4 text-xs text-red-700">
          {errors.registrationForm.message}
        </p>
      )}

      {itemCount === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
          <p className="text-sm font-medium text-nu-dark">No questions yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Add your first question below. You can also save an empty form for later.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {fields.fields.map((field, index) => (
            <FormItemEditor
              key={field.id}
              form={form}
              fields={fields}
              index={index}
              itemError={itemErrors[index] || {}}
              itemCount={itemCount}
              disabled={disabled}
              locked={locked}
            />
          ))}
        </div>
      )}

      {allowAdd && (
        <div className="mt-5 flex flex-col items-center gap-2 border-t border-slate-200 pt-5">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            disabled={disabled || locked || itemCount >= 12}
            onClick={appendItem}
          >
            <Plus size={16} aria-hidden="true" />
            Add question
          </Button>
          <p className="text-xs text-slate-500">Up to 12 items per form.</p>
        </div>
      )}
    </section>
  );
};

export default RegistrationFormBuilder;
