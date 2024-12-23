import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// get all products
export async function GET(req, res) {
  try {
    const products = await prisma.products.findMany();
    
    return NextResponse.json({ status: "ok", data: products });
  } catch (error) {
    console.log(error.message)
    return NextResponse.json({
      status: 500,
      error: "Failed to fetch products data",
    });
  }
}





// product add 
export async function POST(req, res) {
  const { name, category,subCategory, perPackte, totalpackte, quantity, unitPrice, note } = await req.json();

  try {
    const product = await prisma.products.create({
      data: {
        name: name,
        category: category || null,
        subCategory: subCategory || null,
        perPacket: perPackte ? parseFloat(perPackte) : null,// Corrected from `perPackte` to `perPacket`
        totalpacket: totalpackte ? parseFloat(totalpackte) : null, 
        quantity: parseInt(quantity),
        unitPrice: parseFloat(unitPrice),
        note: note || "null",
      },
    });
    console.log(product)
    return NextResponse.json({ status: "ok", data: product });
  } catch (error) {
    console.log(error.message);
    return NextResponse.json({ status: 500, error: "Failed to add product!" });
  }
}
