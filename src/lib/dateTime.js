export function localDate() {
  const nowDhaka = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" })
  );

  // Convert to UTC
  return new Date(nowDhaka.getTime() - 6 * 60 * 60 * 1000);
}

// Create Date object for local date's start (00:00:00)
export function localStartOfDay(date) {
  const localDate = new Date(date);
  localDate.setHours(0, 0, 0, 0);
  return localDate;
}

// Create Date object for local date's end (23:59:59.999)
export function localEndOfDay(date) {
  const localDate = new Date(date);
  localDate.setHours(23, 59, 59, 999);
  return localDate;
}
