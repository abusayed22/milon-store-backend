// Get the current UTC date
const now = new Date();
// Get the offset for Bangladesh Standard Time (UTC +6 hours)
const bangladeshOffset = 6 * 60; // 6 hours in minutes
// Set the start of the day (00:00:00 BST)
const startOfDayBST = new Date(now.getTime() + bangladeshOffset * 60000);
startOfDayBST.setHours(0, 0, 0, 0); // Set to 00:00:00 in Bangladesh Time

// Set the end of the day (23:59:59 BST)
const endOfDayBST = new Date(now.getTime() + bangladeshOffset * 60000);
endOfDayBST.setHours(23, 59, 59, 999); // Set to 23:59:59 in Bangladesh Time
