import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { withRoleAuthorization } from "@/lib/authMiddleware";

const prisma = new PrismaClient();


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
    const [dateFilteredData, upToDateData] = await Promise.all([
      // 1. Get all data for the selected date range
      prisma.$transaction([
        prisma.sales.findMany({
          where: dateFilter,
          select: { invoice: true, category: true, paymentStatus: true },
        }),
        prisma.sales.groupBy({
          by: ["category"],
          where: dateFilter,
          _sum: { discountedPrice: true, quantity: true },
        }),
        prisma.expneses.aggregate({
          where: { created_at: { gte, lte },status: "APPROVED" },
          _sum: { amount: true },
        }),
        prisma.collectPayment.aggregate({
          where: {
            created_at: { gte, lte },
            invoice: "null",
          },
          _sum: { amount: true },
        }),
        prisma.sales.aggregate({
          where: dateFilter,
          _sum: { discountedPrice: true },
        }),
        prisma.sales.aggregate({
          where: { ...dateFilter, paymentStatus: "paid" },
          _sum: { discountedPrice: true },
        }),
      ]),
      // 2. Get all-time totals up to the selected date
      prisma.$transaction([
        prisma.expneses.aggregate({
        where: { created_at: { lte },status: "APPROVED" },
          _sum: { amount: true },
        }),
        prisma.collectPayment.aggregate({
          where: upToDateFilter,
          _sum: { amount: true },
        }),
        prisma.customerLoan.aggregate({
          where: upToDateFilter,
          _sum: { amount: true },
        }),
        prisma.sales.findMany({
          where: { ...upToDateFilter, paymentStatus: "paid" },
          select: { invoice: true },
        }),
        prisma.sales.aggregate({
          where: { ...upToDateFilter, paymentStatus: "paid" },
          _sum: { discountedPrice: true },
        }),
      ]),
    ]);

    // --- Process Date-Filtered Data ---
    const [
      salesWithInvoicesForDate,
      salesByCategoryDate,
      expensesDate,
      collectedPaymentDate,
      totalSalesDate,
      paidSalesDate,
    ] = dateFilteredData;
    //  TODO:

    // Create a map to link invoices to their categories
    const invoiceToCategoryMap = salesWithInvoicesForDate.reduce(
      (map, sale) => {
        if (sale.invoice && sale.category) {
          map[sale.invoice] = sale.category;
        }
        return map;
      },
      {}
    );
    const invoiceNumbersForDate = Object.keys(invoiceToCategoryMap);

    // Get all special discounts for the day's invoices
    const allSpecialDiscountsForDate = await prisma.specialDiscount.findMany({
      where: { invoice: { in: invoiceNumbersForDate } },
    });

    // --- 1. Filter the sales from that day to find only the ones marked as 'paid' ---
    const paidSalesForDate = salesWithInvoicesForDate.filter(
      (sale) => sale.paymentStatus === "paid"
    );

    //  Get the invoice numbers from ONLY the paid sales ---
    const paidInvoiceNumbersForDate = paidSalesForDate.map((s) => s.invoice);

    //  Now, use this filtered list in your special discount query ---
    const paidSaleSpecialDiscounts = await prisma.specialDiscount.findMany({
      where: { invoice: { in: paidInvoiceNumbersForDate } },
    });

    // You can now use 'paidSaleSpecialDiscounts' to calculate the total
    const totalPaidSpecialDiscount = paidSaleSpecialDiscounts.reduce(
      (sum, discount) => sum + discount.amount,
      0
    );

    //  Isolate invoices that were 'partial' date
    const partialInvoicesToday = salesWithInvoicesForDate
      .filter((sale) => sale.paymentStatus === "partial")
      .map((sale) => sale.invoice);

    // 2. Sum only the payments collected against those partial invoices today
    const partialCashCollectedToday = await prisma.collectPayment.aggregate({
      where: {
        ...dateFilter, // Ensure the payment was made today
        invoice: { in: partialInvoicesToday },
      },
      _sum: { amount: true },
    });

    // Calculate the total discount and the discount per category
    const categoryDiscounts = { FEED: 0, MEDICINE: 0, GROCERY: 0 };
    let totalSpecialDiscountForDate = 0;
    allSpecialDiscountsForDate.forEach((discount) => {
      const category = invoiceToCategoryMap[discount.invoice];
      if (category && categoryDiscounts.hasOwnProperty(category)) {
        categoryDiscounts[category] += discount.amount;
      }
      totalSpecialDiscountForDate += discount.amount;
    });
    // console.log("test ", totalPaidSpecialDiscount);

    const netSalesForDate =
      (totalSalesDate._sum.discountedPrice ?? 0) - totalSpecialDiscountForDate;
    const expensesForDate = expensesDate._sum.amount ?? 0;
    const partialPaymentsAmount = partialCashCollectedToday._sum.amount ?? 0;
    const collectedForDate = collectedPaymentDate._sum.amount ?? 0;
    const availableCashForDate =
      netSalesForDate + collectedForDate - expensesForDate;

    // --- NEW CALCULATION FOR TOTAL CASH SALE ---
    const paidSalesAmount = paidSalesDate._sum.discountedPrice ?? 0;
    const totalCashSale =
      paidSalesAmount + partialPaymentsAmount - totalPaidSpecialDiscount;

    // --- Process "Up-To-Date" Data ---
    const [
      totalExpenses,
      totalCollected,
      totalLoan,
      paidSaleInvoices,
      totalPaidSalesResult,
    ] = upToDateData;
    const paidInvoices = paidSaleInvoices.map((item) => item.invoice);

    const paidSaleSpecialDiscount = await prisma.specialDiscount.aggregate({
      where: { invoice: { in: paidInvoices } },
      _sum: { amount: true },
    });
    // console.log("paid sale discount ",totalSpecialDiscountForDate )

    // Total up to date calculation
    const totalPaidSalesAmount =
      (totalPaidSalesResult._sum.discountedPrice ?? 0) -
      (paidSaleSpecialDiscount._sum.amount ?? 0);
    // console.log(totalPaidSalesAmount)
    const totalExpensesAmount = totalExpenses._sum.amount ?? 0;
    // console.log("uptodate expense : ",totalExpensesAmount)
    const totalCollectedAmount = totalCollected._sum.amount ?? 0;
    // const totalCustomerLoanAmount = totalLoan._sum.amount ?? 0;
    const upToDateAvailableCash =
      totalPaidSalesAmount + totalCollectedAmount - totalExpensesAmount;

    // --- Construct Final Response ---
    const findCategory = (cat) =>
      salesByCategoryDate.find((c) => c.category === cat)?._sum || {};

    // Calculate net amount for each category
    const feedNet =
      (findCategory("FEED").discountedPrice ?? 0) -
      (categoryDiscounts.FEED ?? 0);
    const medicineNet =
      (findCategory("MEDICINE").discountedPrice ?? 0) -
      (categoryDiscounts.MEDICINE ?? 0);
    const groceryNet =
      (findCategory("GROCERY").discountedPrice ?? 0) -
      (categoryDiscounts.GROCERY ?? 0);
    // console.log("medicine Discount ",categoryDiscounts.MEDICINE)
    // console.log("medicine ",findCategory("MEDICINE").discountedPrice)

    return NextResponse.json({
      status: "ok",
      data: {
        selectedDate: {
          availableCash: upToDateAvailableCash.toFixed(2),
          totalSales: netSalesForDate.toFixed(2),
          totalCashSale: totalCashSale.toFixed(2), //TODO:
          expenses: expensesForDate.toFixed(2),
          collectedPayments: collectedForDate.toFixed(2),
          sales: {
            feed: {
              amount: feedNet,
              quantity: findCategory("FEED").quantity ?? 0,
            },
            medicine: {
              amount: medicineNet,
              quantity: findCategory("MEDICINE").quantity ?? 0,
            },
            grocery: {
              amount: groceryNet,
              quantity: findCategory("GROCERY").quantity ?? 0,
            },
            totalSpecialDiscount: totalSpecialDiscountForDate,
          },
        },
        // total: {
        //   availableCash: totalAvailableCash,
        //   expenses: totalExpensesAmount,
        //   collectedPayments: totalCollectedAmount,
        //   // customerLoan: totalCustomerLoanAmount,
        // },
        dateRange: { gte, lte },
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      {
        status: "error",
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}



// export const GET = withRoleAuthorization(["ADMIN","MANAGER","SALESPERSON"])(getDashboardDataHandler)





