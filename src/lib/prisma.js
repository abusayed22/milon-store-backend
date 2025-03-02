import { PrismaClient } from '@prisma/client';

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    console.log(global)
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default prisma;



// const allowedCategories = ["FEED", "MEDICINE", "GROCERY"];
// const allowedPaymentStatuses = ["due", "paid"];

// function validateCategory(category) {
//   if (!allowedCategories.includes(category)) {
//     throw new Error(`Invalid category: ${category}. Allowed values are ${allowedCategories.join(", ")}.`);
//   }
// }

// function validatePaymentStatus(status) {
//   if (!allowedPaymentStatuses.includes(status)) {
//     throw new Error(`Invalid payment status: ${status}. Allowed values are ${allowedPaymentStatuses.join(", ")}.`);
//   }
// }

// // Example usage
// app.post("/products", (req, res) => {
//   const { category, paymentStatus } = req.body;

//   try {
//     validateCategory(category);
//     validatePaymentStatus(paymentStatus);
//     // Proceed with saving the data to the database
//   } catch (error) {
//     res.status(400).send({ error: error.message });
//   }
// });