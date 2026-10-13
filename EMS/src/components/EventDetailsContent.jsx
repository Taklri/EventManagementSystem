import { CalendarDays, Check, Clock3, MapPin, UsersRound } from 'lucide-react';
import EventStatus from './EventStatus';
import { formatEventDate, formatEventSchedule, organizerName } from '../lib/eventFormatting';

const formatEventTime = (value) =>
  new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

const formatAgendaTime = (start, end) => {
  const sameDay = formatEventDate(start) === formatEventDate(end);
  return sameDay
    ? `${formatEventTime(start)} – ${formatEventTime(end)}`
    : `${formatEventDate(start)} · ${formatEventTime(start)} – ${formatEventDate(end)} · ${formatEventTime(end)}`;
};

const DetailItem = ({ icon: Icon, label, children }) => (
  <div className="flex min-w-0 items-start gap-3">
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-nu-navy">
      <Icon size={15} aria-hidden="true" />
    </span>
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium leading-6 text-nu-dark [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  </div>
);

const SectionHeading = ({ id, children, action }) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <h2 id={id} className="text-base font-semibold tracking-tight text-nu-dark sm:text-lg">
      {children}
    </h2>
    {action}
  </div>
);

const AgendaTimeline = ({ agenda, speakers }) => {
  const speakerNames = new Map(
    (speakers || [])
      .filter((speaker) => speaker.clientKey && speaker.name)
      .map((speaker) => [speaker.clientKey, speaker.name]),
  );

  return (
    <div className="relative mt-5 space-y-5 before:absolute before:bottom-3 before:left-[7px] before:top-3 before:w-px before:bg-slate-200">
      {agenda
        .slice()
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
        .map((item, index) => {
          const assignedNames = (item.speakerKeys || [])
            .map((key) => speakerNames.get(key))
            .filter(Boolean);

          return (
            <div key={item._id || `${item.title}-${index}`} className="relative flex gap-4">
              <span className="relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-[3px] border-white bg-nu-navy shadow-[0_0_0_1px_#d8deea]" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-nu-navy">
                  {formatAgendaTime(item.startDate, item.endDate)}
                </p>
                <p className="mt-1 text-sm font-semibold text-nu-dark [overflow-wrap:anywhere]">
                  {item.title}
                </p>
                {item.description && (
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 [overflow-wrap:anywhere]">
                    {item.description}
                  </p>
                )}
                {assignedNames.length > 0 ? (
                  <p className="mt-2 text-xs text-slate-500 [overflow-wrap:anywhere]">
                    With {assignedNames.join(', ')}
                  </p>
                ) : (
                  item.speakerKeys?.length > 0 && (
                    <p className="mt-2 text-xs text-slate-500">
                      {item.speakerKeys.length} assigned speaker
                      {item.speakerKeys.length === 1 ? '' : 's'}
                    </p>
                  )
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
};

const Speakers = ({ speakers }) => (
  <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-5">
    {speakers.map((speaker, index) => (
      <div
        key={speaker.clientKey || speaker._id || `${speaker.name}-${index}`}
        className="flex min-w-0 items-center gap-3"
      >
        {speaker.photoUrl ? (
          <img
            src={speaker.photoUrl}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
          />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-nu-navy text-sm font-semibold text-white">
            {speaker.name?.slice(0, 1).toUpperCase() || '?'}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-nu-dark [overflow-wrap:anywhere]">
            {speaker.name}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-slate-500 [overflow-wrap:anywhere]">
            {speaker.role || 'Speaker'}
          </p>
        </div>
      </div>
    ))}
  </div>
);

export const EventGuidanceList = ({ title, items, emptyMessage }) => {
  const headingId = `${title.toLowerCase().replace(/\s+/g, '-')}-heading`;

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="text-sm font-semibold text-nu-dark">
        {title}
      </h3>
      {items?.length ? (
        <ul className="mt-3 space-y-2.5">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex gap-2 text-xs leading-5 text-slate-600">
              <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
              <span className="min-w-0 [overflow-wrap:anywhere]">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs leading-5 text-slate-500">{emptyMessage}</p>
      )}
    </section>
  );
};

export const EventDetailsHero = ({ event }) => (
  <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(19,44,95,0.05)]">
    <div className="grid gap-5 p-4 @min-[640px]:grid-cols-[minmax(180px,0.65fr)_minmax(0,1.35fr)] @min-[640px]:gap-6 @min-[640px]:p-6">
      <div className="relative aspect-[16/10] self-start overflow-hidden rounded-xl bg-slate-100 @min-[640px]:aspect-square">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={`Cover for ${event.title}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,#eef2f8,#dfe6f2)] px-6 text-center text-xs font-medium text-slate-500">
            No cover image available
          </div>
        )}
        <span className="absolute left-4 top-4 rounded-xl border border-white/80 bg-white/95 px-2.5 py-2 text-center shadow-sm">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-red-600">
            {formatEventDate(event.startDate, { month: 'short' }).split(' ')[0]}
          </span>
          <span className="block text-lg font-bold leading-none text-nu-dark">
            {new Intl.DateTimeFormat('en-PH', {
              timeZone: 'Asia/Manila',
              day: 'numeric',
            }).format(new Date(event.startDate))}
          </span>
        </span>
      </div>
      <header className="flex min-w-0 flex-col justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-nu-navy">
              {event.eventType || 'Other'}
            </span>
            {event.isArchived ? (
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                Archived
              </span>
            ) : (
              <EventStatus status={event.status} />
            )}
          </div>
          <h1 className="mt-3 text-xl font-bold leading-snug tracking-tight text-nu-dark [overflow-wrap:anywhere] @min-[880px]:text-2xl">
            {event.title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 [overflow-wrap:anywhere]">
            Hosted by {organizerName(event)}
          </p>
          {event.tags?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {event.tags.map((tag) => (
                <span
                  key={tag}
                  className="max-w-full rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600 [overflow-wrap:anywhere]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <dl className="grid gap-4 border-t border-slate-200 pt-5 @min-[440px]:grid-cols-2">
          <DetailItem icon={CalendarDays} label="Date">
            {formatEventDate(event.startDate)}
            {formatEventDate(event.startDate) !== formatEventDate(event.endDate) &&
              ` – ${formatEventDate(event.endDate)}`}
          </DetailItem>
          <DetailItem icon={Clock3} label="Time">
            {formatEventTime(event.startDate)} – {formatEventTime(event.endDate)}
          </DetailItem>
          <DetailItem icon={MapPin} label="Venue">
            {event.location}
          </DetailItem>
          <DetailItem icon={UsersRound} label="Registration">
            {event.registrationMode === 'required' ? 'Registration required' : 'Open event'}
          </DetailItem>
        </dl>
      </header>
    </div>
  </article>
);

export const EventDetailsBody = ({ event }) => (
  <div className="min-w-0 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <section aria-labelledby="about-event" className="min-w-0 p-5 sm:p-6">
      <SectionHeading id="about-event">About this event</SectionHeading>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600 [overflow-wrap:anywhere]">
        {event.description}
      </p>
    </section>

    <section aria-labelledby="schedule-heading" className="min-w-0 p-5 sm:p-6">
      <SectionHeading id="schedule-heading">Schedule</SectionHeading>
      <p className="mt-1 text-xs text-slate-500">
        {formatEventSchedule(event.startDate, event.endDate)} · Philippine Standard Time
      </p>
      {event.agenda?.length > 0 ? (
        <AgendaTimeline agenda={event.agenda} speakers={event.speakers} />
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-xs text-slate-500">
          No program items have been added for this event.
        </div>
      )}
    </section>

    <section aria-labelledby="speakers-heading" className="min-w-0 p-5 sm:p-6">
      <SectionHeading id="speakers-heading">Speakers</SectionHeading>
      {event.speakers?.length > 0 ? (
        <Speakers speakers={event.speakers} />
      ) : (
        <p className="mt-4 text-xs text-slate-500">No speakers have been added yet.</p>
      )}
    </section>
  </div>
);
