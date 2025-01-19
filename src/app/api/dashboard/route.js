import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  try {
    // Get current date in Bangladesh time
    const nowBangladesh = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Dhaka",
    });

    // Parse it into a Date object
    const todayBangladesh = new Date(nowBangladesh);

    // Calculate the start and end of today in Bangladesh time
    const startOfDayBangladesh = new Date(todayBangladesh.setHours(0, 0, 0, 0)); // 00:00:00
    const endOfDayBangladesh = new Date(
      todayBangladesh.setHours(23, 59, 59, 999)
    ); // 23:59:59

    // Convert the Bangladesh times to UTC
    const startOfDayUTC = new Date(
      startOfDayBangladesh.getTime() - 6 * 60 * 60 * 1000
    ); // UTC-6
    const endOfDayUTC = new Date(
      endOfDayBangladesh.getTime() - 6 * 60 * 60 * 1000
    ); // UTC-6

    if (type === "sale_calcutlation") {
      // Get today's total amount and quantity for "FEED" category
      const feedSales = await prisma.sales.aggregate({
        where: {
          category: "FEED",
          created_at: {
            gte: startOfDayUTC, // Filter for records from the start of today
            lte: endOfDayUTC,
          },
        },
        _sum: {
          discountedPrice: true,
          quantity: true,
        },
      });

      const feedSalesAmount = feedSales._sum.discountedPrice;
      const feedSalesQuantity = feedSales._sum.quantity || 0;

      // Get today's total amount and quantity for "MEDICINE" category
      const medicineSales = await prisma.sales.aggregate({
        where: {
          category: "MEDICINE",
          created_at: {
            gte: startOfDayUTC, // Filter for records from the start of today
            lte: endOfDayUTC,
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
            gte: startOfDayUTC, // Filter for records from the start of today
            lte: endOfDayUTC,
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
            today: endOfDayUTC,
          },
          medicineSales: {
            totalAmount: medicineSalesAmount,
            totalQuantity: medicineSalesQuantity,
            today: endOfDayUTC,
          },
          grocerySales: {
            totalAmount: grocerySalesAmount,
            totalQuantity: grocerySalesQuantity,
            today: endOfDayUTC,
          },
        },
      });
    } else if (type === "available_cash") {
      try {
        // Calculate total sales for today
        const totalSales = await prisma.sales.aggregate({
          where: {
            created_at: {
              gte: startOfDayUTC, // Filter for records from the start of today
              lte: endOfDayUTC,
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
              created_at: {
                gte: startOfDayUTC, // Filter for records from the start of today
                lte: endOfDayUTC,
              },
            },
          },
          _sum: {
            amount: true,
          },
        });
        const totalSalesAmount =
          totalSales._sum.discountedPrice - totalSpecialDiscount._sum.amount;

        // Calculate total expenses for today
        const totalExpenses = await prisma.expneses.aggregate({
          where: {
            created_at: {
              gte: startOfDayUTC, // Filter for records from the start of today
              lte: endOfDayUTC,
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
              gte: startOfDayUTC, // Filter for records from the start of today
              lte: endOfDayUTC,
            },
          },
          _sum: {
            amount: true,
          },
        });
        const totalCollectedAmount = totalCollectedPayment._sum.amount || 0;

        // Calculate available cash
        const availableCash =
          totalSalesAmount - totalExpensesAmount + totalCollectedAmount;

        return NextResponse.json({
          status: "ok",
          availableCash,
          totalSalesAmount,
          totalExpensesAmount,
          totalCollectedAmount,
          today: endOfDayUTC,
        });
      } catch (error) {
        console.error(error.message);
        return NextResponse.json({ error: error.message });
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
