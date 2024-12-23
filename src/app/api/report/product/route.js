import { Prisma, PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";



// get all products
export async function POST(req, res) {
  try {
    // Parse the JSON body
    const { startDate, endDate } = await req.json();
    console.log("hello");

    // Ensure the dates are valid
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid date format",
      });
    }

    // Fetch products based on date range (use your actual DB query here)
    const products = await prisma.products.findMany({
      where: {
        created_at: {
          gte: start,
          lte: end,
        },
      },
    });

    return res.status(200).json({
      status: "ok",
      data: products,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch products data",
    });
  }
}