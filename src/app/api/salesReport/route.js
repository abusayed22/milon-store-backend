import { paymentStatus, PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { DateTime } from "luxon";

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

// get all sub-category by category TODO: it's perfect without total collection
// export async function GET(req, res) {
//   try {
//     // Add CORS headers
//     const headers = {
//       "Access-Control-Allow-Origin": "*",
//       "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
//       "Access-Control-Allow-Headers": "Content-Type, Authorization",
//     };

//     // Handle OPTIONS preflight request
//     if (req.method === "OPTIONS") {
//       return new Response(null, { status: 204, headers });
//     }

//     const timeZone = "Asia/Dhaka";

//      const parseCompactDate = (dateString) => {
//       if (!dateString || dateString.length !== 6) return null;
//        return DateTime.fromFormat(dateString, "yyMMdd", { zone: timeZone });
//     };

//     // get value from url
//     const url = new URL(req.url);
//     const startDate = url.searchParams.get("startDate");
//     const endDate = url.searchParams.get("endDate");
//     const current = url.searchParams.get("page");
//     const pageSize = url.searchParams.get("pageSize");
//     const page = current ? Number(current) : 1;
//     const limit = pageSize ? Number(pageSize) : 10;

//     // Ensure valid numbers
//     if (isNaN(page) || page < 1) {
//       console.warn(`Invalid page parameter: ${current}`);
//       throw new Error("Page must be a valid positive integer.");
//     }

//     if (isNaN(limit) || limit < 1) {
//       console.warn(`Invalid limit parameter: ${pageSize}`);
//       throw new Error("Page size must be a valid positive integer.");
//     }

//         // Parse Dates
//     const startDt = parseCompactDate(startDate);
//     const endDt = parseCompactDate(endDate);

//     let start, end;
//     if (startDt && startDt.isValid && endDt && endDt.isValid) {
//       // Get the start of the Dhaka day and convert to a JS Date for Prisma
//       start = startDt.startOf("day").toJSDate();
//       // Get the end of the Dhaka day and convert to a JS Date for Prisma
//       end = endDt.endOf("day").toJSDate();
//     } else {
//       // Default to the current day in Dhaka if params are missing/invalid
//       const nowInDhaka = DateTime.now().setZone(timeZone);
//       start = nowInDhaka.startOf("day").toJSDate();
//       end = nowInDhaka.endOf("day").toJSDate();
//     }

//     // Query sales data based on the date range
//     const salesData = await prisma.sales.findMany({
//       where: {
//         created_at: {
//           gte: start,
//           lte: end,
//         },
//       },
//       select: {
//         totalPrice: true,
//         paymentStatus: true,
//         discount: true,
//         discountedPrice: true,
//         created_at: true,
//         customer_id: true,
//         customers: {
//           select: {
//             id: true,
//             name: true,
//           },
//         },
//         invoice: true,
//       },
//     });

//     let totalSale = 0;
//     let totalDue = 0;
//     let totalCash = 0;

//     // paid invoices
//     const paidInvoices = salesData
//       .filter((item) => item.paymentStatus === "paid")
//       .map((obj) => obj.invoice);
//     const paidSpecialDiscountAmount = await getTotalSpecialDiscount(
//       paidInvoices
//     );

//     // due invoices
//     const dueInvoices = salesData
//       .filter((item) => item.paymentStatus === "due")
//       .map((obj) => obj.invoice);
//     const dueSpecialDiscountAmount = await getTotalSpecialDiscount(dueInvoices);

//     // partial payment status invoices and amount
//     const partialInovices = salesData
//       .filter((item) => item.paymentStatus === "partial")
//       .map((obj) => obj.invoice);

//     // partial cash and due amount
//     const partialDueAmount = await byPartialInvoices(
//       "dueList",
//       partialInovices
//     );
//     const partialCashAmount = await byPartialInvoices(
//       "collectPayment",
//       partialInovices
//     );

//     // group data
//     const groupData = await salesData.reduce(async (accPromise, sale) => {
//       const acc = await accPromise; // Ensure accumulator handles async/await
//       const customerId = sale.customer_id;
//       const customerName = sale.customers?.name || "Unknown Customer";

//       if (!acc[customerId]) {
//         acc[customerId] = {
//           customerId,
//           customerName,
//           totalSale: 0,
//           totalCash: 0,
//           totalDue: 0,
//           totalCollection:0,
//           discountApplied: false,
//           partialPaymentProcessed: false,
//         };
//       }

//      // Calculate collection for this customer (only once per customer)
//     const totalCollectionPayment = await prisma.collectPayment.aggregate({
//       where: {
//         customer_id: customerId,
//         created_at: {
//           gte: start?.toISOString(),
//           lte: end?.toISOString()
//         },
//         invoice:"null"
//       },
//       _sum: {
//         amount: true
//       }
//     });
//     acc[customerId].totalCollection = totalCollectionPayment._sum.amount || 0;

//       // Customer invoices grouped by payment status
//       const customerSales = salesData.filter(
//         (item) => item.customer_id === customerId
//       );
//       const dueInvoices = customerSales
//         .filter((item) => item.paymentStatus === "due")
//         .map((obj) => obj.invoice);
//       const cashInvoices = customerSales
//         .filter((item) => item.paymentStatus === "paid")
//         .map((obj) => obj.invoice);

//       // Calculate special discounts for due and cash invoices
//       const dueTotalSpecialDiscountAmount =
//         dueInvoices.length > 0 ? await getTotalSpecialDiscount(dueInvoices) : 0; // Assign 0 if dueInvoices is empty

//       const cashTotalSpecialDiscountAmount =
//         cashInvoices.length > 0
//           ? await getTotalSpecialDiscount(cashInvoices)
//           : 0;

//       // Update total sales, cash, and due
//       acc[customerId].totalSale += sale.discountedPrice;

//       if (sale.paymentStatus === "due") {
//         acc[customerId].totalDue += sale.discountedPrice;
//         totalDue += sale.discountedPrice;
//       } else if (sale.paymentStatus === "paid") {
//         // console.log("Sale discountedPrice:", sale.discountedPrice);
//         acc[customerId].totalCash += sale.discountedPrice;
//         totalCash += sale.discountedPrice;
//       } else if (sale.paymentStatus === "partial") {
//         // Ensure partial due and cash amounts are calculated correctly and only once
//         // Avoid re-calculating these here
//         if (!acc[customerId].partialPaymentProcessed) {
//           acc[customerId].totalDue += partialDueAmount;
//           totalDue += partialDueAmount;
//           acc[customerId].totalCash += partialCashAmount;
//           totalCash += partialCashAmount;
//         }
//         acc[customerId].partialPaymentProcessed = true;
//       }

//       // Apply special discounts to total due and total cash (only once per customer)
//       if (!acc[customerId].discountApplied) {
//         acc[customerId].totalDue -= dueTotalSpecialDiscountAmount;
//         acc[customerId].totalCash -= cashTotalSpecialDiscountAmount;
//         acc[customerId].discountApplied = true; // Mark discount as applied
//       }

//       return acc;
//     }, Promise.resolve({}));

//     const netCash = totalCash - paidSpecialDiscountAmount;
//     const netDue = totalDue - dueSpecialDiscountAmount;

//     // remove index to group data
//     const customerSalesSummary = Object.values(groupData);

//     // pagination
//     const paginationSales = customerSalesSummary.slice(
//       (page - 1) * limit,
//       page * limit
//     );

//     const totalRecords = paginationSales?.length;
//     const totalPages = Math.ceil(totalRecords / limit);

//     return NextResponse.json({
//       status: "ok",
//       data: {
//         totalSale,
//         totalDue: netDue,
//         totalCash: netCash,
//         paginationSales: customerSalesSummary,
//         pagination: {
//           page,
//           totalPages,
//           // totalRecords,
//         },
//       },
//     });
//   } catch (error) {
//     console.error("API error:", error.message);
//     return NextResponse.json({
//       status: 501,
//       error: "Failed to get Sales-Report!",
//     });
//   }
// }

// TODO: it's old tatal sales not special discount
// export async function GET(req, res) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const page = searchParams.get("page");
//     const pageSize = searchParams.get("pageSize");
//     const pageInt = parseInt(page) || 1;
//     const pageSizeInt = parseInt(pageSize) || 10;
//     const timeZone = "Asia/Dhaka";
//     const nowInDhaka = DateTime.now().setZone(timeZone);
//     const startOfDayUTC = nowInDhaka.startOf("day").toUTC().toJSDate();
//     const endOfDayUTC = nowInDhaka.endOf("day").toUTC().toJSDate();

//     // Query sales data for the day
//     const salesData = await prisma.sales.findMany({
//       where: {
//         created_at: {
//           gte: startOfDayUTC,
//           lte: endOfDayUTC,
//         },
//       },
//       select: {
//         totalPrice: true,
//         paymentStatus: true,
//         discount: true,
//         discountedPrice: true,
//         created_at: true,
//         customer_id: true,
//         customers: {
//           select: {
//             id: true,
//             name: true,
//           },
//         },
//         invoice: true,
//       },
//     });

//     // --- Step 1: Group sales by customer and calculate GROSS totals ---
//     const groupData = salesData.reduce((acc, sale) => {
//         const customerId = sale.customer_id;
//         if (!acc[customerId]) {
//             acc[customerId] = {
//                 customerId,
//                 customerName: sale.customers?.name || "Unknown Customer",
//                 totalSale: 0,
//                 totalCash: 0,
//                 totalDue: 0,
//                 invoices: new Set(), // Use a Set to store unique invoices
//                 sales: [],
//             };
//         }
//         acc[customerId].totalSale += sale.discountedPrice;
//         acc[customerId].invoices.add(sale.invoice);
//         acc[customerId].sales.push(sale);
//         return acc;
//     }, {});

//     // --- Step 2: Calculate net totals and partial payments AFTER grouping ---
//     for (const customerId in groupData) {
//         const customer = groupData[customerId];
//         const customerInvoices = Array.from(customer.invoices);

//         // Correctly calculate the total special discount for this customer and subtract it once
//         const totalSpecialDiscount = await getTotalSpecialDiscount(customerInvoices);
//         customer.totalSale -= totalSpecialDiscount;

//         // Process cash, due, and partial payments
//         const paidInvoices = customer.sales.filter(s => s.paymentStatus === 'paid').map(s => s.invoice);
//         const dueInvoices = customer.sales.filter(s => s.paymentStatus === 'due').map(s => s.invoice);
//         const partialInvoices = customer.sales.filter(s => s.paymentStatus === 'partial').map(s => s.invoice);

//         const paidSpecialDiscount = await getTotalSpecialDiscount(paidInvoices);
//         const dueSpecialDiscount = await getTotalSpecialDiscount(dueInvoices);

//         const partialDue = await byPartialInvoices("dueList", partialInvoices);
//         const partialCash = await byPartialInvoices("collectPayment", partialInvoices);

//         const grossPaid = customer.sales.filter(s => s.paymentStatus === 'paid').reduce((sum, s) => sum + s.discountedPrice, 0);
//         const grossDue = customer.sales.filter(s => s.paymentStatus === 'due').reduce((sum, s) => sum + s.discountedPrice, 0);

//         customer.totalCash = (grossPaid - paidSpecialDiscount) + partialCash;
//         customer.totalDue = (grossDue - dueSpecialDiscount) + partialDue;
//     }

//     const customerSalesSummary = Object.values(groupData);

//     // --- Pagination ---
//     const totalRecords = customerSalesSummary.length;
//     const totalPages = Math.ceil(totalRecords / pageSizeInt);
//     const paginatedSales = customerSalesSummary.slice(
//       (pageInt - 1) * pageSizeInt,
//       pageInt * pageSizeInt
//     );

//     // --- Calculate overall day totals ---
//     const totalSale = customerSalesSummary.reduce((sum, cust) => sum + cust.totalSale, 0);
//     const totalCash = customerSalesSummary.reduce((sum, cust) => sum + cust.totalCash, 0);
//     const totalDue = customerSalesSummary.reduce((sum, cust) => sum + cust.totalDue, 0);

//     return NextResponse.json({
//       status: "ok",
//       data: paginatedSales,
//       todayTotals: {
//         todayTotalSalesPrice: totalSale,
//         todayTotalDueAmount: totalDue,
//         todayTotalCashAmount: totalCash,
//       },
//       pagination: {
//         currentPage: pageInt,
//         pageSize: pageSizeInt,
//         totalSales: totalRecords,
//         totalPage: totalPages,
//       },
//     });
//   } catch (error) {
//     console.error("API error:", error.message);
//     return NextResponse.json(
//       { status: 500, error: "Failed to get Sales-Report!" },
//       { status: 500 }
//     );
//   }
// }

// TODO: it's testing
export async function GET(req, res) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page");
    const pageSize = searchParams.get("pageSize");
    const pageInt = parseInt(page) || 1;
    const pageSizeInt = parseInt(pageSize) || 10;
    const timeZone = "Asia/Dhaka";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const parseCompactDate = (dateString) => {
      if (!dateString || dateString.length !== 6) return null;
      return DateTime.fromFormat(dateString, "yyMMdd", { zone: timeZone });
    };

    const startOfDayUTC = parseCompactDate(startDate);
    const endOfDayUTC = parseCompactDate(endDate);

    // Query sales and collections data for the day
    const [salesData, collectionsData] = await Promise.all([
      prisma.sales.findMany({
        where: {
          created_at: {
            gte: startOfDayUTC,
            lte: endOfDayUTC,
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
      }),
      prisma.collectPayment.findMany({
        where: {
          created_at: { gte: startOfDayUTC, lte: endOfDayUTC },
          invoice: "null", // Only advance/non-invoice payments
        },
        select: { customer_id: true, amount: true },
      }),
    ]);

    // Create a map of collections for quick lookup
    const collectionsMap = new Map();
    collectionsData.forEach((p) => {
      collectionsMap.set(
        p.customer_id,
        (collectionsMap.get(p.customer_id) || 0) + p.amount
      );
    });

    // --- Step 1: Group sales by customer and calculate GROSS totals ---
    const groupData = salesData.reduce((acc, sale) => {
      const customerId = sale.customer_id;
      if (!acc[customerId]) {
        acc[customerId] = {
          customerId,
          customerName: sale.customers?.name || "Unknown Customer",
          totalSale: 0,
          totalCash: 0,
          totalDue: 0,
          totalCollection: 0,
          invoices: new Set(), // Use a Set to store unique invoices
          sales: [],
        };
      }
      acc[customerId].totalSale += sale.discountedPrice;
      acc[customerId].invoices.add(sale.invoice);
      acc[customerId].sales.push(sale);
      return acc;
    }, {});

    // --- Step 2: Calculate net totals and partial payments concurrently ---
    await Promise.all(
      Object.values(groupData).map(async (customer) => {
        const customerInvoices = Array.from(customer.invoices);

        // Correctly calculate the total special discount for this customer and subtract it once
        const totalSpecialDiscount = await getTotalSpecialDiscount(
          customerInvoices
        );
        customer.totalSale -= totalSpecialDiscount;

        // Add total collections for the customer from the map
        customer.totalCollection = collectionsMap.get(customer.customerId) || 0;

        // Process cash, due, and partial payments
        const paidInvoices = customer.sales
          .filter((s) => s.paymentStatus === "paid")
          .map((s) => s.invoice);
        const dueInvoices = customer.sales
          .filter((s) => s.paymentStatus === "due")
          .map((s) => s.invoice);
        const partialInvoices = customer.sales
          .filter((s) => s.paymentStatus === "partial")
          .map((s) => s.invoice);

        const paidSpecialDiscount = await getTotalSpecialDiscount(paidInvoices);
        const dueSpecialDiscount = await getTotalSpecialDiscount(dueInvoices);

        const partialDue = await byPartialInvoices("dueList", partialInvoices);
        const partialCash = await byPartialInvoices(
          "collectPayment",
          partialInvoices
        );

        const grossPaid = customer.sales
          .filter((s) => s.paymentStatus === "paid")
          .reduce((sum, s) => sum + s.discountedPrice, 0);
        const grossDue = customer.sales
          .filter((s) => s.paymentStatus === "due")
          .reduce((sum, s) => sum + s.discountedPrice, 0);

        customer.totalCash = grossPaid - paidSpecialDiscount + partialCash;
        customer.totalDue = grossDue - dueSpecialDiscount + partialDue;
      })
    );

    const customerSalesSummary = Object.values(groupData);

    // --- Pagination ---
    const totalRecords = customerSalesSummary.length;
    const totalPages = Math.ceil(totalRecords / pageSizeInt);
    const paginatedSales = customerSalesSummary.slice(
      (pageInt - 1) * pageSizeInt,
      pageInt * pageSizeInt
    );

    // --- Calculate overall day totals ---
    const totalSale = customerSalesSummary.reduce(
      (sum, cust) => sum + cust.totalSale,
      0
    );
    const totalCash = customerSalesSummary.reduce(
      (sum, cust) => sum + cust.totalCash,
      0
    );
    const totalDue = customerSalesSummary.reduce(
      (sum, cust) => sum + cust.totalDue,
      0
    );
    const totalCollection = Array.from(collectionsMap.values()).reduce(
      (sum, amount) => sum + amount,
      0
    );

    // --- Construct Final Response to match frontend expectations ---
    return NextResponse.json({
      status: "ok",
      data: {
        paginationSales: paginatedSales,
        totalSale: totalSale,
        totalCash: totalCash,
        totalDue: totalDue,
        totalCollection: totalCollection,
        pagination: {
          currentPage: pageInt,
          pageSize: pageSizeInt,
          totalPages: totalPages,
          totalRecords: totalRecords,
        },
      },
    });
  } catch (error) {
    console.error("API error:", error.message);
    return NextResponse.json(
      { status: 500, error: "Failed to get Sales-Report!" },
      { status: 500 }
    );
  }
}
