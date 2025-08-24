import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { DateTime } from "luxon";

const prisma = new PrismaClient();



// export async function GET(req) {
//   const { searchParams } = new URL(req.url);
//   const dateParam = searchParams.get("date"); // Expects "YYYY-MM-DD"

//   try {
//     const timeZone = "Asia/Dhaka";
//     let gte, lte;

//     // Use the provided date or default to the current day
//     if (dateParam) {
//       const selectedDate = DateTime.fromISO(dateParam, { zone: timeZone });
//       gte = selectedDate.startOf("day").toJSDate();
//       lte = selectedDate.endOf("day").toJSDate();
//     } else {
//       const nowInDhaka = DateTime.now().setZone(timeZone);
//       gte = nowInDhaka.startOf("day").toJSDate();
//       lte = nowInDhaka.endOf("day").toJSDate();
//     }

//     // Filter for the selected day (e.g., "Today's Sales")
//     const dateFilter = { created_at: { gte, lte } };
//     // Filter for all time up to the selected day (e.g., "Total Available Cash")
//     const upToDateFilter = { created_at: { lte } };

//     // --- Fetch all data in parallel ---
//     const [
//       dateFilteredData,
//       upToDateData,
//     ] = await Promise.all([
//       // 1. Get all data for the selected date range
//       prisma.$transaction([
//         prisma.specialDiscount.aggregate({ where: dateFilter, _sum: { amount: true } }),
//         prisma.sales.groupBy({ by: ['category'], where: dateFilter, _sum: { discountedPrice: true, quantity: true } }),
//         prisma.expneses.aggregate({ where: dateFilter, _sum: { amount: true } }),
//         prisma.collectPayment.aggregate({ where: dateFilter, _sum: { amount: true } }),
//         prisma.sales.aggregate({ where: dateFilter, _sum: { discountedPrice: true } }),
//       ]),
//       // 2. Get all-time totals up to the selected date
//       prisma.$transaction([
//         prisma.expneses.aggregate({ where: upToDateFilter, _sum: { amount: true } }),
//         prisma.collectPayment.aggregate({ where: upToDateFilter, _sum: { amount: true } }),
//         prisma.customerLoan.aggregate({ where: upToDateFilter, _sum: { amount: true } }),
//         prisma.sales.findMany({ where: { ...upToDateFilter, paymentStatus: "paid" }, select: { invoice: true } }),
//         prisma.sales.aggregate({ where: { ...upToDateFilter, paymentStatus: "paid" }, _sum: { discountedPrice: true } }),
//       ]),
//     ]);

//     // --- Process Date-Filtered Data ---
//     const [
//       specialDiscountDate,
//       salesByCategoryDate,
//       expensesDate,
//       collectedPaymentDate,
//       totalSalesDate
//     ] = dateFilteredData;

//     const netSalesForDate = (totalSalesDate._sum.discountedPrice ?? 0) - (specialDiscountDate._sum.amount ?? 0);
//     const expensesForDate = expensesDate._sum.amount ?? 0;
//     const collectedForDate = collectedPaymentDate._sum.amount ?? 0;
//     const availableCashForDate = (netSalesForDate + collectedForDate) - expensesForDate;

//     // --- Process "Up-To-Date" Data ---
//     const [totalExpenses, totalCollected, totalLoan, paidSaleInvoices, totalPaidSalesResult] = upToDateData;
//     const paidInvoices = paidSaleInvoices.map(item => item.invoice);
    
//     const paidSaleSpecialDiscount = await prisma.specialDiscount.aggregate({
//       where: { ...upToDateFilter, invoice: { in: paidInvoices } },
//       _sum: { amount: true }
//     });

//     const totalPaidSalesAmount = (totalPaidSalesResult._sum.discountedPrice ?? 0) - (paidSaleSpecialDiscount._sum.amount ?? 0);
//     const totalExpensesAmount = totalExpenses._sum.amount ?? 0;
//     const totalCollectedAmount = totalCollected._sum.amount ?? 0;
//     // const totalCustomerLoanAmount = totalLoan._sum.amount ?? 0;
//     const totalAvailableCash = (totalPaidSalesAmount + totalCollectedAmount) - totalExpensesAmount ;

