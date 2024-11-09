import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();


// get all customers
export async function GET(req, res) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const saleId = searchParams.get('saleId');
  try {
    // get customer info
      if(userId){
        const customers = await prisma.customers.findUnique({
          where: {id:Number(userId)}
        });
        return NextResponse.json({ status: "ok", data: customers });
      }

      // get this customer sales amount
      if(saleId){
        console.log("sale " + saleId)
        const saleAmount = await prisma.sales.aggregate({
          where:{customer_id:Number(saleId)},
          _sum: {
            salesPrice: true
          }
        })
        const totalSaleAmount = saleAmount._sum.salesPrice || 0;
        return NextResponse.json({ status: "ok", data: totalSaleAmount })
      }
      
    } catch (error) {
      console.log("Error fetching customers:", error.message);
      return NextResponse.json({ status: 500, error: "Failed to retrieve customers!" });
    }
  }

// get customer by id
export async function PUT(req, res) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userid = Number(userId)
    const dataObj = await req.json()
  try {
      const customers = await prisma.customers.update({
        where:{id:userid},
        data: dataObj
      })
      return NextResponse.json({ status: "ok", data: customers });
    } catch (error) {
      console.log("Error fetching customers:", error.message);
      return NextResponse.json({ status: 500, error: "Failed to retrieve customers!" });
    }
  }