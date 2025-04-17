import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();


// get customer
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
        const saleAmount = await prisma.sales.aggregate({
          where:{customer_id:Number(saleId)},
          _sum: {
            discountedPrice: true
          }
        })

        // get customer total collectPayment amount
        const totalCustomerCollection = await prisma.collectPayment.aggregate({
          where:{customer_id:Number(saleId),invoice:"null"},
          _sum: {
            amount:true
          }
        });

        // get customer total due amount
        const totalCustomerDue = await prisma.dueList.aggregate({
          where:{customer_id:Number(saleId)},
          _sum: {
            amount:true
          }
        });

        const totalSaleAmount = saleAmount._sum.discountedPrice || 0;
        const remaingBalance = parseFloat(totalCustomerCollection._sum.amount) - parseFloat(totalCustomerDue._sum.amount);
        return NextResponse.json({ status: "ok", data: {totalSaleAmount,remaingBalance} })
      }
    } catch (error) {
      console.log("Error fetching Customer sale report:", error.message);
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