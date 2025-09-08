import { localDate } from "@/lib/dateTime";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// get all Expense
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
        created_at: {
          gte: today,
        },
      },
      skip: (pageInt - 1) * pageSizeInt,
      take: pageSizeInt,
    });

    // aggrigation for expense total amount
    const todayTotal = await prisma.expneses.aggregate({
      where: {
        created_at: {
          gte: today,
        },
        status:"APPROVED"
      },
      _sum: {
        amount: true,
      },
    });
    const todayExpense = todayTotal._sum.amount;

    // Get the count of expenses for today
    const expenseCount = await prisma.expneses.count({
      where: {
        created_at: {
          gte: today,
        },
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
        totalExpense: todayExpense,
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


// get all Expense
export async function PATCH(req, res) {
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

    // aggrigation for expense total amount
    const todayTotal = await prisma.expneses.aggregate({
      where: {
        created_at: {
          gte: today,
        },
        status:"APPROVED"
      },
      _sum: {
        amount: true,
      },
    });
    const todayExpense = todayTotal._sum.amount;

    // Get the count of expenses for today
    const expenseCount = await prisma.expneses.count({
      where: {
        created_at: {
          gte: today,
        },
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
        totalExpense: todayExpense,
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

// create Expense
export async function POST(req, res) {
  const { amount, note } = await req.json();

  try {
    const expense = await prisma.expneses.create({
      data: {
        amount: parseFloat(amount),
        note: note || "null",
        // created_at:localDate()
      },
    });
    return NextResponse.json({ status: "ok", data: expense });
  } catch (error) {
    console.log(error.message);
    return NextResponse.json({ status: 500, error: "Failed to expense!" });
  }
}


export async function PUT(req) {
try {
    const reqObj = await req.json();
    const id = parseInt(reqObj.id);
    const status = reqObj.status;

    const updatedPayment = await prisma.expneses.update({
      where: {id},
      data:{status}
    })

    
    return NextResponse.json({
      status: 'ok',
      message: 'Payment approved successfully.',
      data: updatedPayment,
    });

  } catch (error) {
    console.error('Failed to approve payment:', error);
    return NextResponse.json(
      { error: 'Failed to approve payment.' },
      { status: 500 }
    );
  }
}
