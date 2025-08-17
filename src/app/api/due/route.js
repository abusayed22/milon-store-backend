import { Prisma, PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient()



export async function GET(req) {
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("customerId");
  
    if (!userId) {
      console.log("user_id is required",)
      return NextResponse.json({
        status: 400,
        error: "user_id is required",
      });
    }
  
    try {
      // Fetch due list records filtered by user_id (customer_id)
      const dueList = await prisma.dueList.findMany({
        where: {
          customer_id: parseInt(userId),
        },
        // include: {
        //   customer: true, // Include related customer data if needed
        // },
      });
  
      // Return the filtered due list data
      return NextResponse.json({
        status: "ok",
        data: dueList,
      });
    } catch (error) {
      console.error("Failed to fetch due list:", error.message);
      return NextResponse.json({
        status: 500,
        error: "Failed to fetch due list",
      });
    }
  }