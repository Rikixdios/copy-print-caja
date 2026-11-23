const businessClock = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Asuncion', year: 'numeric', month: '2-digit', day: '2-digit',
  hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit',
});

/** Use one instant for both fields, independent of the device's time zone. */
export function businessMoment(now = new Date()) {
  const parts = businessClock.formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}:${values.second}` };
}

/** Editing or forwarding a saved order preserves when it was created. */
export function orderCreationMoment(previous?: {date?: string; createdAt?: string}, now = new Date()) {
  const moment = businessMoment(now);
  return { date: previous?.date || moment.date, time: previous?.createdAt || moment.time };
}

/** New collections use confirmation time; corrections retain the recorded time. */
export function collectionMoment(previous?: {date: string; time: string}, now = new Date()) {
  return previous ? {date: previous.date, time: previous.time} : businessMoment(now);
}

/** Credit collections allow the actual payment date, including historical payments. */
export function creditPaymentMoment(draft: {date: string; time: string}, editing = false, now = new Date()) {
  const parsed = new Date(`${draft.date}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== draft.date) {
    throw new Error("Elegí una fecha de pago válida");
  }
  return {date: draft.date, time: editing ? draft.time : businessMoment(now).time};
}
