export default function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) d.setDate(0); // Jan 31 + 1 month = Feb 28, not Mar 3
  return d;
}
