import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// get all collect payment
export async function GET(req, res) {
  try {
    const amount = await prisma.collectPayment.findMany({
      include: {
        customerName: {
          select:{
            name:true
          }
        }
      }
    });
    return NextResponse.json({ status: "ok", data: amount });
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
    });
    return NextResponse.json({ status: "ok", data: paymentHistory });
    // return paymentHistory
  } catch (error) {
    console.log("Error fetching customers:", error.message);
    return NextResponse.json({
      status: 500,
      error: "Failed to retrieve customers!",
    });
  }
}

// create collect payment
export async function POST(req, res) {
  const reqData = await req.json();
  
  const { customer_id, amount, note } = reqData;
  try {
    const collectPayment = await prisma.collectPayment.create({
      data: {
        customer_id: parseInt(customer_id),
        amount: parseFloat(amount),
        note: note || "",
      },
      include:{
        customerName:{
          select:{name:true}
        }
      }
    });
    return NextResponse.json({ status: "ok", data: collectPayment });
  } catch (error) {
    console.log(error.message);
    return NextResponse.json({ status: 500, error: "Failed to expense!" });
  }
}