//     // --- Construct Final Response ---
//     const findCategory = (cat) => salesByCategoryDate.find(c => c.category === cat)?._sum || {};

//     return NextResponse.json({
//       status: "ok",
//       data: {
//         selectedDate: {
//           availableCash: totalAvailableCash,
//           totalSales: netSalesForDate,
//           expenses: expensesForDate,
//           collectedPayments: collectedForDate,
//           sales: {
//             feed: { amount: findCategory("FEED").discountedPrice ?? 0, quantity: findCategory("FEED").quantity ?? 0 },
//             medicine: { amount: findCategory("MEDICINE").discountedPrice ?? 0, quantity: findCategory("MEDICINE").quantity ?? 0 },
//             grocery: { amount: findCategory("GROCERY").discountedPrice ?? 0, quantity: findCategory("GROCERY").quantity ?? 0 },
//             totalSpecialDiscount: specialDiscountDate._sum.amount ?? 0,
//           },
//         },
//         total: {
//           availableCash: totalAvailableCash, //TODO:
//           expenses: totalExpensesAmount,
//           collectedPayments: totalCollectedAmount,
//           // customerLoan: totalCustomerLoanAmount,
//         },
//         dateRange: { gte, lte }
//       }
//     });

//   } catch (error) {
//     console.error("Dashboard API error:", error);
//     return NextResponse.json({
//       status: "error",
//       error: "An internal server error occurred."
//     }, { status: 500 });
//   }
// }


