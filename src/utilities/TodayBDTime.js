// Get today's date in Bangladesh Standard Time (BST)
const todayBangladesh = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Dhaka',
});

// Create a Date object from the formatted string in Bangladesh timezone
const todayDate = new Date(todayBangladesh);

// Create the start and end time of today in BST (Midnight to 11:59 PM)
const startOfDay = new Date(todayDate.setHours(0, 0, 0, 0));  // 00:00:00 of today
const endOfDay = new Date(todayDate.setHours(23, 59, 59, 999));  // 23:59:59 of today

// Example of a timestamp from the database (e.g., `2025-01-19 07:50:45`)
const databaseTimestamp = new Date('2025-01-19T07:50:45+06:00'); // Assuming it's stored in UTC+6 (Bangladesh Time)
