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

    // 1️⃣ Fetch Product History Data for Date Range
    const productHistory = await prisma.productHistory.findMany({
      where: {
        created_at: dateFilter,
      },
      include: {
        product: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    // Fetch Current Product Stock
    const currentStock = await prisma.products.findMany({
      where:{
        stock:true
      },
      select: {
        id: true,
        name: true,
        category: true,
        subCategory: true,
        quantity: true,
        totalpacket: true,
        unitPrice: true,
        stock: true,
      },
    });

    // calculate summary report
    const totalproductsSummary = currentStock.map((product) => {

      // Filter the history entries for this specific product
      const historyEntriesForProduct = productHistory.filter((history) => {
        return history.productId === product.id;
      });

      // Check if historyEntriesForProduct is empty
      // console.log("History Entries for Product:", historyEntriesForProduct); // Debug

      // Calculate the total packets added for this specific product
      const totalAddPacket = historyEntriesForProduct.reduce(
        (sum, entry) => {
          const totalpacketValue = entry.totalpacket;
      
          // Check if totalpacket is a valid number
          if (typeof totalpacketValue !== 'number' || isNaN(totalpacketValue)) {
            console.log('Invalid totalpacket value:', totalpacketValue); // Debug invalid value
            return sum; // Skip invalid values
          }
      
          console.log('Adding Total Packets:', totalpacketValue); // Debug valid values
          return sum + totalpacketValue;
        },
        0
      );

      // Optional: Calculate other values like total quantity, total stock, etc.
      const totalAddProductQty = historyEntriesForProduct.reduce(
        (sum, entry) => sum + (entry.quantity || 0),
        0
      );

      const totalStockPacket = product.totalpacket || 0;
      const totalStockQty = product.quantity || 0;

      const totalSalePacket = totalAddPacket - totalStockPacket;
      const totalSaleQty = totalAddProductQty - totalStockQty;

      const valueStock =
        (product.unitPrice || 0) *
        (product.quantity || product.totalpacket || 0);

      return {
        productName: product.name,
        category: product.category,
        subCategory: product.subCategory || "null",
        totalAddPacket,
        totalStockPacket,
        totalSalePacket,
        totalAddProductQty,
        totalStockQty,
        totalSaleQty,
        valueStock,
      };
    });

    // console.log(productSummary);

    const productSummary = totalproductsSummary.slice(
      (page-1) * limit,
      page * limit
    )

    const summaryRecords = totalproductsSummary.length
    const totalPage = Math.ceil((summaryRecords / limit));
    console.log(totalPage)

    
    return NextResponse.json({status: 'ok',data: productSummary,totalPage})
  } catch (error) {
    console.error("API error:", error.message);
    return NextResponse.json({
      status: 501,
      error: "Failed to get Sales-Report!",
    });
  }
}
