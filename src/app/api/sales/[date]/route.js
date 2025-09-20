import { PrismaClient } from "@prisma/client";
import { DateTime } from "luxon";
import { NextResponse } from "next/server";
// You will need to import these helper functions from where you have defined them

const prisma = new PrismaClient();




// Utility function to calculate the total special discount for given invoices
async function getTotalSpecialDiscount(invoices) {
  const specialDiscountAmount = await prisma.specialDiscount.aggregate({
    where: {
      invoice: {
        in: invoices,
      },
    },
    _sum: {
      amount: true,
    },
  });
  return parseFloat(specialDiscountAmount._sum.amount || 0);
}
const byPartialInvoices = async (invoiceModel, invoices) => {
  if (!Array.isArray(invoices) || invoices.length === 0) {
    // throw new Error("Invoices must be a non-empty array");
  }

  try {
    const partialAmount = await prisma[invoiceModel].aggregate({
      where: {
        invoice: {
          in: invoices,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return parseFloat(partialAmount._sum.amount || 0);
  } catch (error) {
    console.error("Error fetching partial invoices:", error);
    throw new Error("Failed to fetch partial invoices");
  }
};

// This function handles GET requests to /api/sales/[date]?userId=...
export async function GET(req, { params }) {
  try {
    // --- 1. GET AND VALIDATE PARAMETERS ---
    const { date } = params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    // Added a log to see incoming request details for easier debugging
    console.log(`[API LOG] Received request for date: ${date}, userId: ${userId}`);

    if (!userId || isNaN(parseInt(userId))) {
      return NextResponse.json({ status: 400, error: "Valid userId is required." });
    }
    const customerId = parseInt(userId);

    // --- 2. CALCULATE THE DATE RANGE ---
    const timeZone = "Asia/Dhaka";
    const targetDate = DateTime.fromISO(date, { zone: timeZone });

    if (!targetDate.isValid) {
      return NextResponse.json({ status: 400, error: "Invalid date format. Please use YYYY-MM-DD." });
    }

    const gte = targetDate.startOf("day").toJSDate();
    const lte = targetDate.endOf("day").toJSDate();

    // --- 3. FETCH DATA EFFICIENTLY ---
    const salesData = await prisma.sales.findMany({
      where: { customer_id: customerId, created_at: { gte, lte } },
      orderBy: { created_at: "desc" },
    });

    if (salesData.length === 0) {
      return NextResponse.json({
        status: "ok",
        data: [],
        totals: { totalSales: 0, totalCash: 0, totalDue: 0, date: gte },
      });
    }

    // --- 4. CALCULATE TOTALS AND SPECIAL CONDITIONS (NOW MORE ROBUST) ---
    let totalDue = 0;
    let totalCash = 0;
    
    // **FIX:** Initialize helper function results to 0 to prevent errors
    let totalSpecialDiscount = 0;
    let partialDueAmount = 0;
    let partialCashAmount = 0;

    const customerInvoices = salesData.map((obj) => obj.invoice);
    const partialInvoices = salesData
      .filter((obj) => obj.paymentStatus === "partial")
      .map((obj) => obj.invoice);
    
    // **FIX:** Only call helper functions if there is data to process.
    // This prevents errors if the functions don't handle empty arrays.
    if (customerInvoices.length > 0) {
        totalSpecialDiscount = await getTotalSpecialDiscount(customerInvoices);
    }
    if (partialInvoices.length > 0) {
        partialDueAmount = await byPartialInvoices("dueList", partialInvoices);
        partialCashAmount = await byPartialInvoices("collectPayment", partialInvoices);
    }

    // Efficiently get the gross total sales from the database using aggregate
    const totalSalesAggregate = await prisma.sales.aggregate({
        _sum: { discountedPrice: true },
        where: { customer_id: customerId, created_at: { gte, lte } }
    });
    const grossTotalSales = totalSalesAggregate._sum.discountedPrice || 0;

    // Calculate cash and due amounts from the sales data
    salesData.forEach((sale) => {
      if (sale.paymentStatus === "paid") {
        totalCash += sale.discountedPrice || 0;
      } else if (sale.paymentStatus === "due") {
        totalDue += sale.discountedPrice || 0;
      }
    });

    // Add the externally calculated partial amounts
    totalCash += partialCashAmount || 0;
    totalDue += partialDueAmount || 0;
    
    // --- 5. RETURN THE FINAL RESPONSE ---
    return NextResponse.json({
      status: "ok",
      data: salesData,
      totals: {
        totalSales: grossTotalSales - totalSpecialDiscount,
        totalCash,
        totalDue,
        date: gte,
      },
    });

  } catch (error) {
    // **FIX:** Improved error logging to capture more details
    console.error("API Error in /api/sales/[date]:", {
        message: error.message,
        stack: error.stack,
    });
    return NextResponse.json({
      status: 500,
      error: "An internal server error occurred while fetching sales history.",
    });
  }
}