export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date"); // Expects "YYYY-MM-DD"

  try {
    const timeZone = "Asia/Dhaka";
    let gte, lte;
    

    // Use the provided date or default to the current day
    if (dateParam) {
      const selectedDate = DateTime.fromISO(dateParam, { zone: timeZone });
      // console.log(selectedDate)
      gte = selectedDate.startOf("day").toJSDate();
      lte = selectedDate.endOf("day").toJSDate();
    } else {
      const nowInDhaka = DateTime.now().setZone(timeZone);
      gte = nowInDhaka.startOf("day").toJSDate();
      lte = nowInDhaka.endOf("day").toJSDate();
    }
    // console.log("gte ",gte)
    // console.log("lte ",lte)

    // Filter for the selected day (e.g., "Today's Sales")
    const dateFilter = { created_at: { gte, lte } };
    // Filter for all time up to the selected day (e.g., "Total Available Cash")
    const upToDateFilter = { created_at: { lte } };

    // --- Fetch all data in parallel ---
    const [
      dateFilteredData,
      upToDateData,
    ] = await Promise.all([
      // 1. Get all data for the selected date range
      prisma.$transaction([
        prisma.sales.findMany({ where: dateFilter, select: { invoice: true, category: true } }),
        prisma.sales.groupBy({ by: ['category'], where: dateFilter, _sum: { discountedPrice: true, quantity: true } }),
        prisma.expneses.aggregate({ where: dateFilter, _sum: { amount: true } }),
        prisma.collectPayment.aggregate({ where: dateFilter, _sum: { amount: true } }),
        prisma.sales.aggregate({ where: dateFilter, _sum: { discountedPrice: true } }),
      ]),
      // 2. Get all-time totals up to the selected date
      prisma.$transaction([
        prisma.expneses.aggregate({ where: upToDateFilter, _sum: { amount: true } }),
        prisma.collectPayment.aggregate({ where: upToDateFilter, _sum: { amount: true } }),
        prisma.customerLoan.aggregate({ where: upToDateFilter, _sum: { amount: true } }),
        prisma.sales.findMany({ where: { ...upToDateFilter, paymentStatus: "paid" }, select: { invoice: true } }),
        prisma.sales.aggregate({ where: { ...upToDateFilter, paymentStatus: "paid" }, _sum: { discountedPrice: true } }),
      ]),
    ]);

    // --- Process Date-Filtered Data ---
    const [
      salesWithInvoicesForDate,
      salesByCategoryDate,
      expensesDate,
      collectedPaymentDate,
      totalSalesDate
    ] = dateFilteredData;

    // Create a map to link invoices to their categories
    const invoiceToCategoryMap = salesWithInvoicesForDate.reduce((map, sale) => {
        if (sale.invoice && sale.category) {
            map[sale.invoice] = sale.category;
        }
        return map;
    }, {});
    const invoiceNumbersForDate = Object.keys(invoiceToCategoryMap);

    // Get all special discounts for the day's invoices
    const allSpecialDiscountsForDate = await prisma.specialDiscount.findMany({
        where: { invoice: { in: invoiceNumbersForDate } }
    });

    // Calculate the total discount and the discount per category
    const categoryDiscounts = { FEED: 0, MEDICINE: 0, GROCERY: 0 };
    let totalSpecialDiscountForDate = 0;
    allSpecialDiscountsForDate.forEach(discount => {
        const category = invoiceToCategoryMap[discount.invoice];
        if (category && categoryDiscounts.hasOwnProperty(category)) {
            categoryDiscounts[category] += discount.amount;
        }
        totalSpecialDiscountForDate += discount.amount;
    });

    const netSalesForDate = (totalSalesDate._sum.discountedPrice ?? 0) - totalSpecialDiscountForDate;
    const expensesForDate = expensesDate._sum.amount ?? 0;
    const collectedForDate = collectedPaymentDate._sum.amount ?? 0;
    const availableCashForDate = (netSalesForDate + collectedForDate) - expensesForDate;

    // --- Process "Up-To-Date" Data ---
    const [totalExpenses, totalCollected, totalLoan, paidSaleInvoices, totalPaidSalesResult] = upToDateData;
    const paidInvoices = paidSaleInvoices.map(item => item.invoice);
    
    const paidSaleSpecialDiscount = await prisma.specialDiscount.aggregate({
      where: { invoice: { in: paidInvoices } }, 
      _sum: { amount: true }
    });

    const totalPaidSalesAmount = (totalPaidSalesResult._sum.discountedPrice ?? 0) - (paidSaleSpecialDiscount._sum.amount ?? 0);
    const totalExpensesAmount = totalExpenses._sum.amount ?? 0;
    const totalCollectedAmount = totalCollected._sum.amount ?? 0;
    // const totalCustomerLoanAmount = totalLoan._sum.amount ?? 0;
    const totalAvailableCash = (totalPaidSalesAmount + totalCollectedAmount) - totalExpensesAmount ;

    // --- Construct Final Response ---
    const findCategory = (cat) => salesByCategoryDate.find(c => c.category === cat)?._sum || {};
    
    // Calculate net amount for each category
    const feedNet = (findCategory("FEED").discountedPrice ?? 0) - (categoryDiscounts.FEED ?? 0);
    const medicineNet = (findCategory("MEDICINE").discountedPrice ?? 0) - (categoryDiscounts.MEDICINE ?? 0);
    const groceryNet = (findCategory("GROCERY").discountedPrice ?? 0) - (categoryDiscounts.GROCERY ?? 0);

    return NextResponse.json({
      status: "ok",
      data: {
        selectedDate: {
          availableCash: totalAvailableCash,
          totalSales: netSalesForDate,
          expenses: expensesForDate,
          collectedPayments: collectedForDate,
          sales: {
            feed: { amount: feedNet, quantity: findCategory("FEED").quantity ?? 0 },
            medicine: { amount: medicineNet, quantity: findCategory("MEDICINE").quantity ?? 0 },
            grocery: { amount: groceryNet, quantity: findCategory("GROCERY").quantity ?? 0 },
            totalSpecialDiscount: totalSpecialDiscountForDate,
          },
        },
        total: {
          availableCash: totalAvailableCash,
          expenses: totalExpensesAmount,
          collectedPayments: totalCollectedAmount,
          // customerLoan: totalCustomerLoanAmount,
        },
        dateRange: { gte, lte }
      }
    });

  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({
      status: "error",
      error: "An internal server error occurred."
    }, { status: 500 });
  }
}
