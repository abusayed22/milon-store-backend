import { PrismaClient } from "@prisma/client";
import { DateTime } from "luxon";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// get all sub-category by category
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

    // fetch expense from the database with pagination
    const loanQuery = {
      where: {
        created_at: {
          gte,
          lte,
        },
        // status: 'APPROVED'
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    };
    const loans = await prisma.customerLoan.findMany(loanQuery);

    // Count total expenses for pagination
    const totalLoans = await prisma.customerLoan.count({
      where: {
        created_at: {
          gte,
          lte,
        },
      },
    });

    const totalPage = Math.ceil(totalLoans / limit);

    return NextResponse.json({
      status: "ok",
      data: loans,
      totalPage,
      totalLoans,
    });
  } catch (error) {
    console.error("API error:", error.message);
    return NextResponse.json({
      status: 501,
      error: "Failed to get Loans-Report!",
    });
  }
}
