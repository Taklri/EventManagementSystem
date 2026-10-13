import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, Pencil, Search, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from '@mui/material';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { adminApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  sanitizeName,
  sanitizeStudentId,
  validateProgram,
  validateName,
  validateStudentId,
  validateYearLevel,
  YEAR_LEVEL_OPTIONS,
  PROGRAM_OPTIONS,
} from '../lib/authValidation';

const ROWS_PER_PAGE = 10;

// colors for the circle with the initials
const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
];

const modalLabelClass = 'mb-1.5 block text-xs font-medium text-slate-700';

const errorClass = 'mt-1 text-[11px] text-red-700';

function getFullName(student) {
  return student.firstName + ' ' + student.lastName;
}

function getInitials(student) {
  return (student.firstName.charAt(0) + student.lastName.charAt(0)).toUpperCase();
}

function StudentAvatar({ student, className = 'h-9 w-9', textClass = 'text-xs' }) {
  if (student.imageUrl) {
    return (
      <img
        src={student.imageUrl}
        alt={`${getFullName(student)} profile photo`}
        className={`${className} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      className={`${className} ${textClass} shrink-0 flex items-center justify-center rounded-full font-semibold ${AVATAR_COLORS[parseInt(student.id.slice(-2), 16) % AVATAR_COLORS.length]}`}
      aria-hidden="true"
    >
      {getInitials(student)}
    </span>
  );
}

// the popup box (dark background + white card)
function Modal({ title, onClose, children }) {
  // press Escape to close
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return createPortal(
    (
    <div
      className="fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-2xl sm:max-h-[90vh]"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-nu-dark">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
    ),
    document.body,
  );
}

// popup to see the student's details (cannot change anything)
function ViewStudentModal({ student, onClose }) {
  const rows = [
    ['Student ID', student.studentId],
    ['Name', getFullName(student)],
    ['Year level', student.yearLevel || '—'],
    ['Program', student.program || '—'],
    ['Email', student.email],
    ['Events joined', String(student.eventsJoined)],
  ];

  return (
    <Modal title="Student details" onClose={onClose}>
      <div className="mb-5 flex justify-center">
        <StudentAvatar student={student} className="h-24 w-24" textClass="text-2xl" />
      </div>
      <dl className="space-y-3 text-sm">
        {rows.map((row) => (
          <div key={row[0]} className="flex justify-between gap-4 border-b border-slate-100 pb-2">
            <dt className="text-slate-500">{row[0]}</dt>
            <dd className="min-w-0 break-words text-right font-medium text-nu-dark">{row[1]}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 text-right">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}

// popup to change the student's information
// the email is shown but locked, and there is NO password box at all
function EditStudentModal({ student, students, onClose, onSave }) {
  const [studentId, setStudentId] = useState(student.studentId);
  const [firstName, setFirstName] = useState(student.firstName);
  const [middleName, setMiddleName] = useState(student.middleName);
  const [lastName, setLastName] = useState(student.lastName);
  const [yearLevel, setYearLevel] = useState(student.yearLevel || '');
  const [program, setProgram] = useState(student.program || '');

  const [errors, setErrors] = useState({});

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    const newErrors = {};

    const idError = validateStudentId(studentId);
    if (idError) {
      newErrors.studentId = idError;
    }

    // no other student can have the same Student ID
    for (let i = 0; i < students.length; i++) {
      if (students[i].id !== student.id && students[i].studentId === studentId.trim()) {
        newErrors.studentId = 'This Student ID already belongs to another student.';
      }
    }

    const firstNameError = validateName(firstName);
    if (firstNameError) {
      newErrors.firstName = firstNameError;
    }

    const middleNameError = validateName(middleName, false);
    if (middleNameError) {
      newErrors.middleName = middleNameError;
    }

    const lastNameError = validateName(lastName);
    if (lastNameError) {
      newErrors.lastName = lastNameError;
    }

    const yearLevelError = validateYearLevel(yearLevel);
    if (yearLevelError) {
      newErrors.yearLevel = yearLevelError;
    }

    const programError = validateProgram(program);
    if (programError) {
      newErrors.program = programError;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // email and events joined are copied as they are (the admin cannot change them)
    const updated = {
      id: student.id,
      studentId: studentId.trim(),
      firstName: firstName.trim(),
      middleName: middleName.trim(),
      lastName: lastName.trim(),
      yearLevel: yearLevel.trim(),
      program,
      email: student.email,
      eventsJoined: student.eventsJoined,
    };

    setSaving(true);
    setSaveError('');
    try {
      await onSave(updated);
    } catch (error) {
      setSaveError(error.message);
      if (error.field) setErrors({ [error.field]: error.message });
    } finally {
      setSaving(false);
    }
  }

  // red border when a box has an error
  function borderOf(field) {
    if (errors[field]) {
      return 'border-red-500 focus-visible:ring-red-500';
    }
    return '';
  }

  function errorBox(field) {
    if (errors[field]) {
      return (
        <p id={field + '-error'} aria-live="polite" className={errorClass}>
          {errors[field]}
        </p>
      );
    }
    return null;
  }

  return (
    <Modal title="Edit student" onClose={() => { if (!saving) onClose(); }}>
      <form onSubmit={handleSubmit} noValidate>
        <fieldset disabled={saving} className="space-y-4">
        {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}
        <div>
          <label htmlFor="edit-student-id" className={modalLabelClass}>
            Student ID
          </label>
          <Input
            id="edit-student-id"
            value={studentId}
            maxLength={11}
            autoFocus
            onChange={(event) => {
              setStudentId(sanitizeStudentId(event.target.value));
              setErrors({ ...errors, studentId: '' });
            }}
            aria-invalid={Boolean(errors.studentId)}
            className={borderOf('studentId')}
          />
          {errorBox('studentId')}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="edit-first-name" className={modalLabelClass}>
              First name
            </label>
            <Input
              id="edit-first-name"
              value={firstName}
              onChange={(event) => {
                setFirstName(sanitizeName(event.target.value));
                setErrors({ ...errors, firstName: '' });
              }}
              aria-invalid={Boolean(errors.firstName)}
              className={borderOf('firstName')}
            />
            {errorBox('firstName')}
          </div>
          <div>
            <label htmlFor="edit-middle-name" className={modalLabelClass}>
              Middle name <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <Input
              id="edit-middle-name"
              value={middleName}
              onChange={(event) => {
                setMiddleName(sanitizeName(event.target.value));
                setErrors({ ...errors, middleName: '' });
              }}
              aria-invalid={Boolean(errors.middleName)}
              className={borderOf('middleName')}
            />
            {errorBox('middleName')}
          </div>
          <div>
            <label htmlFor="edit-last-name" className={modalLabelClass}>
              Last name
            </label>
            <Input
              id="edit-last-name"
              value={lastName}
              onChange={(event) => {
                setLastName(sanitizeName(event.target.value));
                setErrors({ ...errors, lastName: '' });
              }}
              aria-invalid={Boolean(errors.lastName)}
              className={borderOf('lastName')}
            />
            {errorBox('lastName')}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="edit-year-level" className={modalLabelClass}>Year level</label>
            <select
              id="edit-year-level"
              value={yearLevel}
              onChange={(event) => {
                setYearLevel(event.target.value);
                setErrors({ ...errors, yearLevel: '' });
              }}
              aria-invalid={Boolean(errors.yearLevel)}
              className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring ${borderOf('yearLevel')}`}
            >
              <option value="">Select a year level</option>
              {YEAR_LEVEL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            {errorBox('yearLevel')}
          </div>
          <div>
            <label htmlFor="edit-program" className={modalLabelClass}>Program</label>
            <select
              id="edit-program"
              value={program}
              onChange={(event) => {
                setProgram(event.target.value);
                setErrors({ ...errors, program: '' });
              }}
              aria-invalid={Boolean(errors.program)}
              className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring ${borderOf('program')}`}
            >
              <option value="">Select a program</option>
              {PROGRAM_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            {errorBox('program')}
          </div>
        </div>

        {/* the email is locked: the admin can see it but cannot change it */}
        <div>
          <label htmlFor="edit-email" className={modalLabelClass}>
            Email
          </label>
          <Input
            id="edit-email"
            value={student.email}
            readOnly
            disabled
            className="cursor-not-allowed bg-slate-100 text-slate-500"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Email and password cannot be changed by an admin.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{saving ? 'Saving?' : 'Save changes'}</Button>
        </div>
        </fieldset>
      </form>
    </Modal>
  );
}

function AdminStudentsPage() {
  const { accessToken } = useAuth();
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    adminApi.students(accessToken).then(({ users }) => {
      if (active) { setStudents(users); setLoading(false); setLoadError(''); }
    }).catch((error) => {
      if (active) {
        setLoading(false);
        setLoadError(error.status === 401 ? 'Your session expired. Sign in again.'
          : error.status === 403 ? 'Administrator access is required.' : error.message);
      }
    });
    return () => { active = false; };
  }, [accessToken, reload]);

  function refreshStudents() {
    setLoading(true);
    setLoadError('');
    setPage(0);
    setReload((value) => value + 1);
  }

  // Search and pagination
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  // which student is open in a popup (null = no popup)
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);

  // green message after saving
  const [message, setMessage] = useState('');

  const total = students.length;
  const registeredCount = students.filter((student) => student.eventsJoined > 0).length;

  const keyword = search.trim().toLowerCase();
  const filtered = students.filter((student) =>
    `${getFullName(student)} ${student.studentId} ${student.email} ${student.yearLevel || ''} ${student.program || ''}`.toLowerCase().includes(keyword),
  );

  // only the students of the current page
  const start = page * ROWS_PER_PAGE;
  const visible = filtered.slice(start, start + ROWS_PER_PAGE);

  async function handleSave(updated) {
    const { studentId, firstName, middleName, lastName, yearLevel, program } = updated;
    let result;
    try {
      result = await adminApi.updateStudent(updated.id, { studentId, firstName, middleName, lastName, yearLevel, program }, accessToken);
    } catch (error) {
      if (error.status === 401) error.message = 'Your session expired. Sign in again.';
      if (error.status === 403) error.message = 'Administrator access is required.';
      throw error;
    }
    setStudents((current) => current.map((student) => student.id === updated.id
      ? { ...student, ...result.user, eventsJoined: student.eventsJoined } : student));
    setEditing(null);
    setMessage('Student information updated.');
  }

  const statCards = [
    { label: 'Total students', value: total, color: 'text-nu-dark' },
    { label: 'Registered for an event', value: registeredCount, color: 'text-nu-dark' },
  ];

  let messageBox = null;
  if (message) {
    messageBox = (
      <p
        role="status"
        className="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800"
      >
        {message}
      </p>
    );
  }

  let viewModal = null;
  if (viewing !== null) {
    viewModal = <ViewStudentModal student={viewing} onClose={() => setViewing(null)} />;
  }

  // key={editing.id} makes the form start fresh for every student
  let editModal = null;
  if (editing !== null) {
    editModal = (
      <EditStudentModal
        key={editing.id}
        student={editing}
        students={students}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      />
    );
  }

  let tableContent;
  if (loading) {
    tableContent = <p role="status" className="px-5 py-16 text-center text-sm text-slate-500">Loading students?</p>;
  } else if (loadError) {
    tableContent = <div className="px-5 py-16 text-center">
      <p role="alert" className="mb-4 text-sm text-red-700">{loadError}</p>
      <Button variant="outline" onClick={refreshStudents}>Try again</Button>
    </div>;
  } else if (filtered.length === 0) {
    tableContent = (
      <div className="px-5 py-16 text-center">
        <p className="font-semibold text-nu-dark">{keyword ? 'No students found' : 'No students yet'}</p>
        <p className="mt-1 text-sm text-slate-500">
          {keyword ? 'Try another name, student ID, or email.' : 'Student records will appear here once available.'}
        </p>
      </div>
    );
  } else {
    tableContent = (
      <>
        <TableContainer className="w-full" sx={{ overflowX: 'auto' }}>
          <Table
            size="small"
            sx={{
              minWidth: 1050,
              '& .MuiTableCell-root': { fontFamily: 'inherit', borderColor: '#e2e8f0', py: 1.75 },
            }}
          >
            <TableHead sx={{ backgroundColor: '#f8fafc' }}>
              <TableRow>
                {[
                  'Student',
                  'Student ID',
                  'Year level',
                  'Program',
                  'Events joined',
                  'Actions',
                ].map((heading) => (
                  <TableCell key={heading} sx={{ fontWeight: 600, color: '#1b2f5a' }}>
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((student) => (
                <TableRow key={student.id} hover>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <StudentAvatar student={student} />
                      <div className="min-w-0">
                        <p className="font-semibold text-nu-dark">{getFullName(student)}</p>
                        <p className="break-all text-xs text-slate-500">{student.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', color: '#475569' }}>
                    {student.studentId}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', color: '#475569' }}>
                    {student.yearLevel || '—'}
                  </TableCell>
                  <TableCell sx={{ minWidth: 260, maxWidth: 380, color: '#475569' }}>
                    <span className="line-clamp-2">{student.program || '—'}</span>
                  </TableCell>
                  <TableCell sx={{ color: '#475569' }}>{student.eventsJoined}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setViewing(student)}
                        aria-label={'View ' + getFullName(student)}
                        className="rounded-md p-2 text-nu-navy hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy"
                      >
                        <Eye size={17} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMessage('');
                          setEditing(student);
                        }}
                        aria-label={'Edit ' + getFullName(student)}
                        className="rounded-md p-2 text-nu-navy hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy"
                      >
                        <Pencil size={17} aria-hidden="true" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          rowsPerPage={ROWS_PER_PAGE}
          rowsPerPageOptions={[ROWS_PER_PAGE]}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          sx={{ fontFamily: 'inherit', '& *': { fontFamily: 'inherit' } }}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Student Management</h1>
        <p className="mt-1 text-sm text-slate-500">
          View and manage student records and their event participation.
        </p>
      </header>

      {/* Student summary */}
      <section aria-label="Student summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className={'mt-1 text-2xl font-bold ' + card.color}>
              {loading || loadError ? '?' : card.value.toLocaleString()}
            </p>
          </div>
        ))}
      </section>

      {messageBox}

      <section
        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
        aria-label="Students"
      >
        {/* Student search */}
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:p-5">
          <label className="relative block w-full sm:max-w-md">
            <span className="sr-only">Search students</span>
            <Search
              size={17}
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value.slice(0, 100));
                setPage(0);
              }}
              placeholder="Search by name, ID, or email"
              className="pl-10"
            />
          </label>
          <Button variant="outline" onClick={refreshStudents} disabled={loading}>Refresh</Button>
          <p className="text-sm text-slate-500 sm:ml-auto" role="status">
            {loading || loadError ? '?' : `${filtered.length.toLocaleString()} ${filtered.length === 1 ? 'student' : 'students'}`}
          </p>
        </div>

        {tableContent}
      </section>
      <p className="text-xs text-slate-500 sm:hidden">
        Swipe the table sideways to see every column.
      </p>

      {viewModal}
      {editModal}
    </div>
  );
}

export default AdminStudentsPage;
