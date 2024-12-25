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

    const parseCompactDate = (compactDate) => {
      // console.log("Parsing compact date:", compactDate);
      const year = parseInt(compactDate.slice(0, 2), 10) + 2000;
      const month = parseInt(compactDate.slice(2, 4), 10) - 1;
      const day = parseInt(compactDate.slice(4, 6), 10);
      return new Date(year, month, day);
    };

    const dateFilter = {};
    if (startDate) dateFilter.gte = parseCompactDate(startDate);
    if (endDate) dateFilter.lte = parseCompactDate(endDate);

    // Query products create within the date range
    const products = await prisma.products.findMany({
      where: {
        created_at: dateFilter,
      },
      select:{
        name:true,
        quantity:true,
        category:true,
        created_at:true,
        totalpacket:true,
        perPacket:true,
        subCategory:true,
      },
      // orderBy:'desc'
    });
    console.log(products);

    // Aggregating the data
    const aggregatedProducts = products.reduce((acc, product) => {
      const productKey = `${product.name}-${product.category}`;

      if (!acc[productKey]) {
        acc[productKey] = {
          productName: product.name,
          category: product.category,
          totalQty: 0,
          dateRange: { start: startDate, end: endDate },
        };
      }

      const quantity = product.category === 'feed' ? product.totalpacket : product.quantity;
      acc[productKey].totalQty += quantity;

      return acc;
    }, {});

    // Convert the aggregated data into an array
    const reportData = Object.values(aggregatedProducts);

    // Log or return the data
    console.log(reportData);

    return NextResponse.json({ status: "ok", data: products });
  } catch (error) {
    console.error("API error:", error.message);
    return NextResponse.json({
      status: 501,
      error: "Failed to get Sales-Report!",
    });
  }
}
