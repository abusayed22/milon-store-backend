import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// get all customers with pagination
export async function GET(req, res) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page");
    const pageSize = searchParams.get("pageSize");
    const pageInt = parseInt(page);
    const pageSizeInt = parseInt(pageSize);
    

    // Use Prisma to retrieve all customers
    const customers = await prisma.customers.findMany({
      skip: (pageInt - 1) * pageSizeInt,
      take: pageSizeInt,
      orderBy:{
        created_at:"desc"
      }
    });
    const totalCustomerCount = await prisma.customers.count();
    const totalPage = Math.ceil(totalCustomerCount / pageSizeInt);
    // console.log(pageSizeInt)

    return NextResponse.json({
      status: "ok",
      data: customers,
      pagination: {
        currentPage: pageInt,
        pageSize: pageSizeInt,
        totalCustomer: totalCustomerCount,
        totalPage,
      },
    });
  } catch (error) {
    console.log("Error get customers:", error.message);
    return NextResponse.json({
      status: 500,
      error: "Failed to retrieve customers!",
    });
  }
}

// patch all customers
export async function PATCH(req, res) {
  try {
    // Use Prisma to retrieve all customers
    const customers = await prisma.customers.findMany({
      orderBy:{
        created_at:'desc'
      }
    });

    return NextResponse.json({ status: "ok", data: customers });
  } catch (error) {
    console.log("Error fetching customers:", error.message);
    return NextResponse.json({
      status: 500,
      error: "Failed to retrieve customers!",
    });
  }
}

// create customer
export async function POST(req, res) {
  try {
    const reqData = await req.json(); // Parse the incoming request JSON data

    // const customer_phone =  reqData.phone;

    const existingCustomerPhone = await prisma.customers.count({
      where: {
        phone: reqData.phone,
      },
    });
    if (existingCustomerPhone > 0) {
      console.log(
        "Customer with this phone number already exists:" + reqData.phone
      );
      return NextResponse.json({
        status: "faild",
        error: "Customer with this phone number already exists:",
      });
    } else {
      // Use Prisma to create a new customer with the provided data
      const newCustomer = await prisma.customers.create({
        data: {
          name: reqData.name,
          phone: reqData.phone,
          address: reqData.address,
          note: reqData.note || "empty",
        },
      });

      return NextResponse.json({ status: "ok", data: newCustomer });
    }
  } catch (error) {
    console.log("Error creating customer:", error.message);
    return NextResponse.json({
      status: 500,
      error: "Failed to create customer!",
    });
  }
}
