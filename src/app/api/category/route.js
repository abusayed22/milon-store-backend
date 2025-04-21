import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();



// get all sub-category by category
export async function GET (req,res) {
    try {
      const category =  await prisma.subCategory.findMany()
      return NextResponse.json({ status: "ok", data: category });
    } catch (error) {
      console.log("Sub-category fetch error :" + error.message);
      return NextResponse.json({ status: 501, error: "Faileds to get all categories!" });
    } 
}


// make sub-category by category
export async function POST(req, res) {
    const reqData = await req.json();
    try {
      const category =  await prisma.subCategory.create({
        data: reqData,
      });
      return NextResponse.json({ status: "ok", data: category });
    } catch (error) {
      return NextResponse.json({ status: 500, error: "Failed to category!" });
    }
  }