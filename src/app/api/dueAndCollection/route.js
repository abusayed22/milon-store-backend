import { NextResponse } from "next/server";

const { PrismaClient } = require("@prisma/client");


const prisma = new PrismaClient();


export const GET = async(req) => {

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    try {
    
        // Convert `userId` to an integer (if necessary)
        const userIdInt = parseInt(userId);
    
        // Fetch data from `dueList` and `collectPayment` (example logic)
        const dueData = await prisma.dueList.aggregate({
          where: { customer_id: userIdInt },
          _sum: { amount: true },
        });
    
        const paymentData = await prisma.collectPayment.aggregate({
          where: { customer_id: userIdInt },
          _sum: { amount: true },
        });
    
        const totalDue = dueData._sum.amount || 0;
        const totalCollected = paymentData._sum.amount || 0;
        const remainingDue = totalDue - totalCollected;
    
        // Respond with the calculated data
        return NextResponse.json({status:200,data: {totalDue,totalCollected,remainingDue,}});
      } catch (error) {
        console.error("Error processing request:", error.message);
        return NextResponse.json({ status:400,message: "Internal server error" });
      }
}