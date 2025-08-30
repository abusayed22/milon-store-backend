import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();




export async function GET(req, res) {
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
    const totalCustomerDue = parseFloat(totalDue._sum.amount)||0;

    // total collect for partial payment
    const collectPayment = await prisma.collectPayment.aggregate({
        where: {
            customer_id: parseInt(userId)
        },
        _sum: {
            amount:true
        }
    });
    const totalCollection = parseFloat(collectPayment._sum.amount);

    // total due from due list 
    const totalLoan = await prisma.customerLoan.aggregate({
        where: {
            customer_id: parseInt(userId)
        },
        _sum: {
            amount:true
        }
    });
    const totalCustomerLoan = parseFloat(totalLoan._sum.amount || 0);

    const getFromCustomerAmount = (totalCustomerDue + totalCustomerLoan);

    // customer cash collect like advanced, not partial (if partial have invoice)
    const advancedCash = await prisma.collectPayment.aggregate({
        where: {
            customer_id: parseInt(userId),
            invoice:"null",
        },
        _sum: {
            amount: true
        }
    });
    const totalAdvancedCash = parseFloat(advancedCash._sum.amount ||0);
    
    // make status
    if(parseFloat(totalAdvancedCash) > parseFloat(getFromCustomerAmount)) {
        return NextResponse.json({ status: "ok", data: {status: "Balance Remeang",amount:(parseInt(totalAdvancedCash) -  getFromCustomerAmount)} });
    } else{
        return NextResponse.json({ status: "ok", data: {status: "Due Balance",amount:(parseInt(totalAdvancedCash) -  getFromCustomerAmount)} });
    }
  } catch (error) {
    console.log(error.message);
    return NextResponse.json({
      status: 500,
      error: "Failed to get all categories!",
    });
  }
}