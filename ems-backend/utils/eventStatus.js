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
  object.status = calculateStatus(event);
  return object;
};
