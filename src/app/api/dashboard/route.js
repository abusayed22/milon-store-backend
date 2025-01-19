import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { format, utcToZonedTime } from "date-fns-tz";

const prisma = new PrismaClient();

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  try {
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    console.log(today);

    if (type === "sale_calcutlation") {
      // -------------  Feed ----------
      // Get today's total amount and quantity for "FEED" category
      const feedSales = await prisma.sales.aggregate({
        where: {
          category: "FEED",
          created_at: {
            gte: today,
          },
        },
        _sum: {
          discountedPrice: true,
          quantity: true,
        },
      });
      // Feed sales invoices
      const totalFeedInvoices = await prisma.sales.findMany({
          where: {
            category: "FEED",
            created_at: {
              gte: today,
            },
          },
        select:{
          invoice:true
        }
      });
      const feedInvoices= totalFeedInvoices.map(obj => obj.invoice)
      // Feed sales special Discount Amount
      const totalFeedSpecialDsicountAmount = await prisma.specialDiscount.aggregate({
        where:{
          invoice:{
            in:feedInvoices
          }
        },
        _sum:{
          amount:true
        }
      });
      const feedSpecialDiscount =totalFeedSpecialDsicountAmount._sum.amount;
      const feedSalesQuantity = feedSales._sum.quantity || 0;
      // net feed sales amount
      const feedSalesAmount = feedSales._sum.discountedPrice - feedSpecialDiscount;

      console.log("feed sd:",feedSpecialDiscount)
      // -------------  Medicne ----------
      // Get today's total amount and quantity for "MEDICINE" category
      const medicineSales = await prisma.sales.aggregate({
        where: {
          category: "MEDICINE",
          created_at: {
            gte: today
          },
        },
        _sum: {
          discountedPrice: true,
          quantity: true,
        },
      });

      // Medicine sales invoices
      const totalMedicineInvoices = await prisma.sales.findMany({
        where: {
          category: "MEDICINE",
          created_at: {
            gte: today,
          },
        },
      select:{
        invoice:true
      }
    });
    const medicineInvoices= totalMedicineInvoices.map(obj => obj.invoice)
    // Feed sales special Discount Amount
    const totalMedicineSpecialDsicountAmount = await prisma.specialDiscount.aggregate({
      where:{
        invoice:{
          in:medicineInvoices
        }
      },
      _sum:{
        amount:true
      }
    });
    const medicineSpecialDiscount = totalMedicineSpecialDsicountAmount._sum.amount
      const medicineSalesAmount = medicineSales._sum.discountedPrice - medicineSpecialDiscount;
      const medicineSalesQuantity = medicineSales._sum.quantity || 0;

      console.log("medicine sd:",medicineSpecialDiscount)
      // ----------- Grocery ---------
      // Get today's total amount and quantity for "GROCERY" category
      const grocerySales = await prisma.sales.aggregate({
        where: {
          category: "GROCERY",
          created_at: {
            gte: today
          },
        },
        _sum: {
          discountedPrice: true,
          quantity: true,
        },
      });
      // Feed sales invoices
      const totalGroceryInvoices = await prisma.sales.findMany({
        where: {
          category: "GROCERY",
          created_at: {
            gte: today,
          },
        },
      select:{
        invoice:true
      }
    });
    const groceryInvoices= totalGroceryInvoices.map(obj => obj.invoice)
    // Feed sales special Discount Amount
    const totalGrocerySpecialDsicountAmount = await prisma.specialDiscount.aggregate({
      where:{
        invoice:{
          in:groceryInvoices
        }
      },
      _sum:{
        amount:true
      }
    });
    const grocerySpecialDiscount = totalGrocerySpecialDsicountAmount._sum.amount
      const grocerySalesAmount = grocerySales._sum.discountedPrice - grocerySpecialDiscount;
      const grocerySalesQuantity = grocerySales._sum.quantity || 0;

      console.log("grocery sd:",grocerySpecialDiscount)
      // Return the aggregated results
      return NextResponse.json({
        status: "ok",
        data: {
          feedSales: {
            totalAmount: feedSalesAmount,
            totalQuantity: feedSalesQuantity,
            today: today,
          },
          medicineSales: {
            totalAmount: medicineSalesAmount,
            totalQuantity: medicineSalesQuantity,
            today: today,
          },
          grocerySales: {
            totalAmount: grocerySalesAmount,
            totalQuantity: grocerySalesQuantity,
            today: today,
          },
        },
      });
    } else if (type === "available_cash") {
      try {
        // Calculate total sales for today
        const todayTotalSalesAmount = await prisma.sales.aggregate({
          where: {
            created_at: {
              gte: today
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
                gte: today
            },
          },
          _sum: {
            amount: true,
          },
        });
        const totalSalesAmount = todayTotalSalesAmount._sum.discountedPrice - totalSpecialDiscount._sum.amount;

        // Calculate total expenses for today
        const totalExpenses = await prisma.expneses.aggregate({
          where: {
            created_at: {
              gte: today
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
              gte:today
            },
          },
          _sum: {
            amount: true,
          },
        });
        const totalCollectedAmount = totalCollectedPayment._sum.amount || 0;

        // Calculate available cash
        const availableCash = (totalSalesAmount + totalCollectedAmount) - totalExpensesAmount;

        return NextResponse.json({
          status: "ok",
          availableCash,
          totalSalesAmount,
          totalExpensesAmount,
          totalCollectedAmount,
          today: today,
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
