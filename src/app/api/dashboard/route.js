import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (type === "sale_calcutlation") {
      // Define the start of today to filter records from midnight
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Get today's total amount and quantity for "FEED" category
      const feedSales = await prisma.sales.aggregate({
        where: {
          category: "FEED",
          created_at: {
            gte: todayStart, // Filter for records from the start of today
          },
        },
        _sum: {
          salesPrice: true,
          quantity: true,
        },
      });

      const feedSalesAmount = feedSales._sum.salesPrice || 0;
      const feedSalesQuantity = feedSales._sum.quantity || 0;

      // Get today's total amount and quantity for "MEDICINE" category
      const medicineSales = await prisma.sales.aggregate({
        where: {
          category: "MEDICINE",
          created_at: {
            gte: todayStart, // Filter for records from the start of today
          },
        },
        _sum: {
          salesPrice: true,
          quantity: true,
        },
      });

      const medicineSalesAmount = medicineSales._sum.salesPrice || 0;
      const medicineSalesQuantity = medicineSales._sum.quantity || 0;

      // Get today's total amount and quantity for "GROCERY" category
      const grocerySales = await prisma.sales.aggregate({
        where: {
          category: "GROCERY",
          created_at: {
            gte: todayStart, // Filter for records from the start of today
          },
        },
        _sum: {
          salesPrice: true,
          quantity: true,
        },
      });

      const grocerySalesAmount = grocerySales._sum.salesPrice || 0;
      const grocerySalesQuantity = grocerySales._sum.quantity || 0;

      // Return the aggregated results
      return NextResponse.json({
        status: "ok",
        data: {
          feedSales: {
            totalAmount: feedSalesAmount,
            totalQuantity: feedSalesQuantity,
          },
          medicineSales: {
            totalAmount: medicineSalesAmount,
            totalQuantity: medicineSalesQuantity,
          },
          grocerySales: {
            totalAmount: grocerySalesAmount,
            totalQuantity: grocerySalesQuantity,
          },
        },
      });
    } else if (type === "available_cash") {
      try {
        // Calculate total sales for today
      const totalSales = await prisma.sales.aggregate({
        where: {
          created_at: {
            gte: todayStart,
          },
        },
        _sum: {
          salesPrice: true,
        },
      });
      const totalSalesAmount = totalSales._sum.salesPrice || 0;

      // Calculate total expenses for today
      const totalExpenses = await prisma.expneses.aggregate({
        where: {
          created_at: {
            gte: todayStart,
          },
        },
        _sum: {
          amount: true,
        },
      });
      const totalExpensesAmount = totalExpenses._sum.amount || 0;

      // Calculate available cash
      const availableCash = totalSalesAmount - totalExpensesAmount;
      // Total collect payment
      const totalCollectedPayment = await prisma.collectPayment.aggregate({
        where: {
          created_at: {
            gte: todayStart,
          },
        },
        _sum: {
          amount: true,
        },
      });
      const totalCollectedAmount = totalCollectedPayment._sum.amount || 0;

      return NextResponse.json({
        status: "ok",
        availableCash,
        totalSalesAmount,
        totalExpensesAmount,
        totalCollectedAmount,
      });
      } catch (error) {
        console.error(error.message)
        return NextResponse.json({error: error.message})
      }
    } else {
      return NextResponse.json({
        status: 400,
        error: "Invalid type parameter",
      });
    }
  } catch (error) {
    console.error("Failed to get total sales amount for today:", error.message);
    return NextResponse.json({
      status: 500,
      error: "Failed to get total sales amount for today",
    });
  }
}


// export async function GET(req) {
//   const { searchParams } = await new URL(req.url);
//   const type =  searchParams.get("type");
//   console.log(type)

//   try {
//     const todayStart = new Date();
//     todayStart.setHours(0, 0, 0, 0); // Set the start of the day (midnight)

//     if (type === "sale_calcutlation") {
//       // Fetching sales data by category for today (FEED, MEDICINE, GROCERY)
//       console.log("sale_calcutlation")

//       const feedSales = await prisma.sales.aggregate({
//         where: {
//           category: "FEED",
//           created_at: { gte: todayStart },
//         },
//         _sum: { salesPrice: true, quantity: true },
//       });

//       const feedSalesAmount = feedSales._sum.salesPrice || 0;
//       const feedSalesQuantity = feedSales._sum.quantity || 0;

//       const medicineSales = await prisma.sales.aggregate({
//         where: {
//           category: "MEDICINE",
//           created_at: { gte: todayStart },
//         },
//         _sum: { salesPrice: true, quantity: true },
//       });

//       const medicineSalesAmount = medicineSales._sum.salesPrice || 0;
//       const medicineSalesQuantity = medicineSales._sum.quantity || 0;

//       const grocerySales = await prisma.sales.aggregate({
//         where: {
//           category: "GROCERY",
//           created_at: { gte: todayStart },
//         },
//         _sum: { salesPrice: true, quantity: true },
//       });

//       const grocerySalesAmount = grocerySales._sum.salesPrice || 0;
//       const grocerySalesQuantity = grocerySales._sum.quantity || 0;

//       return NextResponse.json({
//         status: "ok",
//         data: {
//           feedSales: { totalAmount: feedSalesAmount, totalQuantity: feedSalesQuantity },
//           medicineSales: { totalAmount: medicineSalesAmount, totalQuantity: medicineSalesQuantity },
//           grocerySales: { totalAmount: grocerySalesAmount, totalQuantity: grocerySalesQuantity },
//         },
//       });

//     } else if (type === "available_cash") {
//       // Fetching sales, expenses, and collected payments for today
//       console.log("available_cash")

//       const totalSales = await prisma.sales.aggregate({
//         where: { created_at: { gte: todayStart } },
//         _sum: { salesPrice: true },
//       });
//       const totalSalesAmount = totalSales._sum.salesPrice || 0;

//       const totalExpenses = await prisma.expenses.aggregate({
//         where: { created_at: { gte: todayStart } },
//         _sum: { amount: true },
//       });
//       const totalExpensesAmount = totalExpenses._sum.amount || 0;

//       const availableCash = totalSalesAmount - totalExpensesAmount;

//       const totalCollectedPayment = await prisma.collectPayment.aggregate({
//         where: { created_at: { gte: todayStart } },
//         _sum: { amount: true },
//       });
//       const totalCollectedAmount = totalCollectedPayment._sum.amount || 0;

//       return NextResponse.json({
//         status: "ok",
//         availableCash,
//         totalSalesAmount,
//         totalExpensesAmount,
//         totalCollectedAmount,
//       });

//     } else {
//       return NextResponse.json({
//         status: 400,
//         error: "Invalid type parameter",
//       });
//     }

//   } catch (error) {
//     console.error("Failed to process request:", error.message);
//     return NextResponse.json({
//       status: 500,
//       error: "Failed to get data for today",
//     });
//   }
// }