import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { DateTime } from "luxon";

const prisma = new PrismaClient();



export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  

  try {
    const timeZone = "Asia/Dhaka";
    let gte, lte;

     if (dateParam) {
      const selectedDate = DateTime.fromISO(dateParam, { zone: timeZone });
      gte = selectedDate.startOf("day").toJSDate();
      lte = selectedDate.endOf("day").toJSDate();
    } else {
      const nowInDhaka = DateTime.now().setZone(timeZone);
      gte = nowInDhaka.startOf("day").toJSDate();
      lte = nowInDhaka.endOf("day").toJSDate();
    }

    const dateFilter = { created_at: { gte, lte } };



      // Fetch all data concurrently
      const [
        specialDiscount,
        todaySpecialDiscount,
        feedSales,
        medicineSales,
        grocerySales,
        todayTotalSales,
        todayExpenses,
        todayCollectedPayment,
        paidSaleInvoices,
        totalExpenses,
        totalCollectedPayment,
        totalCustomerLoan,
      ] = await Promise.all([
        // specialDiscount
        prisma.specialDiscount.aggregate({ where: dateFilter, _sum: { amount: true } }),
        prisma.specialDiscount.aggregate({ where: dateFilter, _sum: { amount: true } }),
        // feedSales
        prisma.sales.aggregate({
          where: { category: "FEED", ...dateFilter },
          _sum: { discountedPrice: true, quantity: true }
        }),
        // medicineSales
        prisma.sales.aggregate({
          where: { category: "MEDICINE", ...dateFilter },
          _sum: { discountedPrice: true, quantity: true }
        }),
        // grocerySales
        prisma.sales.aggregate({
          where: { category: "GROCERY", ...dateFilter },
          _sum: { discountedPrice: true, quantity: true }
        }),
        // todayTotalSales 
        prisma.sales.aggregate({ where: dateFilter, _sum: { discountedPrice: true } }),
        // todayExpenses
        prisma.expneses.aggregate({ where: dateFilter, _sum: { amount: true } }),
        // todayCollectedPayment
        prisma.collectPayment.aggregate({ where: dateFilter, _sum: { amount: true } }),
      //  paidSaleInvoices
        prisma.sales.findMany({
          where: { created_at: { gte, lte } ,paymentStatus: "paid" },
          select: { invoice: true }
        }),
        // totalExpenses
        prisma.expneses.aggregate({where:dateFilter, _sum: { amount: true } }),
        // totalCollectedPayment
        prisma.collectPayment.aggregate({where:dateFilter, _sum: { amount: true } }),
        // totalCustomerLoan
        prisma.customerLoan.aggregate({where:dateFilter, _sum: { amount: true } }),

        ]);
       

      // paidInvoices
      const paidInvoices = paidSaleInvoices.map(item => item.invoice);
      const paidSaleSpecialDiscount = await prisma.specialDiscount.aggregate({
        where: {created_at: { gte, lte } , invoice: { in: paidInvoices } },
        _sum: { amount: true }
      });

      // Calculate all metrics
      const totalSpecialDiscount = parseFloat(specialDiscount._sum.amount || 0);
      const todaySalesAmount = parseFloat(todayTotalSales._sum.discountedPrice || 0) - parseFloat(todaySpecialDiscount._sum.amount ||0);
      const todayExpensesAmount = parseFloat(todayExpenses._sum.amount || 0);
      const todayCollectedAmount = parseFloat(todayCollectedPayment._sum.amount || 0);
 

      const totalPaidSalesAmount = parseFloat((await prisma.sales.aggregate({
        where: {created_at:{gte,lte}, paymentStatus: "paid" },
        _sum: { discountedPrice: true }
      }))._sum.discountedPrice || 0);

      const totalPaidSpecialDiscount = parseFloat(paidSaleSpecialDiscount._sum.amount || 0);
      const totalExpensesAmount = parseFloat(totalExpenses._sum.amount || 0);
      const totalCollectedAmount = parseFloat(totalCollectedPayment._sum.amount || 0);
      const totalCustomerLoanAmount = parseFloat(totalCustomerLoan._sum.amount || 0);
      const totalAvailableCash = ((totalPaidSalesAmount - totalPaidSpecialDiscount) + totalCollectedAmount) - totalExpensesAmount;

      
      return NextResponse.json({
        status: "ok",
        data: {
          today: {
            availableCash: totalAvailableCash,
            todaySale: todaySalesAmount,
            sales: {
              feed: {
                amount: parseFloat(feedSales._sum.discountedPrice || 0),
                quantity: parseFloat(feedSales._sum.quantity || 0)
              },
              medicine: {
                amount: parseFloat(medicineSales._sum.discountedPrice || 0),
                quantity: parseFloat(medicineSales._sum.quantity || 0)
              },
              grocery: {
                amount: parseFloat(grocerySales._sum.discountedPrice || 0),
                quantity: parseFloat(grocerySales._sum.quantity || 0)
              },
              
              totalSpecialDiscount
            },
            expenses: todayExpensesAmount,
            collectedPayments: todayCollectedAmount
          },
          total: {
            availableCash: totalAvailableCash,
            expenses: totalExpensesAmount,
            collectedPayments: totalCollectedAmount,
            customerLoan: totalCustomerLoanAmount
          },
          dateRange: { gte, lte }
        }
      });
    
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({
      status: "error",
      error: error.message
    }, { status: 500 });
  }
}
