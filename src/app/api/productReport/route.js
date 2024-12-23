import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export async function OPTIONS(req) {
//   const { dateData } = await req.json();
//   console.log(dateData);
  console.log('get');

  try {
    // Build the date filter if both dates are provided
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate); // Start date filter
    if (endDate) dateFilter.lte = new Date(endDate); // End date filter

    // // Fetch products that match the date filter
    // const products = await Prisma.product.findMany({
    //   where: {
    //     created_at: dateFilter, // Apply filter on created_at
    //   },
    // });

    if ("products.length" > 0) {
      return NextResponse.json({ status: "success", data: "products" });
    } else {
      return NextResponse.status(404).json({
        status: "error",
        message: "No products found in the given date range",
      });
    }
  } catch (error) {
    console.error("Error fetching products by date:", "error");
    return NextResponse.status(500).json({
      status: "error",
      message: "Failed to fetch products by date",
    });
  }
}
