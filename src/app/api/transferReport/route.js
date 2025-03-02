import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(req, res) {
  try {

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
    const productHistory = await prisma.productTransferList.findMany({
      where: {
        created_at: {
          gte: start?.toISOString(), // Start of day in UTC
          lte: end?.toISOString(), // End of day in UTC
        },
      },
      orderBy: {
        created_at: "desc",
      },
      skip: (page - 1) * limit,
      take:limit
    });

    const productHistoryCount = await prisma.productTransferList.findMany({
        where:{
            created_at: {
                gte: start?.toISOString(), // Start of day in UTC
                lte: end?.toISOString(), // End of day in UTC
              },
        }
    })

    const totalPage = Math.ceil(productHistoryCount.length / limit);
    
    return NextResponse.json({ status: "ok", data: productHistory, totalPage });
  } catch (error) {
    console.error("API error:", error.message);
    return NextResponse.json({
      status: 501,
      error: "Failed to get Sales-Report!",
    });
  }
}


