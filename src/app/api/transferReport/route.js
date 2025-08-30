import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { DateTime } from "luxon";


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

    const timeZone = "Asia/Dhaka";
    let gte, lte;

    // --- ROBUST DATE PARSING ---
    const parseDate = (dateString) => {
      if (!dateString || dateString.length !== 6) return null;
      // Use fromFormat to explicitly tell Luxon the expected format is "yyMMdd"
      return DateTime.fromFormat(dateString, "yyMMdd", { zone: timeZone });
    };

    const startDt = parseDate(startDate);
    const endDt = parseDate(endDate);

    if (startDt && startDt.isValid && endDt && endDt.isValid) {
      gte = startDt.startOf("day").toJSDate();
      lte = endDt.endOf("day").toJSDate();
    } else {
      // Default to the current day if params are missing or invalid
      const nowInDhaka = DateTime.now().setZone(timeZone);
      gte = nowInDhaka.startOf("day").toJSDate();
      lte = nowInDhaka.endOf("day").toJSDate();
    }

    // 1️⃣ Fetch Product History Data for Date Range
    const productHistory = await prisma.productTransferList.findMany({
      where: {
        created_at: {
          gte, // Start of day in UTC
          lte, // End of day in UTC
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
                gte, // Start of day in UTC
                lte, // End of day in UTC
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


