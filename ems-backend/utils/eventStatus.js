export const calculateStatus = (event, now = new Date()) => {
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);

  if (now < start) {
    return "Coming Soon";
  }

  if (now > end) {
    return "Ended";
  }

  return "Ongoing";
};

export const withStatus = (event) => {
  const object = event.toObject();
  delete object.createdBy;
  delete object.imagePublicId;
  object.eventType = object.eventType || "Other";
  object.tags = Array.isArray(object.tags) ? object.tags : [];
  object.agenda = Array.isArray(object.agenda) ? object.agenda : [];
  object.speakers = Array.isArray(object.speakers) ? object.speakers : [];
  object.requirements = Array.isArray(object.requirements) ? object.requirements : [];
  object.reminders = Array.isArray(object.reminders) ? object.reminders : [];
  object.registrationMode = object.registrationMode || "none";
  for (const speaker of object.speakers) {
    if (speaker) delete speaker.photoPublicId;
  }
  object.status = calculateStatus(event);
  return object;
};
