import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ChevronDown, ImagePlus, Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import { EventDatePicker, EventTimePicker } from '../components/ui/event-schedule-picker';
import { Form, FormMessage } from '../components/ui/form';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../lib/api';
import { getCampusNowParts, getCampusToday } from '../lib/campusDate';
import { organizerName, toCampusInputParts } from '../lib/eventFormatting';
import { toast } from 'sonner';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const EVENT_TYPES = [
  'Seminar',
  'Workshop',
  'Webinar',
  'Conference',
  'Performance',
  'Sports',
  'Orientation',
  'Other',
];

const createClientKey = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const values = new Uint32Array(4);
    globalThis.crypto.getRandomValues(values);
    return `speaker-${Array.from(values)
      .map((value) => value.toString(16))
      .join('-')}`;
  }

  return `speaker-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const requiredText = (label, min, max) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

const validDay = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const [, year, month, day] = match.map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
};

const validTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const timeToMinutes = (value) => {
  if (!validTime(value)) return null;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
};

const maxTime = (values) => {
  const validValues = values.filter((value) => timeToMinutes(value) !== null);
  return validValues.reduce(
    (current, value) =>
      current === undefined || timeToMinutes(value) > timeToMinutes(current) ? value : current,
    undefined,
  );
};

const minTime = (values) => {
  const validValues = values.filter((value) => timeToMinutes(value) !== null);
  return validValues.reduce(
    (current, value) =>
      current === undefined || timeToMinutes(value) < timeToMinutes(current) ? value : current,
    undefined,
  );
};

const campusMinutes = (day, time) => {
  if (!validDay(day) || !validTime(time)) return null;
  const [year, month, date] = day.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return Math.floor(Date.UTC(year, month - 1, date, hour, minute) / 60000);
};

const campusPartsFromMinutes = (minutes) => {
  const value = new Date(minutes * 60000);
  return {
    day: value.toISOString().slice(0, 10),
    time: value.toISOString().slice(11, 16),
  };
};

const shiftCampusParts = (day, time, delta) => {
  const minutes = campusMinutes(day, time);
  return minutes === null ? null : campusPartsFromMinutes(minutes + delta);
};

const persistedAgendaMinutes = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : Math.floor(date.getTime() / 60000);
};

const hasAgendaOverlap = (agenda = []) => agenda.some((item, index) => {
  if (index === 0) return false;
  const start = persistedAgendaMinutes(item?.startDate);
  const previousEnd = persistedAgendaMinutes(agenda[index - 1]?.endDate);
  return start !== null && previousEnd !== null && start < previousEnd;
});

const laterDay = (values) =>
  values
    .filter((value) => validDay(value))
    .reduce((current, value) => (!current || value > current ? value : current), undefined);

const campusParts = (value) => {
  const parts = toCampusInputParts(value);
  return { day: parts.day || '', time: parts.time || '' };
};

const structuredSchema = {
  eventType: z.enum(EVENT_TYPES, { message: 'Choose an event type.' }),
  speakers: z
    .array(
      z.object({
        clientKey: z.string().min(1),
        name: requiredText('Speaker name', 2, 120),
        role: requiredText('Speaker role', 2, 120),
      }),
    )
    .max(30),
  agenda: z
    .array(
      z.object({
        title: requiredText('Agenda title', 2, 160),
        description: z.string().trim().max(500),
        startDay: z.string().refine(validDay, 'Choose a valid agenda date.'),
        startTime: z.string().refine(validTime, 'Choose a valid agenda time.'),
        endDay: z.string().refine(validDay, 'Choose a valid agenda date.'),
        endTime: z.string().refine(validTime, 'Choose a valid agenda time.'),
        speakerKeys: z.array(z.string()),
      }),
    )
    .max(40),
  requirements: z.array(z.object({ value: z.string().trim().min(1).max(240) })).max(20),
  reminders: z.array(z.object({ value: z.string().trim().min(1).max(240) })).max(20),
  registrationMode: z.enum(['none', 'required']),
  capacity: z.string().optional(),
  registrationFormId: z.string().optional(),
};

const buildSchema = (allowPastDates = false, allowLegacyAgendaOverlap = false) =>
  z
    .object({
      title: requiredText('Title', 3, 120),
      description: requiredText('Description', 10, 1000),
      location: requiredText('Location', 3, 500),
      organizerName: requiredText('Organization name', 3, 120),
      startDay: z.string().refine(validDay, 'Choose a valid start date.'),
      startTime: z.string().refine(validTime, 'Choose a valid start time.'),
      endDay: z.string().refine(validDay, 'Choose a valid end date.'),
      endTime: z.string().refine(validTime, 'Choose a valid end time.'),
      ...structuredSchema,
    })
    .superRefine((values, context) => {
      const today = getCampusToday();
      const campusNow = getCampusNowParts();
      if (!allowPastDates && validDay(values.startDay) && values.startDay < today) {
        context.addIssue({
          code: 'custom',
          path: ['startDay'],
          message: 'Start date cannot be before today.',
        });
      }
      if (
        !allowPastDates &&
        validDay(values.startDay) &&
        validTime(values.startTime) &&
        `${values.startDay}T${values.startTime}` <= `${campusNow.day}T${campusNow.time}`
      ) {
        context.addIssue({
          code: 'custom',
          path: ['startTime'],
          message: 'Start date and time must be in the future.',
        });
      }
      if (!allowPastDates && validDay(values.endDay) && values.endDay < today) {
        context.addIssue({
          code: 'custom',
          path: ['endDay'],
          message: 'End date cannot be before today.',
        });
      }
      if (
        validDay(values.startDay) &&
        validDay(values.endDay) &&
        validTime(values.startTime) &&
        validTime(values.endTime) &&
        `${values.endDay}T${values.endTime}` <= `${values.startDay}T${values.startTime}`
      ) {
        context.addIssue({
          code: 'custom',
          path: ['endDay'],
          message: 'The event must end after it starts.',
        });
      }

      if (
        values.registrationMode === 'required' &&
        values.capacity &&
        !/^\d+$/.test(values.capacity)
      ) {
        context.addIssue({
          code: 'custom',
          path: ['capacity'],
          message: 'Capacity must be a whole number.',
        });
      }
      if (values.registrationMode === 'required' && !values.registrationFormId) {
        context.addIssue({
          code: 'custom',
          path: ['registrationFormId'],
          message: 'Choose a registration form.',
        });
      }
      if (
        values.registrationMode === 'required' &&
        values.capacity &&
        Number(values.capacity) < 1
      ) {
        context.addIssue({
          code: 'custom',
          path: ['capacity'],
          message: 'Capacity must be at least 1.',
        });
      }
      values.agenda.forEach((item, index) => {
        const hasValidAgendaRange =
          validDay(item.startDay) &&
          validTime(item.startTime) &&
          validDay(item.endDay) &&
          validTime(item.endTime);
        if (
          hasValidAgendaRange &&
          `${item.endDay}T${item.endTime}` <= `${item.startDay}T${item.startTime}`
        ) {
          context.addIssue({
            code: 'custom',
            path: ['agenda', index, 'endDay'],
            message: 'Program end must be after its start.',
          });
        }
        if (
          validDay(values.startDay) &&
          validDay(values.endDay) &&
          validTime(values.startTime) &&
          validTime(values.endTime) &&
          hasValidAgendaRange
        ) {
          if (`${item.startDay}T${item.startTime}` < `${values.startDay}T${values.startTime}`) {
            context.addIssue({
              code: 'custom',
              path: ['agenda', index, 'startDay'],
              message: 'Program start must stay inside the event schedule.',
            });
          }
          if (`${item.endDay}T${item.endTime}` > `${values.endDay}T${values.endTime}`) {
            context.addIssue({
              code: 'custom',
              path: ['agenda', index, 'endDay'],
              message: 'Program end must stay inside the event schedule.',
            });
          }
        }
        const speakerKeys = new Set(values.speakers.map((speaker) => speaker.clientKey));
        (item.speakerKeys || []).forEach((key) => {
          if (!speakerKeys.has(key)) {
            context.addIssue({
              code: 'custom',
              path: ['agenda', index, 'speakerKeys'],
              message: 'Choose speakers from the list above.',
            });
          }
        });
        if (!allowLegacyAgendaOverlap && index > 0) {
          const previous = values.agenda[index - 1];
          const hasComparableTimes =
            validDay(item.startDay) &&
            validTime(item.startTime) &&
            validDay(previous.endDay) &&
            validTime(previous.endTime);
          if (
            hasComparableTimes &&
            `${item.startDay}T${item.startTime}` < `${previous.endDay}T${previous.endTime}`
          ) {
            context.addIssue({
              code: 'custom',
              path: ['agenda', index, 'startTime'],
              message: 'Program items cannot overlap or be out of order.',
            });
          }
        }
      });
    });

const schema = buildSchema();

const Field = ({
  id,
  label,
  error,
  help,
  required = true,
  reserveErrorSpace = false,
  children,
}) => (
  <div className="min-w-0 space-y-2">
    <Label htmlFor={id}>
      {label}
      {required && (
        <>
          {' '}
          <span className="text-red-700" aria-hidden="true">
            *
          </span>
        </>
      )}
    </Label>
    {children}
    {help && (
      <p id={`${id}-help`} className="text-xs leading-5 text-slate-500">
        {help}
      </p>
    )}
    {reserveErrorSpace ? (
      <div className="min-h-7">
        <FormMessage id={`${id}-error`}>{error}</FormMessage>
      </div>
    ) : (
      <FormMessage id={`${id}-error`}>{error}</FormMessage>
    )}
  </div>
);

const SectionHeader = ({ id, title, description }) => (
  <div className="mb-6">
    <h2 id={id} className="text-base font-semibold text-nu-dark sm:text-lg">
      {title}
    </h2>
    {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
  </div>
);

const AdminEventCreatePage = ({ event, returnTo }) => {
  const editing = Boolean(event);
  const start = event ? toCampusInputParts(event.startDate) : { day: '', time: '' };
  const end = event ? toCampusInputParts(event.endDate) : { day: '', time: '' };
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(event?.imageUrl || '');
  const [removeExistingCover, setRemoveExistingCover] = useState(false);
  const [imageError, setImageError] = useState('');
  const [formError, setFormError] = useState('');
  const [speakerFiles, setSpeakerFiles] = useState({});
  const [speakerPreviews, setSpeakerPreviews] = useState({});
  const [removeSpeakerKeys, setRemoveSpeakerKeys] = useState([]);
  const [registrationForms, setRegistrationForms] = useState([]);
  const [formSearch, setFormSearch] = useState('');
  const [formPickerOpen, setFormPickerOpen] = useState(false);
  const formPickerRef = useRef(null);
  const [formsLoading, setFormsLoading] = useState(false);
  const [formsError, setFormsError] = useState('');

  const defaultSpeakers = (event?.speakers || []).map((speaker) => ({
    clientKey: speaker.clientKey || createClientKey(),
    name: speaker.name || '',
    role: speaker.role || '',
    photoUrl: speaker.photoUrl || '',
  }));
  const defaultAgenda = (event?.agenda || []).map((item) => {
    const agendaStart = campusParts(item.startDate);
    const agendaEnd = campusParts(item.endDate);
    return {
      title: item.title || '',
      description: item.description || '',
      startDay: agendaStart.day,
      startTime: agendaStart.time,
      endDay: agendaEnd.day,
      endTime: agendaEnd.time,
      speakerKeys: item.speakerKeys || [],
    };
  });

  const validationSchema = editing
    ? buildSchema(true, hasAgendaOverlap(event?.agenda || []))
    : schema;

  const form = useForm({
    resolver: zodResolver(validationSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      title: event?.title || '',
      description: event?.description || '',
      location: event?.location || '',
      organizerName: event ? organizerName(event) : '',
      startDay: start.day,
      startTime: start.time,
      endDay: end.day,
      endTime: end.time,
      eventType: event?.eventType || 'Other',
      speakers: defaultSpeakers,
      agenda: defaultAgenda,
      requirements: (event?.requirements || []).map((value) => ({ value })),
      reminders: (event?.reminders || []).map((value) => ({ value })),
      registrationMode: event?.registrationMode || 'none',
      registrationFormId:
        event?.registrationFormId ||
        (editing && event?.registrationForm?.items?.length ? 'legacy' : ''),
      capacity: event?.capacity ? String(event.capacity) : '',
    },
  });

  const agendaFields = useFieldArray({ control: form.control, name: 'agenda' });
  const speakerFields = useFieldArray({ control: form.control, name: 'speakers' });
  const requirementFields = useFieldArray({ control: form.control, name: 'requirements' });
  const reminderFields = useFieldArray({ control: form.control, name: 'reminders' });

  const {
    register,
    handleSubmit,
    getValues,
    clearErrors,
    setError,
    setValue,
    trigger,
    formState: { errors, isSubmitting, isSubmitted },
  } = form;

  useEffect(
    () => () => {
      if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview],
  );

  useEffect(() => {
    if (!accessToken) return undefined;
    let active = true;
    adminApi
      .registrationForms({ status: 'active', limit: 50 }, accessToken)
      .then(async (result) => {
        let forms = result.forms || [];
        if (
          event?.registrationFormId &&
          !forms.some((item) => item._id === event.registrationFormId)
        ) {
          try {
            const selected = await adminApi.registrationForm(event.registrationFormId, accessToken);
            forms = [...forms, selected.form];
          } catch {
            // Keep the existing selected id visible through the archived warning.
          }
        }
        if (active) setRegistrationForms(forms);
      })
      .catch((error) => {
        if (active) setFormsError(error.message || 'Unable to load registration forms.');
      })
      .finally(() => {
        if (active) setFormsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken, event?.registrationFormId]);

  useEffect(() => {
    if (!formPickerOpen) return undefined;

    const handlePointerDown = (pointerEvent) => {
      if (!formPickerRef.current?.contains(pointerEvent.target)) {
        setFormPickerOpen(false);
        setFormSearch('');
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [formPickerOpen]);

  const chooseImage = (file) => {
    setImageError('');
    if (!file) return;

    if (!IMAGE_TYPES.includes(file.type)) {
      setImageError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('The image must be 5 MB or smaller.');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveExistingCover(false);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    if (editing && event.imageUrl) setRemoveExistingCover(true);
    setImageError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const selectRegistrationForm = (formId) => {
    setValue('registrationFormId', formId, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setFormSearch('');
    setFormPickerOpen(false);
  };

  const submit = async (values) => {
    setFormError('');
    const body = new FormData();
    for (const key of ['title', 'description', 'location', 'organizerName']) {
      body.append(key, values[key].trim());
    }
    body.append('startDate', `${values.startDay}T${values.startTime}`);
    body.append('endDate', `${values.endDay}T${values.endTime}`);
    body.append('eventType', values.eventType);
    body.append(
      'requirements',
      JSON.stringify(values.requirements.map((item) => item.value.trim()).filter(Boolean)),
    );
    body.append(
      'reminders',
      JSON.stringify(values.reminders.map((item) => item.value.trim()).filter(Boolean)),
    );
    body.append('registrationMode', values.registrationMode);
    if (values.registrationMode === 'none') body.append('registrationFormId', '');
    else if (values.registrationFormId && values.registrationFormId !== 'legacy') {
      body.append('registrationFormId', values.registrationFormId);
    }
    if (values.capacity) body.append('capacity', values.capacity);
    body.append(
      'speakers',
      JSON.stringify(
        values.speakers.map(({ clientKey, name, role }) => ({
          clientKey,
          name: name.trim(),
          role: role.trim(),
        })),
      ),
    );
    body.append(
      'agenda',
      JSON.stringify(
        values.agenda.map((item) => ({
          title: item.title.trim(),
          description: item.description.trim(),
          startDate: `${item.startDay}T${item.startTime}`,
          endDate: `${item.endDay}T${item.endTime}`,
          speakerKeys: item.speakerKeys,
        })),
      ),
    );
    const speakerImageEntries = Object.entries(speakerFiles);
    body.append('speakerImageKeys', JSON.stringify(speakerImageEntries.map(([key]) => key)));
    for (const [, file] of speakerImageEntries) body.append('speakerImages', file);
    if (removeSpeakerKeys.length)
      body.append('removeSpeakerImageKeys', JSON.stringify(removeSpeakerKeys));
    if (imageFile) body.append('coverImage', imageFile);
    if (editing && removeExistingCover && !imageFile) body.append('removeCoverImage', 'true');

    try {
      if (editing) {
        await adminApi.updateEvent(event._id, body, accessToken);
        toast.success('Event updated successfully.');
        navigate(`/admin/events/${event._id}`, { replace: true, state: { returnTo } });
      } else {
        await adminApi.createEvent(body, accessToken);
        navigate('/admin', { replace: true, state: { eventCreated: true } });
      }
    } catch (error) {
      const fieldMap = { startDate: 'startDay', endDate: 'endDay' };
      const agendaIssuePath = (path) => {
        const match = /^agenda\.(\d+)\.(.+)$/.exec(path || '');
        if (!match) return null;
        const [, index, fieldName] = match;
        const fieldMapForAgenda = { startDate: 'startDay', endDate: 'endDay' };
        return `agenda.${index}.${fieldMapForAgenda[fieldName] || fieldName}`;
      };
      if (Array.isArray(error.issues) && error.issues.length > 0) {
        for (const issue of error.issues) {
          const path = agendaIssuePath(issue.path);
          if (path) setError(path, { type: 'server', message: issue.message });
        }
        setError('agenda.root', { type: 'server', message: error.message });
        const firstIssuePath = agendaIssuePath(error.issues[0]?.path);
        if (firstIssuePath) window.requestAnimationFrame(() => focusAgendaField(firstIssuePath));
        return;
      }
      const field = fieldMap[error.field] || error.field;
      if (field === 'coverImage') {
        setImageError(error.message);
      } else if (field === 'agenda') {
        setError('agenda.root', { type: 'server', message: error.message });
      } else if (field && Object.hasOwn(values, field)) {
        setError(field, { type: 'server', message: error.message });
      } else if (error.status === 401) {
        setFormError('Your session has expired. Please sign in again.');
      } else if (error.status === 403) {
        setFormError('Your account does not have permission to manage events.');
      } else {
        setFormError(
          error.message ||
            `Unable to ${editing ? 'update' : 'create'} the event. Please try again.`,
        );
      }
    }
  };

  const fieldClass = (name) =>
    errors[name] ? 'border-red-500 focus:border-red-600 focus:ring-red-100' : '';
  const describedBy = (name, help = false) =>
    [help ? `${name}-help` : '', errors[name] ? `${name}-error` : ''].filter(Boolean).join(' ') ||
    undefined;

  const [startDay, startTime, endDay, endTime] = useWatch({
    control: form.control,
    name: ['startDay', 'startTime', 'endDay', 'endTime'],
  });
  const agendaValues = useWatch({ control: form.control, name: 'agenda' }) || [];
  const registrationMode = useWatch({ control: form.control, name: 'registrationMode' });
  const registrationFormId = useWatch({ control: form.control, name: 'registrationFormId' });
  const speakerValues = useWatch({ control: form.control, name: 'speakers' });
  const campusNow = getCampusNowParts();
  const eventStartMinutes = campusMinutes(startDay, startTime);
  const eventEndMinutes = campusMinutes(endDay, endTime);
  const scheduleStartsInFuture =
    eventStartMinutes !== null &&
    `${startDay}T${startTime}` > `${campusNow.day}T${campusNow.time}`;

  const eventScheduleReady =
    validDay(startDay) &&
    validTime(startTime) &&
    validDay(endDay) &&
    validTime(endTime) &&
    `${endDay}T${endTime}` > `${startDay}T${startTime}` &&
    (editing || (startDay >= getCampusToday() && endDay >= getCampusToday() && scheduleStartsInFuture));

  const getAgendaTimeBounds = (agendaValue, phase, index) => {
    if (!agendaValue) return { minTime: undefined, maxTime: undefined, minTimeExclusive: false };
    const day = phase === 'start' ? agendaValue.startDay : agendaValue.endDay;
    const minimums = [];
    const maximums = [];

    if (phase === 'start') {
      if (day === startDay) minimums.push(startTime);
      const previous = agendaValues[index - 1];
      if (previous && previous.endDay === day && validTime(previous.endTime)) {
        minimums.push(previous.endTime);
      }
      if (day === endDay) maximums.push(endTime);
    } else {
      if (day === startDay) minimums.push(startTime);
      if (day === agendaValue.startDay) minimums.push(agendaValue.startTime);
      if (day === endDay) maximums.push(endTime);
    }

    return {
      minTime: maxTime(minimums),
      maxTime: minTime(maximums),
      minTimeExclusive:
        phase === 'end' && day === agendaValue.startDay && validTime(agendaValue.startTime),
    };
  };

  const agendaCandidateFitsEvent = (items) => {
    if (eventStartMinutes === null || eventEndMinutes === null) return false;
    let previousEnd = null;
    return items.every((item) => {
      const itemStart = campusMinutes(item.startDay, item.startTime);
      const itemEnd = campusMinutes(item.endDay, item.endTime);
      if (
        itemStart === null ||
        itemEnd === null ||
        itemEnd <= itemStart ||
        itemStart < eventStartMinutes ||
        itemEnd > eventEndMinutes ||
        (previousEnd !== null && itemStart < previousEnd)
      ) {
        return false;
      }
      previousEnd = itemEnd;
      return true;
    });
  };

  const nextAgendaStartMinutes = agendaValues.length
    ? campusMinutes(
        agendaValues[agendaValues.length - 1]?.endDay,
        agendaValues[agendaValues.length - 1]?.endTime,
      )
    : eventStartMinutes;
  const canAddAgenda =
    eventScheduleReady &&
    agendaFields.fields.length < 40 &&
    nextAgendaStartMinutes !== null &&
    eventEndMinutes !== null &&
    nextAgendaStartMinutes < eventEndMinutes;

  const defaultAgendaSlot = () => {
    const start = campusPartsFromMinutes(nextAgendaStartMinutes);
    const end = campusPartsFromMinutes(Math.min(nextAgendaStartMinutes + 60, eventEndMinutes));
    return {
      startDay: start.day,
      startTime: start.time,
      endDay: end.day,
      endTime: end.time,
    };
  };

  const updateSchedule = async (name, value) => {
    setValue(name, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    await trigger(['startDay', 'startTime', 'endDay', 'endTime', 'agenda']);
  };

  const updateAgendaSchedule = async (index, name, value) => {
    const currentAgenda = getValues('agenda') || [];
    const currentItem = currentAgenda[index];
    if (!currentItem) return;

    const nextAgenda = currentAgenda.map((item) => ({
      ...item,
      speakerKeys: Array.isArray(item.speakerKeys) ? [...item.speakerKeys] : [],
    }));
    nextAgenda[index] = { ...nextAgenda[index], [name]: value };

    const currentStart = campusMinutes(currentItem.startDay, currentItem.startTime);
    const currentEnd = campusMinutes(currentItem.endDay, currentItem.endTime);
    const nextStart = campusMinutes(nextAgenda[index].startDay, nextAgenda[index].startTime);
    const nextEnd = campusMinutes(nextAgenda[index].endDay, nextAgenda[index].endTime);
    let shift = null;

    if ((name === 'startDay' || name === 'startTime') && currentStart !== null && currentEnd !== null && nextStart !== null) {
      shift = nextStart - currentStart;
      const shiftedEnd = campusPartsFromMinutes(currentEnd + shift);
      nextAgenda[index].endDay = shiftedEnd.day;
      nextAgenda[index].endTime = shiftedEnd.time;
    } else if ((name === 'endDay' || name === 'endTime') && currentEnd !== null && nextEnd !== null) {
      shift = nextEnd - currentEnd;
    }

    if (shift !== null) {
      for (let itemIndex = index + 1; itemIndex < nextAgenda.length; itemIndex += 1) {
        const shiftedStart = shiftCampusParts(
          nextAgenda[itemIndex].startDay,
          nextAgenda[itemIndex].startTime,
          shift,
        );
        const shiftedEnd = shiftCampusParts(
          nextAgenda[itemIndex].endDay,
          nextAgenda[itemIndex].endTime,
          shift,
        );
        if (!shiftedStart || !shiftedEnd) {
          setError(`agenda.${index}.${name}`, {
            type: 'manual',
            message: 'This change would invalidate a later program item.',
          });
          return;
        }
        nextAgenda[itemIndex].startDay = shiftedStart.day;
        nextAgenda[itemIndex].startTime = shiftedStart.time;
        nextAgenda[itemIndex].endDay = shiftedEnd.day;
        nextAgenda[itemIndex].endTime = shiftedEnd.time;
      }

      if (!agendaCandidateFitsEvent(nextAgenda)) {
        setError(`agenda.${index}.${name}`, {
          type: 'manual',
          message: 'This change would move the agenda outside the event schedule.',
        });
        return;
      }

      clearErrors([`agenda.${index}.${name}`, 'agenda.root']);
      setValue('agenda', nextAgenda, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    } else {
      setValue(`agenda.${index}.${name}`, value, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
    await trigger('agenda');
  };

  const toggleAgendaSpeaker = (agendaIndex, speakerKey, checked) => {
    const currentValue = getValues(`agenda.${agendaIndex}.speakerKeys`);
    const currentKeys = Array.isArray(currentValue)
      ? currentValue
      : currentValue
        ? [currentValue]
        : [];
    const nextKeys = checked
      ? [...new Set([...currentKeys, speakerKey])]
      : currentKeys.filter((key) => key !== speakerKey);

    setValue(`agenda.${agendaIndex}.speakerKeys`, nextKeys, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    trigger('agenda');
  };

  const chooseSpeakerImage = (key, file) => {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setFormError('Speaker images must be JPEG, PNG, or WebP files up to 5 MB.');
      return;
    }
    setSpeakerFiles((current) => ({ ...current, [key]: file }));
    setSpeakerPreviews((current) => ({ ...current, [key]: URL.createObjectURL(file) }));
    setRemoveSpeakerKeys((current) => current.filter((item) => item !== key));
  };

  const removeSpeakerImage = (key) => {
    setSpeakerFiles((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setSpeakerPreviews((current) => {
      const next = { ...current };
      if (next[key]?.startsWith('blob:')) URL.revokeObjectURL(next[key]);
      delete next[key];
      return next;
    });
    if (
      editing &&
      event?.speakers?.some((speaker) => speaker.clientKey === key && speaker.photoUrl)
    ) {
      setRemoveSpeakerKeys((current) => [...new Set([...current, key])]);
    }
  };

  const removeSpeaker = (index) => {
    const key = speakerValues?.[index]?.clientKey;
    speakerFields.remove(index);
    if (!key) return;

    const nextAgenda = getValues('agenda').map((item) => ({
      ...item,
      speakerKeys: (item.speakerKeys || []).filter((speakerKey) => speakerKey !== key),
    }));
    setValue('agenda', nextAgenda, { shouldDirty: true, shouldValidate: true });
    trigger('agenda');
  };

  const focusAgendaField = (path) => {
    const match = /^agenda\.(\d+)\.(.+)$/.exec(path || '');
    if (!match) return;
    const [, index, field] = match;
    const target = document.getElementById(`agenda-${index}-${field}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.focus();
    }
  };

  const handleInvalidSubmit = (formErrors) => {
    const agendaErrors = formErrors.agenda;
    const firstIndex = Array.isArray(agendaErrors)
      ? agendaErrors.findIndex((item) => item && Object.keys(item).length > 0)
      : -1;
    if (firstIndex < 0) return;

    const fieldNames = ['title', 'description', 'startDay', 'startTime', 'endDay', 'endTime'];
    const firstField = fieldNames.find((name) => agendaErrors[firstIndex]?.[name]);
    window.requestAnimationFrame(() =>
      focusAgendaField(`agenda.${firstIndex}.${firstField || 'title'}`),
    );
  };

  const agendaErrorSummary = agendaValues
    .map((_, index) => {
      const itemErrors = errors.agenda?.[index];
      const messages = [
        'title',
        'description',
        'startDay',
        'startTime',
        'endDay',
        'endTime',
        'speakerKeys',
      ]
        .map((field) => itemErrors?.[field]?.message)
        .filter(Boolean);
      return messages.length ? { index, messages: [...new Set(messages)] } : null;
    })
    .filter(Boolean);
  const agendaRootMessage = errors.agenda?.root?.message || errors.agenda?.message;

  return (
    <div className="mx-auto max-w-4xl pb-8">
      <Link
        to={editing ? `/admin/events/${event._id}` : '/admin'}
        state={editing ? { returnTo } : undefined}
        className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-medium text-slate-600 hover:text-nu-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {editing ? 'Back to event details' : 'Back to dashboard'}
      </Link>

      <header className="mb-8">
        <p className="text-xs font-medium text-slate-500">
          Event management / {editing ? 'Edit event' : 'New event'}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-nu-dark sm:text-3xl">
          {editing ? 'Edit event' : 'Create an event'}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
          {editing
            ? 'Update the information students see about this event.'
            : 'Share the essentials students need to plan their visit.'}
        </p>
      </header>

      <Form {...form}>
        <form
          onSubmit={handleSubmit(submit, handleInvalidSubmit)}
          noValidate
          className="flex flex-col gap-5"
        >
          <section
            className="order-1 rounded-xl border border-slate-200 bg-white p-5 sm:p-7"
            aria-labelledby="details-heading"
          >
            <SectionHeader
              id="details-heading"
              title="Event details"
              description="This information will appear in the student portal."
            />
            <div className="space-y-5">
              <Field
                id="title"
                label="Event title"
                error={errors.title?.message}
                help="3–120 characters"
              >
                <Input
                  id="title"
                  required
                  maxLength={120}
                  placeholder="e.g. Student Leadership Summit"
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={describedBy('title', true)}
                  className={fieldClass('title')}
                  disabled={isSubmitting}
                  {...register('title')}
                />
              </Field>
              <Field
                id="description"
                label="Description"
                error={errors.description?.message}
                help="10–1,000 characters"
              >
                <Textarea
                  id="description"
                  required
                  maxLength={1000}
                  rows={5}
                  placeholder="What should students know about this event?"
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={describedBy('description', true)}
                  className={fieldClass('description')}
                  disabled={isSubmitting}
                  {...register('description')}
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="location" label="Location" error={errors.location?.message}>
                  <Input
                    id="location"
                    required
                    maxLength={500}
                    placeholder="e.g. NU Main Auditorium"
                    aria-invalid={Boolean(errors.location)}
                    aria-describedby={describedBy('location')}
                    className={fieldClass('location')}
                    disabled={isSubmitting}
                    {...register('location')}
                  />
                </Field>
                <Field
                  id="organizerName"
                  label="Hosting organization"
                  error={errors.organizerName?.message}
                >
                  <Input
                    id="organizerName"
                    required
                    maxLength={120}
                    placeholder="e.g. NU Student Council"
                    aria-invalid={Boolean(errors.organizerName)}
                    aria-describedby={describedBy('organizerName')}
                    className={fieldClass('organizerName')}
                    disabled={isSubmitting}
                    {...register('organizerName')}
                  />
                </Field>
              </div>
            </div>
          </section>

          <section
            className="order-2 rounded-xl border border-slate-200 bg-white p-5 sm:p-7"
            aria-labelledby="type-heading"
          >
            <SectionHeader
              id="type-heading"
              title="Event type"
              description="Help students understand what kind of campus event this is."
            />
            <Field id="eventType" label="Event type" error={errors.eventType?.message}>
              <div className="relative max-w-md">
                <select
                  id="eventType"
                  className={`min-h-11 w-full appearance-none rounded-lg border bg-white px-3 pr-10 text-sm outline-none focus:border-nu-navy focus:ring-2 focus:ring-nu-navy/15 ${fieldClass('eventType')}`}
                  disabled={isSubmitting}
                  {...register('eventType')}
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={17}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>
            </Field>
          </section>

          <section
            className="order-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-7"
            aria-labelledby="schedule-heading"
          >
            <SectionHeader
              id="schedule-heading"
              title="Schedule"
              description="Choose dates and times in Philippine Standard Time (UTC+8)."
            />
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-nu-dark">Starts</p>
                <div className="grid gap-4">
                  <Field
                    id="startDay"
                    label="Date"
                    error={errors.startDay?.message}
                    reserveErrorSpace
                  >
                    <EventDatePicker
                      id="startDay"
                      label="Start date"
                      value={startDay}
                      allowPast={editing}
                      onChange={(value) => updateSchedule('startDay', value)}
                      invalid={Boolean(errors.startDay)}
                      describedBy={describedBy('startDay')}
                      disabled={isSubmitting}
                    />
                  </Field>
                  <Field id="startTime" label="Time" error={errors.startTime?.message}>
                    <EventTimePicker
                      id="startTime"
                      label="Start time"
                      value={startTime}
                      minTime={!editing && startDay === campusNow.day ? campusNow.time : undefined}
                      minTimeExclusive={!editing && startDay === campusNow.day}
                      onChange={(value) => updateSchedule('startTime', value)}
                      invalid={Boolean(errors.startTime)}
                      describedBy={describedBy('startTime')}
                      disabled={isSubmitting}
                    />
                  </Field>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-nu-dark">Ends</p>
                <div className="grid gap-4">
                  <Field id="endDay" label="Date" error={errors.endDay?.message} reserveErrorSpace>
                    <EventDatePicker
                      id="endDay"
                      label="End date"
                      value={endDay}
                      minDate={validDay(startDay) ? startDay : undefined}
                      allowPast={editing}
                      onChange={(value) => updateSchedule('endDay', value)}
                      invalid={Boolean(errors.endDay)}
                      describedBy={describedBy('endDay')}
                      disabled={isSubmitting}
                    />
                  </Field>
                  <Field id="endTime" label="Time" error={errors.endTime?.message}>
                    <EventTimePicker
                      id="endTime"
                      label="End time"
                      value={endTime}
                      minTime={endDay === startDay ? startTime : undefined}
                      minTimeExclusive={endDay === startDay}
                      onChange={(value) => updateSchedule('endTime', value)}
                      invalid={Boolean(errors.endTime)}
                      describedBy={describedBy('endTime')}
                      disabled={isSubmitting}
                    />
                  </Field>
                </div>
              </div>
            </div>
          </section>

          <section
            className="order-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-7"
            aria-labelledby="agenda-heading"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <SectionHeader
                id="agenda-heading"
                title="Program agenda"
                description="Add sessions, talks, or activities inside the event schedule."
              />
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting || !canAddAgenda}
                aria-label="Add program"
                title="Add program"
                className="h-11 w-11 shrink-0 p-0"
                onClick={() =>
                  agendaFields.append({
                    title: '',
                    description: '',
                    ...defaultAgendaSlot(),
                    speakerKeys: [],
                  })
                }
              >
                <Plus size={17} aria-hidden="true" />
              </Button>
            </div>
            <p className="-mt-3 mb-5 text-xs leading-5 text-slate-500">
              {eventScheduleReady
                ? 'New programs continue from the previous end time. You may add a break, but programs cannot overlap.'
                : 'Complete a valid event schedule above before adding program items.'}
            </p>
            {(isSubmitted || agendaRootMessage) &&
              (agendaErrorSummary.length > 0 || agendaRootMessage) && (
                <div
                  className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                  aria-live="polite"
                >
                  <p className="font-semibold">Please fix the highlighted program items.</p>
                  {agendaRootMessage && (
                    <p className="mt-1 text-xs text-red-700">{agendaRootMessage}</p>
                  )}
                  <ul className="mt-2 space-y-1 text-xs">
                    {agendaErrorSummary.map(({ index, messages }) => (
                      <li key={index}>
                        Program {index + 1}: {messages.join(' ')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            {agendaFields.fields.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-4 py-4 text-sm text-slate-500">
                No program items yet. Add one when the event has a detailed schedule.
              </p>
            ) : (
              <div className="space-y-4">
                {agendaFields.fields.map((field, index) => {
                  const agendaValue = agendaValues[index] || {};
                  const agendaStartDay = agendaValue.startDay || '';

                  return (
                    <div key={field.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <p className="text-sm font-semibold text-nu-dark">Program {index + 1}</p>
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-700 hover:bg-red-50"
                          aria-label={`Remove program ${index + 1}`}
                          title={`Remove program ${index + 1}`}
                          onClick={() => agendaFields.remove(index)}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                          id={`agenda-${index}-title`}
                          label="Title"
                          error={errors.agenda?.[index]?.title?.message}
                        >
                          <Input
                            id={`agenda-${index}-title`}
                            maxLength={160}
                            placeholder="Opening remarks"
                            aria-invalid={Boolean(errors.agenda?.[index]?.title)}
                            aria-describedby={`agenda-${index}-title-error`}
                            className={errors.agenda?.[index]?.title ? 'border-red-500' : ''}
                            {...register(`agenda.${index}.title`)}
                          />
                        </Field>
                        <Field
                          id={`agenda-${index}-description`}
                          label="Description"
                          required={false}
                          error={errors.agenda?.[index]?.description?.message}
                          help="Optional · up to 500 characters"
                        >
                          <Input
                            id={`agenda-${index}-description`}
                            maxLength={500}
                            placeholder="Optional details"
                            aria-invalid={Boolean(errors.agenda?.[index]?.description)}
                            aria-describedby={`agenda-${index}-description-error`}
                            {...register(`agenda.${index}.description`)}
                          />
                        </Field>
                      </div>
                      <div className="mt-4 grid gap-6 lg:grid-cols-2">
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-nu-dark">Starts</p>
                          <Field
                            id={`agenda-${index}-startDay`}
                            label="Date"
                            error={errors.agenda?.[index]?.startDay?.message}
                          >
                            <EventDatePicker
                              id={`agenda-${index}-startDay`}
                              label={`Program ${index + 1} start date`}
                              value={agendaStartDay}
                              minDate={laterDay([
                                startDay,
                                agendaValues[index - 1]?.endDay,
                              ])}
                              maxDate={validDay(endDay) ? endDay : undefined}
                              allowPast={editing}
                              onChange={(value) => updateAgendaSchedule(index, 'startDay', value)}
                              invalid={Boolean(errors.agenda?.[index]?.startDay)}
                              describedBy={`agenda-${index}-startDay-error`}
                              disabled={isSubmitting}
                            />
                          </Field>
                          <Field
                            id={`agenda-${index}-startTime`}
                            label="Time"
                            error={errors.agenda?.[index]?.startTime?.message}
                          >
                            <EventTimePicker
                              id={`agenda-${index}-startTime`}
                              label={`Program ${index + 1} start time`}
                              value={agendaValue.startTime || ''}
                              {...getAgendaTimeBounds(agendaValue, 'start', index)}
                              onChange={(value) => updateAgendaSchedule(index, 'startTime', value)}
                              invalid={Boolean(errors.agenda?.[index]?.startTime)}
                              describedBy={`agenda-${index}-startTime-error`}
                              disabled={isSubmitting}
                            />
                          </Field>
                        </div>
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-nu-dark">Ends</p>
                          <Field
                            id={`agenda-${index}-endDay`}
                            label="Date"
                            error={errors.agenda?.[index]?.endDay?.message}
                          >
                            <EventDatePicker
                              id={`agenda-${index}-endDay`}
                              label={`Program ${index + 1} end date`}
                              value={agendaValue.endDay || ''}
                              minDate={laterDay([agendaStartDay, startDay])}
                              maxDate={validDay(endDay) ? endDay : undefined}
                              allowPast={editing}
                              onChange={(value) => updateAgendaSchedule(index, 'endDay', value)}
                              invalid={Boolean(errors.agenda?.[index]?.endDay)}
                              describedBy={`agenda-${index}-endDay-error`}
                              disabled={isSubmitting}
                            />
                          </Field>
                          <Field
                            id={`agenda-${index}-endTime`}
                            label="Time"
                            error={errors.agenda?.[index]?.endTime?.message}
                          >
                            <EventTimePicker
                              id={`agenda-${index}-endTime`}
                              label={`Program ${index + 1} end time`}
                              value={agendaValue.endTime || ''}
                              {...getAgendaTimeBounds(agendaValue, 'end', index)}
                              onChange={(value) => updateAgendaSchedule(index, 'endTime', value)}
                              invalid={Boolean(errors.agenda?.[index]?.endTime)}
                              describedBy={`agenda-${index}-endTime-error`}
                              disabled={isSubmitting}
                            />
                          </Field>
                        </div>
                      </div>
                      {speakerFields.fields.length > 0 && (
                        <fieldset className="mt-4">
                          <legend className="text-xs font-semibold text-slate-600">Speakers</legend>
                          <div className="mt-2 flex flex-wrap gap-3">
                            {speakerFields.fields.map((speaker, speakerIndex) => {
                              const speakerKey =
                                speakerValues?.[speakerIndex]?.clientKey || speaker.clientKey;
                              const assignedSpeakerKeys = Array.isArray(agendaValue.speakerKeys)
                                ? agendaValue.speakerKeys
                                : agendaValue.speakerKeys
                                  ? [agendaValue.speakerKeys]
                                  : [];

                              return (
                                <label
                                  key={speaker.id}
                                  className="inline-flex items-center gap-2 text-xs text-slate-600"
                                >
                                  <input
                                    type="checkbox"
                                    value={speakerKey || ''}
                                    checked={assignedSpeakerKeys.includes(speakerKey)}
                                    onChange={(change) =>
                                      toggleAgendaSpeaker(index, speakerKey, change.target.checked)
                                    }
                                  />
                                  {speakerValues?.[speakerIndex]?.name ||
                                    `Speaker ${speakerIndex + 1}`}
                                </label>
                              );
                            })}
                          </div>
                          <FormMessage id={`agenda-${index}-speakerKeys-error`}>
                            {errors.agenda?.[index]?.speakerKeys?.message}
                          </FormMessage>
                        </fieldset>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section
            className="order-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-7"
            aria-labelledby="speakers-heading"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <SectionHeader
                id="speakers-heading"
                title="Speakers"
                description="Add the people students will hear from at this event."
              />
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting || speakerFields.fields.length >= 30}
                aria-label="Add speaker"
                title="Add speaker"
                className="h-11 w-11 shrink-0 p-0"
                onClick={() =>
                  speakerFields.append({
                    clientKey: createClientKey(),
                    name: '',
                    role: '',
                    photoUrl: '',
                  })
                }
              >
                <Plus size={17} aria-hidden="true" />
              </Button>
            </div>
            {speakerFields.fields.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-4 py-4 text-sm text-slate-500">
                No speakers added.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {speakerFields.fields.map((field, index) => {
                  const key = speakerValues?.[index]?.clientKey || field.clientKey;
                  const name = speakerValues?.[index]?.name || '';
                  const existingPhoto = event?.speakers?.find(
                    (speaker) => speaker.clientKey === key,
                  )?.photoUrl;
                  const preview = speakerPreviews[key] || existingPhoto;
                  return (
                    <div key={field.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {preview ? (
                            <img
                              src={preview}
                              alt=""
                              className="h-12 w-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                              {(name || '?').slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-nu-dark">
                              Speaker {index + 1}
                            </p>
                            <label
                              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-nu-navy hover:bg-slate-100"
                              aria-label={preview ? 'Replace speaker photo' : 'Add speaker photo'}
                              title={preview ? 'Replace speaker photo' : 'Add speaker photo'}
                            >
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="sr-only"
                                onChange={(change) =>
                                  chooseSpeakerImage(key, change.target.files?.[0])
                                }
                              />
                              <ImagePlus size={16} aria-hidden="true" />
                            </label>
                            {preview && (
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-700 hover:bg-red-50"
                                aria-label="Remove speaker photo"
                                title="Remove speaker photo"
                                onClick={() => removeSpeakerImage(key)}
                              >
                                <Trash2 size={15} aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-700 hover:bg-red-50"
                          aria-label={`Remove speaker ${index + 1}`}
                          title={`Remove speaker ${index + 1}`}
                          onClick={() => removeSpeaker(index)}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                      <div className="mt-4 space-y-3">
                        <Input
                          aria-label={`Speaker ${index + 1} name`}
                          placeholder="Full name"
                          {...register(`speakers.${index}.name`)}
                        />
                        <Input
                          aria-label={`Speaker ${index + 1} role`}
                          placeholder="Role or designation"
                          {...register(`speakers.${index}.role`)}
                        />
                        {errors.speakers?.[index] && (
                          <p className="text-xs text-red-700">
                            {errors.speakers[index].name?.message ||
                              errors.speakers[index].role?.message}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section
            className="order-3 rounded-xl border border-slate-200 bg-white p-5 sm:p-7"
            aria-labelledby="registration-heading"
          >
            <SectionHeader
              id="registration-heading"
              title="Registration"
              description="Choose whether students need to reserve a place."
            />
            <div className="grid gap-4 lg:grid-cols-3">
              <Field
                id="registrationMode"
                label="Registration mode"
                error={errors.registrationMode?.message}
              >
                <div className="relative">
                  <select
                    id="registrationMode"
                    className="min-h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-10 text-sm"
                    disabled={isSubmitting || Boolean(event?.registrationFormLocked)}
                    {...register('registrationMode')}
                  >
                    <option value="none">No registration</option>
                    <option value="required">Registration required</option>
                  </select>
                  <ChevronDown
                    size={17}
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </Field>
              {registrationMode === 'required' && (
                <Field
                  id="registrationFormId"
                  label="Registration form"
                  error={errors.registrationFormId?.message}
                  help={
                    event?.registrationFormLocked
                      ? 'The selected form cannot be changed after the first submission.'
                      : undefined
                  }
                >
                  <div
                    ref={formPickerRef}
                    className="relative"
                    onBlur={(focusEvent) => {
                      if (focusEvent.currentTarget.contains(focusEvent.relatedTarget)) return;
                      setFormPickerOpen(false);
                      setFormSearch('');
                    }}
                  >
                    <input type="hidden" {...register('registrationFormId')} />
                    <div className="relative">
                      <Input
                        id="registrationFormId"
                        role="combobox"
                        aria-controls="registration-form-options"
                        aria-expanded={formPickerOpen}
                        aria-haspopup="listbox"
                        aria-autocomplete="list"
                        autoComplete="off"
                        value={
                          formPickerOpen
                            ? formSearch
                            : registrationForms.find((item) => item._id === registrationFormId)
                                ?.name ||
                              (registrationFormId === 'legacy'
                                ? 'Legacy embedded form'
                                : formSearch)
                        }
                        onFocus={() => {
                          if (isSubmitting || event?.registrationFormLocked) return;
                          setFormPickerOpen(true);
                          setFormSearch('');
                        }}
                        onChange={(inputEvent) => {
                          setFormPickerOpen(true);
                          setFormSearch(inputEvent.target.value);
                        }}
                        onKeyDown={(keyboardEvent) => {
                          if (keyboardEvent.key === 'Escape') {
                            setFormPickerOpen(false);
                            setFormSearch('');
                          }
                        }}
                        placeholder={formsLoading ? 'Loading forms…' : 'Search or select a form'}
                        disabled={isSubmitting || Boolean(event?.registrationFormLocked)}
                        aria-invalid={Boolean(errors.registrationFormId)}
                        aria-describedby={describedBy('registrationFormId')}
                        className="pr-10"
                      />
                      <ChevronDown
                        size={17}
                        aria-hidden="true"
                        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-transform ${
                          formPickerOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                    {formPickerOpen && !isSubmitting && !event?.registrationFormLocked && (
                      <div
                        id="registration-form-options"
                        role="listbox"
                        aria-label="Available registration forms"
                        className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
                      >
                        {formsLoading && (
                          <p className="px-3 py-2 text-sm text-slate-500">Loading forms…</p>
                        )}
                        {!formsLoading && formsError && (
                          <p className="px-3 py-2 text-sm text-red-700">Unable to load forms.</p>
                        )}
                        {!formsLoading &&
                          !formsError &&
                          registrationFormId === 'legacy' &&
                          'legacy embedded form'.includes(formSearch.trim().toLowerCase()) && (
                            <button
                              type="button"
                              role="option"
                              aria-selected={registrationFormId === 'legacy'}
                              className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-nu-dark hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                              onClick={() => selectRegistrationForm('legacy')}
                            >
                              <span className="min-w-0 flex-1 truncate">Legacy embedded form</span>
                              <span className="ml-3 text-xs text-amber-700">Archived</span>
                            </button>
                          )}
                        {!formsLoading &&
                          !formsError &&
                          registrationForms
                            .filter((item) =>
                              item.name.toLowerCase().includes(formSearch.trim().toLowerCase()),
                            )
                            .map((item) => (
                              <button
                                key={item._id}
                                type="button"
                                role="option"
                                aria-selected={registrationFormId === item._id}
                                className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-nu-dark hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                                onClick={() => selectRegistrationForm(item._id)}
                              >
                                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                                {item.isArchived && (
                                  <span className="ml-3 text-xs text-amber-700">Archived</span>
                                )}
                              </button>
                            ))}
                        {!formsLoading &&
                          !formsError &&
                          registrationForms.filter((item) =>
                            item.name.toLowerCase().includes(formSearch.trim().toLowerCase()),
                          ).length === 0 &&
                          registrationFormId !== 'legacy' && (
                            <p className="px-3 py-2 text-sm text-slate-500">
                              {registrationForms.length === 0
                                ? 'No active forms yet.'
                                : 'No forms match your search.'}
                            </p>
                          )}
                      </div>
                    )}
                    {formsError && <p className="text-xs text-red-700">{formsError}</p>}
                    {!formsLoading && !formsError && registrationForms.length === 0 && (
                      <p className="text-xs text-slate-500">
                        No active forms yet.{' '}
                        <Link
                          className="font-semibold text-nu-navy underline"
                          to="/admin/registration-forms/new"
                        >
                          Create a form
                        </Link>
                        .
                      </p>
                    )}
                    {event?.registrationFormId &&
                      registrationForms.find((item) => item._id === event.registrationFormId)
                        ?.isArchived && (
                        <p className="text-xs text-amber-700">
                          This event uses an archived form. It remains available here for existing
                          registrations.
                        </p>
                      )}
                    {registrationFormId &&
                      registrationForms.find((item) => item._id === registrationFormId)
                        ?.description && (
                        <p className="text-xs text-slate-500">
                          {
                            registrationForms.find((item) => item._id === registrationFormId)
                              ?.description
                          }
                        </p>
                      )}
                    <Link
                      to="/admin/registration-forms/new"
                      className="inline-flex text-xs font-semibold text-nu-navy underline"
                    >
                      Create registration form
                    </Link>
                  </div>
                </Field>
              )}
              {registrationMode === 'required' && (
                <Field
                  id="capacity"
                  label="Capacity (optional)"
                  error={errors.capacity?.message}
                  help="Leave blank for unlimited registration."
                >
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    max="100000"
                    inputMode="numeric"
                    placeholder="e.g. 100"
                    aria-invalid={Boolean(errors.capacity)}
                    {...register('capacity')}
                  />
                </Field>
              )}
            </div>
            {registrationMode === 'required' && (
              <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
                Registration closes when the event starts. Students may cancel before then; when
                capacity is full, new registrations are closed until a registered student cancels.
              </p>
            )}
          </section>

          <section
            className="order-7 rounded-xl border border-slate-200 bg-white p-5 sm:p-7"
            aria-labelledby="guidance-heading"
          >
            <SectionHeader
              id="guidance-heading"
              title="Requirements and reminders"
              description="Give students practical information before they attend."
            />
            <div className="grid gap-6 sm:grid-cols-2">
              {[
                [
                  'requirements',
                  'Requirements',
                  requirementFields,
                  'What students need to bring or complete',
                ],
                ['reminders', 'Reminders', reminderFields, 'Arrival, dress, or preparation notes'],
              ].map(([name, label, fields, placeholder]) => (
                <div key={name}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-nu-dark">{label}</h3>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 w-9 p-0"
                      disabled={isSubmitting || fields.fields.length >= 20}
                      aria-label={`Add ${label.toLowerCase().slice(0, -1)}`}
                      title={`Add ${label.toLowerCase().slice(0, -1)}`}
                      onClick={() => fields.append({ value: '' })}
                    >
                      <Plus size={16} aria-hidden="true" />
                    </Button>
                  </div>
                  {fields.fields.length === 0 ? (
                    <p className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500">
                      None added.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {fields.fields.map((field, index) => (
                        <div key={field.id} className="flex gap-2">
                          <Input
                            maxLength={240}
                            placeholder={placeholder}
                            {...register(`${name}.${index}.value`)}
                          />
                          <button
                            type="button"
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-red-700 hover:bg-red-50"
                            aria-label={`Remove ${label.toLowerCase()} item ${index + 1}`}
                            title={`Remove ${label.toLowerCase()} item ${index + 1}`}
                            onClick={() => fields.remove(index)}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section
            className="order-8 rounded-xl border border-slate-200 bg-white p-5 sm:p-7"
            aria-labelledby="cover-heading"
          >
            <SectionHeader
              id="cover-heading"
              title="Cover image"
              description="Optional · JPEG, PNG, or WebP · up to 5 MB"
            />
            <div
              className="overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50/50"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (!isSubmitting) chooseImage(event.dataTransfer.files?.[0]);
              }}
            >
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Selected event cover preview"
                    className="aspect-[16/7] w-full object-cover"
                  />
                  <div className="flex flex-col gap-3 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <p
                      title={imageFile?.name || 'Current cover image'}
                      className="min-w-0 flex-1 truncate text-sm font-medium text-nu-dark"
                    >
                      {imageFile?.name || 'Current cover image'}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Replace cover image"
                        title="Replace cover image"
                        className="h-10 min-h-10 w-10 shrink-0 p-0"
                      >
                        <ImagePlus size={17} aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={removeImage}
                        aria-label="Remove cover image"
                        title="Remove cover image"
                        className="h-10 min-h-10 w-10 shrink-0 p-0"
                      >
                        <Trash2 size={17} aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-52 flex-col items-center justify-center px-5 py-9 text-center">
                  <p className="text-sm font-semibold text-nu-dark">Add a cover image</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Drag an image here, or choose one from your device.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 min-h-10 px-4"
                  >
                    Choose image
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                tabIndex={-1}
                aria-label="Cover image file"
                onChange={(event) => {
                  chooseImage(event.target.files?.[0]);
                  event.target.value = '';
                }}
                disabled={isSubmitting}
              />
            </div>
            <FormMessage id="coverImage-error">{imageError}</FormMessage>
          </section>

          {formError && (
            <p
              role="alert"
              className="order-9 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {formError}
            </p>
          )}
          <div className="order-10 flex flex-col-reverse items-stretch justify-end gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:items-center">
            <Button asChild variant="ghost" className="w-full sm:w-auto">
              <Link
                to={editing ? `/admin/events/${event._id}` : '/admin'}
                state={editing ? { returnTo } : undefined}
              >
                Cancel
              </Link>
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting
                ? editing
                  ? 'Saving changes…'
                  : 'Creating event…'
                : editing
                  ? 'Save changes'
                  : 'Create event'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default AdminEventCreatePage;
