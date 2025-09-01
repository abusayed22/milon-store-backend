import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// get all sub-category by category
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const subCategory = searchParams.get("subCategory");


  // Construct the `where` condition dynamically, only including fields if they are provided
  const whereCondition = {
    stock:true,
    ...(category && { category }), // Include `category` only if it has a valid value
    ...(subCategory && { subCategory }), // Include `subCategory` only if it has a valid value
  };

  try {
    // Fetch products based on category and optionally subCategory
    const products = await prisma.products.findMany({
      where: whereCondition,
    });
  

    return NextResponse.json({ status: "ok", data: products });
  } catch (error) {
    console.error("Error fetching products:", error.message);
    return NextResponse.json({
      status: 500,
      error: "Failed to get all categories!",
    });
  }
}
