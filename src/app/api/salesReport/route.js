import { paymentStatus, PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// Utility function to calculate the total special discount for given invoices
async function getTotalSpecialDiscount(invoices) {
  // console.log(invoices)
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

// utility function partial of report get
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

    return parseFloat(partialAmount._sum.amount || 0); // Return 0 if no amount is found
  } catch (error) {
    console.error("Error fetching partial invoices:", error);
    throw new Error("Failed to fetch partial invoices");
  }
};

// get all sub-category by category
export async function GET(req, res) {
  try {
    // Add CORS headers
    const headers = {
      "Access-Control-Allow-Origin": "*", // Replace '*' with your frontend domain in production
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle OPTIONS preflight request
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    // get value from url
    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const current = url.searchParams.get("page");
    const pageSize = url.searchParams.get("pageSize");
    const page = current ? Number(current) : 1;
    const limit = pageSize ? Number(pageSize) : 10;

    // Ensure valid numbers
    if (isNaN(page) || page < 1) {
      console.warn(`Invalid page parameter: ${current}`);
      throw new Error("Page must be a valid positive integer.");
    }

    if (isNaN(limit) || limit < 1) {
      console.warn(`Invalid limit parameter: ${pageSize}`);
      throw new Error("Page size must be a valid positive integer.");
    }

    // ✅ Parse Compact Date (e.g., '241223' → '2024-12-23')
    const parseCompactDate = (compactDate) => {
      if (!compactDate || compactDate.length !== 6) return null;

      const year = 2000 + parseInt(compactDate.slice(0, 2), 10); // '24' → 2024
      const month = parseInt(compactDate.slice(2, 4), 10) - 1; // '12' → 11 (zero-based)
      const day = parseInt(compactDate.slice(4, 6), 10); // '28' → 28

      // Start of the day (00:00:00.000 UTC)
      const localDate = new Date(year, month, day); // Local date
      return new Date(
        Date.UTC(
          localDate.getFullYear(),
          localDate.getMonth(),
          localDate.getDate()
        )
      );
    };

    // Parse Dates
    const start = parseCompactDate(startDate);
    let end = parseCompactDate(endDate);

    if (end) {
      end = new Date(
        Date.UTC(
          end.getUTCFullYear(),
          end.getUTCMonth(),
          end.getUTCDate(),
          23,
          59,
          59,
          999
        )
      );
    }

    // Query sales data based on the date range
    const salesData = await prisma.sales.findMany({
      where: {
        created_at: {
          gte: start?.toISOString(), // Start of day in UTC
          lte: end?.toISOString(), // End of day in UTC
        },
      },
      select: {
        totalPrice: true,
        paymentStatus: true,
        discount: true,
        discountedPrice: true,
        created_at: true,
        customer_id: true,
        customers: {
          select: {
            id: true,
            name: true,
          },
        },
        invoice: true,
      },
    });

    let totalSale = 0;
    let totalDue = 0;
    let totalCash = 0;

    // paid invoices
    const paidInvoices = salesData
      .filter((item) => item.paymentStatus === "paid")
      .map((obj) => obj.invoice);
    const paidSpecialDiscountAmount = await getTotalSpecialDiscount(
      paidInvoices
    );

    // due invoices
    const dueInvoices = salesData
      .filter((item) => item.paymentStatus === "due")
      .map((obj) => obj.invoice);
    const dueSpecialDiscountAmount = await getTotalSpecialDiscount(dueInvoices);

    // partial payment status invoices and amount
    const partialInovices = salesData
      .filter((item) => item.paymentStatus === "partial")
      .map((obj) => obj.invoice);

    // partial cash and due amount
    const partialDueAmount = await byPartialInvoices(
      "dueList",
      partialInovices
    );
    const partialCashAmount = await byPartialInvoices(
      "collectPayment",
      partialInovices
    );

    // group data
    const groupData = await salesData.reduce(async (accPromise, sale) => {
      const acc = await accPromise; // Ensure accumulator handles async/await
      const customerId = sale.customer_id;
      const customerName = sale.customers?.name || "Unknown Customer";

      if (!acc[customerId]) {
        acc[customerId] = {
          customerId,
          customerName,
          totalSale: 0,
          totalCash: 0,
          totalDue: 0,
          totalCollection:0,
          discountApplied: false,
          partialPaymentProcessed: false,
        };
      }

     // Calculate collection for this customer (only once per customer)
    const totalCollectionPayment = await prisma.collectPayment.aggregate({
      where: {
        customer_id: customerId,
        created_at: {
          gte: start?.toISOString(),
          lte: end?.toISOString()
        },
        invoice:"null"
      },
      _sum: {
        amount: true
      }
    });
    acc[customerId].totalCollection = totalCollectionPayment._sum.amount || 0;

      // Customer invoices grouped by payment status
      const customerSales = salesData.filter(
        (item) => item.customer_id === customerId
      );
      const dueInvoices = customerSales
        .filter((item) => item.paymentStatus === "due")
        .map((obj) => obj.invoice);
      const cashInvoices = customerSales
        .filter((item) => item.paymentStatus === "paid")
        .map((obj) => obj.invoice);

      // Calculate special discounts for due and cash invoices
      const dueTotalSpecialDiscountAmount =
        dueInvoices.length > 0 ? await getTotalSpecialDiscount(dueInvoices) : 0; // Assign 0 if dueInvoices is empty

      const cashTotalSpecialDiscountAmount =
        cashInvoices.length > 0
          ? await getTotalSpecialDiscount(cashInvoices)
          : 0;

      // Update total sales, cash, and due
      acc[customerId].totalSale += sale.discountedPrice;
      
      if (sale.paymentStatus === "due") {
        acc[customerId].totalDue += sale.discountedPrice;
        totalDue += sale.discountedPrice;
      } else if (sale.paymentStatus === "paid") {
        // console.log("Sale discountedPrice:", sale.discountedPrice);
        acc[customerId].totalCash += sale.discountedPrice;
        totalCash += sale.discountedPrice;
      } else if (sale.paymentStatus === "partial") {
        // Ensure partial due and cash amounts are calculated correctly and only once
        // Avoid re-calculating these here
        if (!acc[customerId].partialPaymentProcessed) {
          acc[customerId].totalDue += partialDueAmount;
          totalDue += partialDueAmount;
          acc[customerId].totalCash += partialCashAmount;
          totalCash += partialCashAmount;
        }
        acc[customerId].partialPaymentProcessed = true;
      }

      // Apply special discounts to total due and total cash (only once per customer)
      if (!acc[customerId].discountApplied) {
        acc[customerId].totalDue -= dueTotalSpecialDiscountAmount;
        acc[customerId].totalCash -= cashTotalSpecialDiscountAmount;
        acc[customerId].discountApplied = true; // Mark discount as applied
      }

      return acc;
    }, Promise.resolve({}));

    const netCash = totalCash - paidSpecialDiscountAmount;
    const netDue = totalDue - dueSpecialDiscountAmount;

    // remove index to group data
    const customerSalesSummary = Object.values(groupData);

    // pagination
    const paginationSales = customerSalesSummary.slice(
      (page - 1) * limit,
      page * limit
    );

    const totalRecords = paginationSales?.length;
    const totalPages = Math.ceil(totalRecords / limit);

    return NextResponse.json({
      status: "ok",
      data: {
        totalSale,
        totalDue: netDue,
        totalCash: netCash,
        paginationSales: customerSalesSummary,
        pagination: {
          page,
          totalPages,
          // totalRecords,
        },
      },
    });
  } catch (error) {
    console.error("API error:", error.message);
    return NextResponse.json({
      status: 501,
      error: "Failed to get Sales-Report!",
    });
  }
}
