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

// create sales in Expense
export async function POST(req, res) {
  const { amount, note } = await req.json();
  console.log(note);

  try {
    const expense = await prisma.expneses.create({
      data: {
        amount: parseFloat(amount),
        note: note || "null",
        created_at:localDate()
      },
    });
    return NextResponse.json({ status: "ok", data: expense });
  } catch (error) {
    console.log(error.message);
    return NextResponse.json({ status: 500, error: "Failed to expense!" });
  }
}
