import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// get all pending Expense
export async function GET(req, res) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page");
    const pageSize = searchParams.get("pageSize");
    const pageInt = parseInt(page);
    const pageSizeInt = parseInt(pageSize);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // data fetching with pagination
    const expense = await prisma.expneses.findMany({
      where: {
        // created_at: {
        //   gte: today,
        // },
        status: "PENDING"
      },
      skip: (pageInt - 1) * pageSizeInt,
      take: pageSizeInt,
    });

    // // aggrigation for expense total amount
    // const todayTotal = await prisma.expneses.aggregate({
    //   where: {
    //     created_at: {
    //       gte: today,
    //     },
    //     status:"APPROVED"
    //   },
    //   _sum: {
    //     amount: true,
    //   },
    // });
    // const todayExpense = todayTotal._sum.amount;

    // Get the count of expenses for today
    const expenseCount = await prisma.expneses.count({
      where: {
        created_at: {
          gte: today,
        },
        status:'PENDING'
      },
    });

    // total page calculation
    const todayExpenseCount = Math.ceil(expenseCount / pageSizeInt)

    return NextResponse.json({
      status: "ok",
      data: expense,
      pagination: {
        currentPage: pageInt,
        pageSize: pageSizeInt,
        // totalExpense: todayExpense,
        totalPage: todayExpenseCount,
      },
    });
  } catch (error) {
    console.log(error.message);
    return NextResponse.json({
      status: 500,
      error: "Failed to get all categories!",
    });
  }
}