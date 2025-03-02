import { NextResponse } from "next/server";

const { PrismaClient } = require("@prisma/client");


const prisma = new PrismaClient();


export const GET = async(req) => {

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    try {
    
        // total due from due list 
    const totalDue = await prisma.dueList.aggregate({
      where: {
          customer_id: parseInt(userId)
      },
      _sum: {
          amount:true
      }
  });
  const totalCustomerDue = totalDue._sum.amount;


  // total due from due list 
  const totalLoan = await prisma.customerLoan.aggregate({
      where: {
          customer_id: parseInt(userId)
      },
      _sum: {
          amount:true
      }
  });
  const totalCustomerLoan = totalLoan._sum.amount || 0;

  const getFromCustomerAmount = (parseInt(totalCustomerDue) + parseInt(totalCustomerLoan));

    
        // Respond with the calculated data
        return NextResponse.json({status:200,data: getFromCustomerAmount});
      } catch (error) {
        console.error("Error processing request:", error.message);
        return NextResponse.json({ status:400,message: "Internal server error" });
      }
}