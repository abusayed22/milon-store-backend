import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();


// get all Expense
export async function GET (req,res) {
    try {
      const expense =  await prisma.expneses.findMany()
      return NextResponse.json({ status: "ok", data: expense });
    } catch (error) {
      console.log(error.message);
      return NextResponse.json({ status: 500, error: "Failed to get all categories!" });
    } 
}


// create sales in Expense 
export async function POST(req, res) {
    const {amount,note} = await req.json();
    
    try {
      const expense =  await prisma.expneses.create({
        data: {
          amount: parseFloat(amount),
          note: note || null
        }
      });
      return NextResponse.json({ status: "ok", data: expense });
    } catch (error) {
      console.log(error.message)
      return NextResponse.json({ status: 500, error: "Failed to expense!" });
    }
  }