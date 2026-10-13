import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Clock3, RotateCcw } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { eventsApi } from '../lib/api';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const campusTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

const AttendancePage = () => {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [cameraMode, setCameraMode] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let active = true;
    eventsApi
      .attendance(id, accessToken)
      .then((data) => {
        if (!active) return;
        setStatus(data);
        setError('');
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load attendance status.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, accessToken]);

  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview],
  );

  useEffect(() => {
    if (cameraMode !== 'desktop' || !videoRef.current || !streamRef.current) return undefined;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.play().catch(() => {
      setCameraError('Unable to start the laptop camera preview. Check the browser permission.');
    });
    return () => {
      video.srcObject = null;
    };
  }, [cameraMode]);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const stopDesktopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraMode(null);
  };

  const clearPhoto = () => {
    stopDesktopCamera();
    setPhotoFile(null);
    setPhotoPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePhotoChange = (event) => {
    const [file] = event.target.files || [];
    if (!file) return;
    setError('');
    if (!PHOTO_TYPES.has(file.type)) {
      clearPhoto();
      setError('Take a JPEG, PNG, or WebP photo.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      clearPhoto();
      setError('The attendance photo must be 5 MB or smaller.');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const isMobileDevice = () =>
    /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent);

  const openCamera = async () => {
    setCameraError('');
    if (isMobileDevice()) {
      fileInputRef.current?.click();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('This browser does not support laptop camera access. Use a current Chrome, Edge, or Safari browser.');
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraMode('desktop');
    } catch (cameraAccessError) {
      setCameraError(
        cameraAccessError.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in your browser, then try again.'
          : 'Unable to open the laptop camera. Camera access requires localhost or HTTPS.',
      );
    }
  };

  const captureDesktopPhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setCameraError('The camera is still starting. Please try again in a moment.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError('Unable to capture the camera image. Please try again.');
        return;
      }
      const file = new File([blob], `attendance-${action.replace(' ', '-')}.jpg`, {
        type: 'image/jpeg',
      });
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      stopDesktopCamera();
    }, 'image/jpeg', 0.9);
  };

  const submitPhoto = async () => {
    if (!photoFile || !status?.canSubmit) return;
    setSaving(true);
    setError('');
    try {
      const response = await eventsApi.recordAttendance(id, accessToken, photoFile);
      setResult(response);
      setStatus((current) => ({
        ...current,
        action: response.attendance?.timeOut ? 'complete' : 'timeOut',
        canSubmit: !response.attendance?.timeOut,
        attendance: response.attendance,
      }));
      clearPhoto();
    } catch (requestError) {
      setError(requestError.message || 'Unable to save this attendance photo.');
    } finally {
      setSaving(false);
    }
  };

  const action = status?.action === 'timeOut' ? 'time out' : 'time in';
  const attendance = status?.attendance;

  return (
    <div className="mx-auto flex min-h-[65vh] items-center justify-center px-1 py-8 text-nu-dark">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Event attendance
        </p>
        {loading ? (
          <p role="status" className="mt-5 text-sm text-slate-600">
            Checking your attendance status…
          </p>
        ) : error && !status ? (
          <div>
            <h1 className="mt-3 text-2xl font-bold">Attendance unavailable</h1>
            <p role="alert" className="mt-2 text-sm leading-6 text-red-700">
              {error}
            </p>
          </div>
        ) : (
          <div>
            <h1 className="mt-3 text-2xl font-bold">
              {status?.event?.title || 'Event attendance'}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use your phone or laptop camera as proof. The server saves the attendance time after
              the photo is submitted.
            </p>

            {attendance?.timeIn && (
              <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm">
                <div className="flex items-center gap-2 font-semibold text-nu-dark">
                  <Clock3 size={16} aria-hidden="true" />
                  Time in recorded
                </div>
                <p className="mt-1 text-slate-600">{campusTime(attendance.timeIn)}</p>
              </div>
            )}
            {attendance?.timeOut && (
              <div className="mt-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  Time out recorded
                </div>
                <p className="mt-1">{campusTime(attendance.timeOut)}</p>
              </div>
            )}

            {status?.action === 'complete' ? (
              <p className="mt-5 text-sm font-semibold text-emerald-700">
                Your attendance is complete. The submitted photos and times cannot be changed.
              </p>
            ) : status?.canSubmit ? (
              <div className="mt-6">
                <h2 className="text-lg font-semibold">Record {action}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {photoPreview
                    ? 'Review the photo before submitting it.'
                    : `Open your camera to take the photo for ${action}.`}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="sr-only"
                  onChange={handlePhotoChange}
                  aria-label={`Take a photo for ${action}`}
                />
                {cameraMode === 'desktop' ? (
                  <div className="mt-5 space-y-4">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="aspect-video w-full rounded-xl border border-slate-200 bg-slate-950 object-cover"
                      aria-label="Laptop camera preview"
                    />
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button type="button" className="sm:flex-1" onClick={captureDesktopPhoto}>
                        <Camera size={16} aria-hidden="true" />
                        Take photo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="sm:flex-1"
                        onClick={stopDesktopCamera}
                      >
                        Cancel camera
                      </Button>
                    </div>
                  </div>
                ) : photoPreview ? (
                  <div className="mt-5 space-y-4">
                    <img
                      src={photoPreview}
                      alt="Attendance proof preview"
                      className="max-h-80 w-full rounded-xl border border-slate-200 object-contain"
                    />
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        className="sm:flex-1"
                        onClick={() => {
                          clearPhoto();
                          openCamera();
                        }}
                        disabled={saving}
                      >
                        <RotateCcw size={16} aria-hidden="true" />
                        Retake photo
                      </Button>
                      <Button
                        type="button"
                        className="sm:flex-1"
                        onClick={submitPhoto}
                        disabled={saving}
                      >
                        {saving ? 'Submitting…' : `Submit ${action}`}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    className="mt-5 w-full"
                    onClick={openCamera}
                  >
                    <Camera size={17} aria-hidden="true" />
                    Open camera for {action}
                  </Button>
                )}
                {cameraError && (
                  <p role="alert" className="mt-3 text-sm leading-6 text-red-700">
                    {cameraError}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-amber-700">
                {status?.message || 'Attendance is not available right now.'}
              </p>
            )}

            {result && (
              <p role="status" className="mt-4 text-sm font-semibold text-emerald-700">
                {result.message}
              </p>
            )}
            {error && (
              <p role="alert" className="mt-4 text-sm leading-6 text-red-700">
                {error}
              </p>
            )}
          </div>
        )}
        <Link
          to={`/events/${id}`}
          className="mt-6 inline-flex min-h-10 items-center text-sm font-semibold text-nu-navy underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy"
        >
          Back to event
        </Link>
      </section>
    </div>
  );
};

export default AttendancePage;
