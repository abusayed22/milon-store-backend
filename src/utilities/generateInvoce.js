 export function generateInvoice() {
    // Get current date and time in YYYYMMDDHHMMSS format
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;

  // Generate a random 4-character alphanumeric string
  const randomString = Math.random().toString(36).substr(2, 4).toUpperCase();

  // Combine timestamp and random string
  return `INV-${timestamp}-${randomString}`;
  }