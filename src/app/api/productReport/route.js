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

    // 1️⃣ Fetch Product History Data for Date Range
    const productHistory = await prisma.productHistory.findMany({
      where: {
        created_at: {
          gte: start?.toISOString(), // Start of day in UTC
          lte: end?.toISOString(), // End of day in UTC
        },
      },
      include: {
        product: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const currentStock = await prisma.products.findMany({
      where: {
        stock: true,
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
    const totalproductsSummary = await Promise.all(
      currentStock.map(async (product) => {
        // Filter the history entries for this specific product
        const historyEntriesForProduct = productHistory.filter((history) => {
          return history.productId === product.id;
        });

        // console.log(historyEntriesForProduct)
        // Fetch the product with product id for its sales calculation
        const saleProductQuntity = await prisma.sales.aggregate({
          where: {
            productId: parseInt(product.id),
            created_at: {
              gte: start?.toISOString(), // Start of day in UTC
              lte: end?.toISOString(), // End of day in UTC
            },
          },
          _sum: {
            quantity: true,
            totalpacket: true,
          },
        });
        const totalSalePacket = saleProductQuntity._sum.totalpacket || 0;
        const totalSaleQty = saleProductQuntity._sum.quantity || 0;

        const transferProductQuntity = await prisma.productTransferList.aggregate({
          where: {
            productId: parseInt(product.id),
            created_at: {
              gte: start?.toISOString(), // Start of day in UTC
              lte: end?.toISOString(), // End of day in UTC
            },
          },
          _sum: {
            quantity: true,
            totalpacket: true,
          },
        });
        const totalTransferPacket = transferProductQuntity._sum.totalpacket || 0;
        const totalTransferQty = transferProductQuntity._sum.quantity || 0;


        // total product stock by date
        const dateByStock = await prisma.products.aggregate({
          where: {
            id: parseInt(product.id),
            created_at: {
              gte: start?.toISOString(), // Start of day in UTC
              lte: end?.toISOString(), // End of day in UTC
            },
          },
          _sum: {
            quantity: true,
            totalpacket: true,
          },
        });
        const totalStockPacket = dateByStock._sum.totalpacket || 0;
        const totalStockQty = dateByStock._sum.quantity || 0;
      

        // Calculate the total packets added for this specific product
        const totalAddPacket = historyEntriesForProduct.reduce((sum, entry) => {
          const totalpacketValue = Number(entry.totalpacket);
          const totalQuantityValue = Number(entry.quantity);

          // Check feed and other
          if (product.category === "FEED") {
            if (
              typeof totalpacketValue !== "number" ||
              isNaN(totalpacketValue)
            ) {
              return sum;
            }
            return sum + totalpacketValue;
          } else {
            // Check if quantity is a valid number
            if (
              typeof totalQuantityValue !== "number" ||
              isNaN(totalQuantityValue)
            ) {
              return sum;
            }
            return sum + totalQuantityValue;
          }
        }, 0);


        // Optional: Calculate other values like total quantity, total stock, etc.
        const totalAddProductQty = historyEntriesForProduct.reduce(
          (sum, entry) => sum + (entry.quantity || 0),
          0
        );

        // let totalStockPacket;
        // if (product.category === "FEED") {
        //   totalStockPacket = product.totalpacket || 0;
        // } else {
        //   totalStockPacket = product.quantity || 0;
        // }

        // const totalStockQty = product.quantity || 0;

        // const valueStock =
        //   (product.unitPrice || 0) *
        //   (product.quantity || product.totalpacket || 0);

        return {
          productName: product.name,
          category: product.category,
          subCategory: product.subCategory || "null",
          totalAddPacket,
          totalStockPacket,
          totalStockQty,
          totalSalePacket,
          totalAddProductQty,
          totalSaleQty,
          // valueStock,
          totalTransferPacket,
          totalTransferQty
          // salePacket,
          // saleQty,
        };
      })
    );

    const productSummary = totalproductsSummary.slice(
      (page - 1) * limit,
      page * limit
    );

    const summaryRecords = totalproductsSummary.length;
    const totalPage = Math.ceil(summaryRecords / limit);

    return NextResponse.json({ status: "ok", data: productSummary, totalPage });
  } catch (error) {
    console.error("API error:", error.message);
    return NextResponse.json({
      status: 501,
      error: "Failed to get Sales-Report!",
    });
  }
}
