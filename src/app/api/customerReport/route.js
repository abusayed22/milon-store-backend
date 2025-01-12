// import prisma from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// get sales report customer profile

// Helper function to aggregate data by date
const aggregateDataForDate = async (model, dateKey, amountField) => {
  try {
    const data = await prisma[model].aggregate({
      where: {
        created_at: {
          gte: new Date(dateKey), // Start of the day
          lte: new Date(
            new Date(dateKey).setDate(new Date(dateKey).getDate() + 1)
          ), // End of the day
        },
      },
      _sum: {
        [amountField]: true,
      },
    });
    return data._sum[amountField] || 0;
  } catch (error) {
    console.error(`Error fetching data for ${model} on ${dateKey}:`, error);
    return 0;
  }
};

// Function to group sales data and fetch aggregated data
const groupByDateData = async (sales) => {
  const result = {};

  // Group sales by date and calculate totalCash
  sales.forEach((item) => {
    const dateKey = new Date(item.created_at).toISOString().split("T")[0]; // Extract date in YYYY-MM-DD format

    if (!result[dateKey]) {
      result[dateKey] = {
        totalCollection: 0,
        totalDue: 0,
        totalCash: 0,
      };
    }
    result[dateKey].totalCash += item.discountedPrice;

    return result;
  });

  // Fetch aggregated data for each date (totalCollection and totalDue)
  const uniqueDates = Object.keys(result); // Get all unique dates
  for (const dateKey of uniqueDates) {
    // Aggregate totalCollection and totalDue
    const totalCollection = await aggregateDataForDate(
      "collectPayment",
      dateKey,
      "amount"
    );
    const totalDue = await aggregateDataForDate("dueList", dateKey, "amount");

    // Aggregate the special discount for each date
    const totalSpecialDiscount = await aggregateDataForDate(
      "specialDiscount",
      dateKey,
      "amount"
    );

    // Adjust totalCash by subtracting the totalSpecialDiscount from the total sales cash (totalCash)
    result[dateKey].totalCollection = totalCollection;
    result[dateKey].totalDue = totalDue;
    result[dateKey].totalCash -= totalSpecialDiscount; // Subtract special discount from totalCash
  }

  return result;
};



// Helper function to paginate the grouped data
const paginateGroupedData = (groupedData, page, pageSize) => {
    const groupedEntries = Object.entries(groupedData); // Convert the object to an array of entries
    const totalRecords = groupedEntries.length; // Get the total number of grouped entries (dates)
  
    // Calculate the total number of pages
    const totalPages = Math.ceil(totalRecords / pageSize);
  
    // Get the subset of grouped data for the current page
    const paginatedGroupedData = groupedEntries.slice(
      (page - 1) * pageSize, // Skip records for previous pages
      page * pageSize // Take records for the current page
    );
  
    // Convert the paginated grouped data back to an object
    const paginatedData = Object.fromEntries(paginatedGroupedData);
  
    return { paginatedData, totalRecords, totalPages };
  };




// API handler function
export async function GET(req, res) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const page = parseInt(searchParams.get("page")) || 1; // Default to page 1 if no page is provided
  const pageSize = parseInt(searchParams.get("pageSize")) || 10;

  try {
    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Fetch sales data for the given userId
    const sales = await prisma.sales.findMany({
      where: {
        customer_id: parseInt(userId),
      },
      orderBy: {
        created_at: "desc",
      },
    });

    // Group sales and fetch aggregated data
    const groupedData = await groupByDateData(sales);

    // Paginate the grouped data
    const { paginatedData, totalRecords, totalPages } = paginateGroupedData(
        groupedData,
        page,
        pageSize
      );


    return NextResponse.json({
      status: "ok",
      data: paginatedData,
      pagination: {
        currentPage: page,
        pageSize: pageSize,
        totalPages: totalPages,
        totalRecords: totalRecords,
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
