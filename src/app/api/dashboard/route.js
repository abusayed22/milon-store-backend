import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { DateTime } from "luxon";

const prisma = new PrismaClient();

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  try {
    const timeZone = "Asia/Dhaka";

    // Get the current UTC time
    const nowUTC = DateTime.utc();

    // Calculate the start and end of the day in UTC, adjusted for Asia/Dhaka
    const startOfDayUTC = nowUTC.setZone(timeZone).startOf("day").toUTC();
    const endOfDayUTC = nowUTC.setZone(timeZone).endOf("day").toUTC();


    if (type === "sale_calcutlation") {
      // Calculate total special Discount for today
      const totalSpecialDiscountAmount = await prisma.specialDiscount.aggregate({
        where: {
          created_at: {
            gte: startOfDayUTC,
            lte: endOfDayUTC,
          },
        },
        _sum: {
          amount: true,
        },
      });
      const totalSpecialDiscount = totalSpecialDiscountAmount._sum.amount

      // -------------  Feed ----------
      // Get today's total amount and quantity for "FEED" category
      const feedSales = await prisma.sales.aggregate({
        where: {
          category: "FEED",
          created_at: {
            gte: startOfDayUTC,
            lte: endOfDayUTC,
          },
        },
        _sum: {
          discountedPrice: true,
          quantity: true,
        },
      });

      const feedSalesQuantity = feedSales._sum.quantity || 0;
      // net feed sales amount
      const feedSalesAmount = feedSales._sum.discountedPrice;

      // -------------  Medicne ----------
      // Get today's total amount and quantity for "MEDICINE" category
      const medicineSales = await prisma.sales.aggregate({
        where: {
          category: "MEDICINE",
          created_at: {
            gte: startOfDayUTC,
            lte: endOfDayUTC,
          },
        },
        _sum: {
          discountedPrice: true,
          quantity: true,
        },
      });

      const medicineSalesAmount = medicineSales._sum.discountedPrice;
      const medicineSalesQuantity = medicineSales._sum.quantity || 0;

      // ----------- Grocery ---------
      // Get today's total amount and quantity for "GROCERY" category
      const grocerySales = await prisma.sales.aggregate({
        where: {
          category: "GROCERY",
          created_at: {
            gte: startOfDayUTC,
            lte: endOfDayUTC,
          },
        },
        _sum: {
          discountedPrice: true,
          quantity: true,
        },
      });

      const grocerySalesAmount = grocerySales._sum.discountedPrice;
      const grocerySalesQuantity = grocerySales._sum.quantity || 0;

      // Return the aggregated results
      return NextResponse.json({
        status: "ok",
        data: {
          feedSales: {
            totalAmount: feedSalesAmount,
            totalQuantity: feedSalesQuantity,
            today: endOfDayUTC,
            totalSpecialDiscount,
          },
          medicineSales: {
            totalAmount: medicineSalesAmount,
            totalQuantity: medicineSalesQuantity,
            today: endOfDayUTC,
            totalSpecialDiscount,
          },
          grocerySales: {
            totalAmount: grocerySalesAmount,
            totalQuantity: grocerySalesQuantity,
            today: endOfDayUTC,
            totalSpecialDiscount,
          },
        },
      });
    } else if (type === "available_cash") {
      try {
        // Calculate total sales for today
        const todayTotalSalesAmount = await prisma.sales.aggregate({
          where: {
            created_at: {
              gte: startOfDayUTC,
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
              gte: startOfDayUTC,
              lte: endOfDayUTC,
            },
          },
          _sum: {
            amount: true,
          },
        });
        const totalSalesAmount =
          todayTotalSalesAmount._sum.discountedPrice -
          totalSpecialDiscount._sum.amount;

        // Calculate total expenses for today
        const totalExpenses = await prisma.expneses.aggregate({
          where: {
            created_at: {
              gte: startOfDayUTC,
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
              gte: startOfDayUTC,
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
          totalSalesAmount + totalCollectedAmount - totalExpensesAmount;

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
    } else if (type === 'total_available_cash') {
      try {
        // Calculate total sales for total
        const todayTotalSalesAmount = await prisma.sales.aggregate({
          _sum: {
            discountedPrice: true,
          },
        });

        // Calculate total special Discount for today
        const totalSpecialDiscount = await prisma.specialDiscount.aggregate({
          _sum: {
            amount: true,
          },
        });
        const totalSalesAmount =todayTotalSalesAmount._sum.discountedPrice - totalSpecialDiscount._sum.amount;

        // Calculate total expenses for today
        const totalExpenses = await prisma.expneses.aggregate({
          _sum: {
            amount: true,
          },
        });
        const totalExpensesAmount = totalExpenses._sum.amount || 0;

        // Total collect payment
        const totalCollectedPayment = await prisma.collectPayment.aggregate({
          _sum: {
            amount: true,
          },
        });
        const totalCollectedAmount = totalCollectedPayment._sum.amount || 0;

        // Calculate available cash
        const availableCash =
          (totalSalesAmount + totalCollectedAmount) - totalExpensesAmount;

        return NextResponse.json({
          status: "ok",
          availableCash,
          // totalSalesAmount,
          // totalExpensesAmount,
          // totalCollectedAmount,
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
