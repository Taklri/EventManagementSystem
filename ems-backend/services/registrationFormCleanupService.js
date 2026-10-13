import Event from "../models/Event.js";
import RegistrationForm from "../models/RegistrationForm.js";

export const cleanupArchivedRegistrationForms = async ({ now = new Date() } = {}) => {
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const referencedIds = await Event.distinct("registrationFormId", {
    registrationFormId: { $exists: true, $ne: null },
  });
  const filter = {
    isArchived: true,
    archivedAt: { $lte: cutoff },
    ...(referencedIds.length ? { _id: { $nin: referencedIds } } : {}),
  };
  const result = await RegistrationForm.deleteMany(filter);
  return result.deletedCount || 0;
};

export const startRegistrationFormCleanup = () => {
  const run = async () => {
    try {
      await cleanupArchivedRegistrationForms();
    } catch {
      console.error("Registration form cleanup failed");
    }
  };
  void run();
  const interval = setInterval(run, 60 * 60 * 1000);
  interval.unref?.();
  return interval;
};
