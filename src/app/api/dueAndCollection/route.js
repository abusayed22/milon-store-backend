import { NextResponse } from "next/server";

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

export const GET = async (req) => {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  try {
    // total due from due list
    const totalDue = await prisma.dueList.aggregate({
      where: {
        customer_id: parseInt(userId),
      },
      _sum: {
        amount: true,
      },
    });
    const totalCustomerDue = totalDue._sum.amount;

    // total due from due list
    const totalLoan = await prisma.customerLoan.aggregate({
      where: {
        customer_id: parseInt(userId),
      },
      _sum: {
        amount: true,
      },
    });
    const totalCustomerLoan = totalLoan._sum.amount || 0;

    const getFromCustomerAmount =
      parseFloat(totalCustomerDue) + parseFloat(totalCustomerLoan);

    // customer cash collect like advanced, not partial (if partial have invoice)
    const advancedCash = await prisma.collectPayment.aggregate({
      where: {
        customer_id: parseInt(userId),
        invoice: "null",
      },
      _sum: {
        amount: true,
      },
    });
    const totalAdvancedCash = advancedCash._sum.amount || 0;

    const netDue = Math.abs(
      parseFloat(totalAdvancedCash) - parseFloat(getFromCustomerAmount)
    );

    // Respond with the calculated data
    return NextResponse.json({ status: 200, data: netDue });
  } catch (error) {
    console.error("Error processing request:", error.message);
    return NextResponse.json({ status: 400, message: "Internal server error" });
  }
};
