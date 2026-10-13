import RegistrationForm from "../models/RegistrationForm.js";
import { normalizeRegistrationForm } from "./registrationForm.js";

export const emptyRegistrationForm = () => ({ version: 1, items: [] });

export const resolveEventRegistrationForm = async (event) => {
  if (event?.registrationFormId) {
    const form = await RegistrationForm.findById(event.registrationFormId).lean();
    if (form) return { version: form.version || 1, items: form.items || [], name: form.name, description: form.description, isArchived: form.isArchived };
  }

  const legacy = normalizeRegistrationForm(event?.registrationForm || emptyRegistrationForm());
  return legacy.value || emptyRegistrationForm();
};
