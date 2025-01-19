import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

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

  try {
    // const todayStart = new Date();
    // todayStart.setHours(0, 0, 0, 0);

    if (type === "sale_calcutlation") {
      // Define the start of today to filter records from midnight
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Get today's total amount and quantity for "FEED" category
      const feedSales = await prisma.sales.aggregate({
        where: {
          category: "FEED",
          created_at: {
            gte: startOfDayBST, // Filter for records from the start of today
          },
        },
        _sum: {
          discountedPrice: true,
          quantity: true,
        },
      });

      const feedSalesAmount = feedSales._sum.discountedPrice ;
      const feedSalesQuantity = feedSales._sum.quantity || 0;

      // Get today's total amount and quantity for "MEDICINE" category
      const medicineSales = await prisma.sales.aggregate({
        where: {
          category: "MEDICINE",
          created_at: {
            gte: startOfDayBST, // Filter for records from the start of today
          },
        },
        _sum: {
          discountedPrice: true,
          quantity: true,
        },
      });

      const medicineSalesAmount = medicineSales._sum.discountedPrice || 0;
      const medicineSalesQuantity = medicineSales._sum.quantity || 0;

      // Get today's total amount and quantity for "GROCERY" category
      const grocerySales = await prisma.sales.aggregate({
        where: {
          category: "GROCERY",
          created_at: {
            gte: startOfDayBST, // Filter for records from the start of today
          },
        },
        _sum: {
          discountedPrice: true,
          quantity: true,
        },
      });

      const grocerySalesAmount = grocerySales._sum.discountedPrice || 0;
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
            gte: startOfDayBST,
          },
        },
        _sum: {
          discountedPrice: true,
        },
      });
      
      // Calculate total special Discount for today
      const totalSpecialDiscount = await prisma.specialDiscount.aggregate({
        where: {
          created_at: {
            gte: startOfDayBST,
          },
        },
        _sum: {
          amount: true,
        },
      });
      const totalSalesAmount = totalSales._sum.discountedPrice - totalSpecialDiscount._sum.amount;
      

      // Calculate total expenses for today
      const totalExpenses = await prisma.expneses.aggregate({
        where: {
          created_at: {
            gte: startOfDayBST,
          },
        },
        _sum: {
          amount: true,
        },
      });
      const totalExpensesAmount = totalExpenses._sum.amount || 0;

    
      // Total collect payment
      const totalCollectedPayment = await prisma.collectPayment.aggregate({
        where: {
          created_at: {
            gte: startOfDayBST,
          },
        },
        _sum: {
          amount: true,
        },
      });
      const totalCollectedAmount = totalCollectedPayment._sum.amount || 0;
        
      // Calculate available cash
      const availableCash = (totalSalesAmount - totalExpensesAmount) + totalCollectedAmount;

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
