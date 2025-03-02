import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();


// get all collect payment
export async function GET(req, res) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page");
    const pageSize = searchParams.get("pageSize");
    const pageInt = parseInt(page);
    const pageSizeInt = parseInt(pageSize);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const amount = await prisma.collectPayment.findMany({
      where: {
        created_at: {
          gte: today,
        },
      },
      include: {
        customerName: {
          select: {
            name: true,
          },
        },
      },
      skip: (pageInt - 1) * pageSizeInt,
      take: pageSizeInt,
      orderBy: {
        created_at:'desc'
      }
    });

    const countCollect = await prisma.collectPayment.count({
      where: {
        created_at: {
          gte: today,
        },
      },
    });
    const totalPage = Math.ceil(countCollect / pageSizeInt);


    return NextResponse.json({
      status: "ok",
      data: amount,
      pagination: {
        currentPage: pageInt,
        pageSize: pageSizeInt,
        totalPage,
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


// get collect history by id
export async function PATCH(req, res) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const page = searchParams.get("page");
  const pageSize = searchParams.get("pageSize");
  const pageInt = parseInt(page)
  console.log(pageSize)
  const pageSizeInt = parseInt(pageSize)
  const userid = Number(userId);
  try {
    const paymentHistory = await prisma.collectPayment.findMany({
      where: { id: userid },
      include: {
        customerName: true,
      },
      orderBy: {
        created_at: "desc",
      },
      // skip:(pageInt -1) * pageSizeInt,
      // take: pageSizeInt
    });
    const collectPaymentCount = await prisma.collectPayment.count()
    const totalPage = Math.ceil(collectPaymentCount / pageSizeInt);

    return NextResponse.json({ status: "ok", data: paymentHistory,pagination: {
      currentPage: pageInt,
      pageSize: pageSizeInt,
      totalPage,
    }, });
    // return paymentHistory
  } catch (error) {
    console.log("Error fetchi customers:", error.message);
    return NextResponse.json({
      status: 500,
      error: "Failed to retrieve customers!",
    });
  }
}

// create collect payment without buying like advanced
export async function POST(req, res) {
  const reqData = await req.json();

  const { customer_id, amount, note } = reqData;
  try {
    // advanced payment like
    const collectPayment = await prisma.collectPayment.create({
      data: {
        customer_id: parseInt(customer_id),
        amount: parseFloat(amount),
        invoice: "null",
        note: note || "",
      },
      include: {
        customerName: {
          select: { name: true },
        },
      },
    });
    return NextResponse.json({ status: "ok", data: collectPayment });
  } catch (error) {
    console.log(error.message);
    return NextResponse.json({ status: 500, error: "Failed to expense!" });
  }
}
