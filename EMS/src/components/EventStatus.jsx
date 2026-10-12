export default function EventStatus({ status }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status === 'Ongoing' ? 'bg-emerald-50 text-emerald-800' : status === 'Ended' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-nu-navy'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{status}</span>;
}
