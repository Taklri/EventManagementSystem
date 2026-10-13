import { useEffect, useState } from 'react';
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
import {
  sanitizeName,
  sanitizeStudentId,
  validateName,
  validateStudentId,
} from '../lib/authValidation';

// Frontend only: student records will come from the future backend integration.
// Backend handoff: see EMS/docs/student-management-handoff.md.
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
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
  );
}

// popup to see the student's details (cannot change anything)
function ViewStudentModal({ student, onClose }) {
  const rows = [
    ['Student ID', student.studentId],
    ['Name', getFullName(student)],
    ['Email', student.email],
    ['Events joined', String(student.eventsJoined)],
  ];

  return (
    <Modal title="Student details" onClose={onClose}>
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

  const [errors, setErrors] = useState({});

  function handleSubmit(event) {
    event.preventDefault();

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
      email: student.email,
      eventsJoined: student.eventsJoined,
    };

    onSave(updated);
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
    <Modal title="Edit student" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="edit-student-id" className={modalLabelClass}>
            Student ID
          </label>
          <Input
            id="edit-student-id"
            value={studentId}
            maxLength={11}
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
          <Button type="submit">Save changes</Button>
        </div>
      </form>
    </Modal>
  );
}

function AdminStudentsPage() {
  // Integration point: populate this empty list with the future student-list request.
  const [students, setStudents] = useState([]);

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
    `${getFullName(student)} ${student.studentId} ${student.email}`.toLowerCase().includes(keyword),
  );

  // only the students of the current page
  const start = page * ROWS_PER_PAGE;
  const visible = filtered.slice(start, start + ROWS_PER_PAGE);

  function handleSave(updated) {
    // Frontend only: update React state. Changes do not persist after refresh.
    // Integration point: save through the future API before updating this list.
    const newList = [];
    for (let i = 0; i < students.length; i++) {
      if (students[i].id === updated.id) {
        newList.push(updated);
      } else {
        newList.push(students[i]);
      }
    }
    setStudents(newList);
    setEditing(null);
    setMessage('Student information updated for this preview. Changes reset on refresh.');
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
  if (filtered.length === 0) {
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
              minWidth: 600,
              '& .MuiTableCell-root': { fontFamily: 'inherit', borderColor: '#e2e8f0', py: 1.75 },
            }}
          >
            <TableHead sx={{ backgroundColor: '#f8fafc' }}>
              <TableRow>
                {[
                  'Student',
                  'Student ID',
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
                      <span
                        className={
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ' +
                          AVATAR_COLORS[student.id % AVATAR_COLORS.length]
                        }
                      >
                        {getInitials(student)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-nu-dark">{getFullName(student)}</p>
                        <p className="break-all text-xs text-slate-500">{student.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', color: '#475569' }}>
                    {student.studentId}
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
              {card.value.toLocaleString()}
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
          <p className="text-sm text-slate-500 sm:ml-auto" role="status">
            {filtered.length.toLocaleString()} {filtered.length === 1 ? 'student' : 'students'}
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
