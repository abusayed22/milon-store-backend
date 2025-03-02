


import { Prisma, PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient()



export async function GET(req) {
    
    const { searchParams } = new URL(req.url);
    const proId = searchParams.get("id");
  
    if (!proId) {
      console.log("product_id is required",)
      return NextResponse.json({
        status: 400,
        error: "product_id is required",
      });
    }
  
    try {
      // Fetch due list records filtered by user_id (customer_id)
      const singleProduct = await prisma.products.findMany({
        where: {
          id: parseInt(proId),
        },
        // include: {
        //   customer: true, // Include related customer data if needed
        // },
      });
  
      // Return the filtered single product data
      return NextResponse.json({
        status: "ok",
        data: singleProduct,
      });
    } catch (error) {
      console.error("Failed to fetch due list:", error.message);
      return NextResponse.json({
        status: 500,
        error: "Failed to fetch due list",
      });
    }
  }



//   edit update 
export async function POST(req, res) {
  try {
    const reqData = await req.json(); // Parse the incoming request JSON data

    const id =  reqData.id;
    const price =  reqData.unitPrice;
    console.log(price)

    const updatedPrice = await prisma.products.update({
        where: {
            id: parseInt(id)
        },
        data: {
            unitPrice: parseInt(price)
        }
    })   
    return NextResponse.json({status: 'ok',data:updatedPrice}) 
  } catch (error) {
    console.log("Error creating customer:", error.message);
    return NextResponse.json({
      status: 500,
      error: "Failed to create customer!",
    });
  }
}