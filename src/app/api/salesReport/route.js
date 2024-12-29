import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

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
   const page = Number(current);
   const limit = Number(pageSize);

   // ✅ Parse Compact Date (e.g., '241223' → '2024-12-23')
   const parseCompactDate = (compactDate) => {
     if (!compactDate || compactDate.length !== 6) return null;
     const year = 2000 + parseInt(compactDate.slice(0, 2), 10); // '24' → 2024
     const month = parseInt(compactDate.slice(2, 4), 10) - 1; // '12' → 11 (zero-based)
     const day = parseInt(compactDate.slice(4, 6), 10); // '23' → 23

     return new Date(year, month, day);
   };

   // ✅ Parse Dates
   const start = parseCompactDate(startDate);
   const end = parseCompactDate(endDate);

   // Ensure end date includes the full day by setting time to 23:59:59.999
   if (end) end.setHours(23, 59, 59, 999);

   // ✅ Build Prisma Date Filter
   const dateFilter = {};
   if (start) dateFilter.gte = start;
   if (end) dateFilter.lte = end;
   

    // Query sales data based on the date range
    const salesData = await prisma.sales.findMany({
      where: {
        created_at: dateFilter,
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
      },
    });

    let totalSale = 0;
    let totalDue = 0;
    let totalCash = 0;

    console.log(salesData);

    // group data
    const groupData = salesData.reduce((acc, sale) => {
      const customerId = sale.customer_id;
      const customerName = sale.customers.name
        ? sale.customers.name
        : "Unknown Customer";

      if (!acc[customerId]) {
        acc[customerId] = {
          customerId,
          customerName,
          totalSale: 0,
          totalCash: 0,
          totalDue: 0,
        };
      }

      acc[customerId].totalSale += sale.discountedPrice;
      totalSale += sale.discountedPrice;
      if (sale.paymentStatus === "due") {
        acc[customerId].totalDue += sale.discountedPrice;
        totalDue += sale.discountedPrice;
      } else if (sale.paymentStatus === "paid") {
        acc[customerId].totalCash += sale.discountedPrice;
        totalCash += sale.discountedPrice;
      }
      return acc;
    }, {});

    // remove index to group data
    const customerSalesSummary = Object.values(groupData);

    // pagination
    const paginationSales = customerSalesSummary.slice(
      (page - 1) * limit,
      page * limit
    );

    const totalRecords = customerSalesSummary?.length; // Total number of grouped customers
    const totalPages = Math.ceil(totalRecords / limit);
  

    return NextResponse.json({
      status: "ok",
      data: {
        totalSale,
        totalDue,
        totalCash,
        customerSalesSummary,
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
