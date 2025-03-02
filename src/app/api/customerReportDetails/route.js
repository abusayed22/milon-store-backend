import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
const prisma = new PrismaClient();

// Helper function to convert compact date (YYMMDD) to Date object
const parseCompactDate = (compactDate) => {
  const year = `20${compactDate.slice(0, 2)}`; // Convert '25' to '2025'
  const month = compactDate.slice(2, 4); // Extract '01' for January
  const day = compactDate.slice(4, 6); // Extract '09' for the day

  // Return the formatted date as 'YYYY-MM-DD'
  return `${year}-${month}-${day}`;
};

// Helper function for pagination
const paginateResults = (data, page, pageSize) => {
  const totalRecords = data.length;
  const totalPages = Math.ceil(totalRecords / pageSize);

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return {
    paginatedData: data.slice(startIndex, endIndex),
    totalRecords,
    totalPages,
  };
};

// API handler function
export async function GET(req, res) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const page = parseInt(searchParams.get("page")) || 1; // Default to page 1
  const pageSize = parseInt(searchParams.get("pageSize")) || 10; // Default to 10 records per page
  const dateData = searchParams.get("dateDate"); // Get the compact date (e.g., '250109')

  try {
    // ✅ Parse Compact Date (e.g., '241223' → '2024-12-23')
    const parseCompactDate = (compactDate) => {
      if (!compactDate || compactDate.length !== 6) return null;

      // Extract year, month, and day
      const year = 2000 + parseInt(compactDate.slice(0, 2), 10); // '24' → 2024
      const month = parseInt(compactDate.slice(2, 4), 10) - 1; // '12' → 11 (zero-based)
      const day = parseInt(compactDate.slice(4, 6), 10); // '28' → 28

      // Create a Date in UTC directly
      const utcDate = new Date(Date.UTC(year, month, day));

      // Return the UTC Date object
      return utcDate;
    };

    const parsedDate = parseCompactDate(dateData); // Parse the date

    // Query sales data based on the date range
    const data = await prisma.sales.findMany({
      where: {
        customer_id: parseInt(userId),
        created_at: {
          gte: parsedDate, // Start of day in UTC
          lt: new Date(parsedDate.getTime() + 24 * 60 * 60 * 1000), // To fetch data for the whole day
        },
      },
    });

    // Paginate the results
    const { paginatedData, totalRecords, totalPages } = paginateResults(
      data,
      page,
      pageSize
    );
   

    // Return the paginated response
    return NextResponse.json({
      status: "ok",
      data: paginatedData,
      pagination: {
        currentPage: page,
        pageSize,
        totalRecords,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching sales data:", error);
    return NextResponse.json(
      {
        status: "error",
        error: "Failed to retrieve sales data",
      },
      { status: 500 }
    );
  }
}
