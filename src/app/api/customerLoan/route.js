import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// GET all customer loans with pagination and descending order
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    // Parse pagination parameters
    const page = parseInt(searchParams.get("page"));
    const pageSize = parseInt(searchParams.get("pageSize"));

    // Calculate skip and take for pagination
    const skip = (page - 1) * pageSize;

    // Group data by user name and calculate total loan amount
    const groupedLoans = await prisma.customerLoan.groupBy({
      by: ['customer_id'], // Group by customer_id
      _sum: {
        amount: true, // Calculate the sum of the loan amount
      },
      // _count: {
      //   id: true, // Count the number of loans per customer
      // },
      // skip, // For pagination
      // take: pageSize, // Limit results per page
    });
    

    // Fetch customer details and merge with grouped data
    const customerDetails = await Promise.all(
      groupedLoans.map(async (group) => {
        const customer = await prisma.customers.findUnique({
          where: {
            id: group.customer_id,
          },
          select: {
            name: true,
            phone: true,
            address: true,
          },
        });

        return {
          ...group,
          customer,
        };
      })
    );
    

    // Fetch the total count of grouped records for pagination
    const totalGroupedCount = await prisma.customerLoan.groupBy({
      by: ['customer_id'],
    });

    const totalPages = Math.ceil(totalGroupedCount.length / pageSize);

    // Return the response
    return NextResponse.json({
      status: "ok",
      data: customerDetails,
      pagination: {
        currentPage: page,
        pageSize,
        totalGroupedCount: totalGroupedCount.length,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching grouped customer loans:", error.message);
    return NextResponse.json({
      status: 500,
      error: "Failed to retrieve grouped customer loans.",
    });
  }
}


// Customer Loan Create
export async function POST (req,res) {
  try {
    const body = await req.json();
    const { customer_id, amount, note } = body;

  
  // Create a new loan record
  const newLoan = await prisma.customerLoan.create({
    data: {
      customer_id: parseInt(customer_id),
      amount: parseFloat(amount),
      note: note || "",
    },
    include: {
      customer: {
        select: {
          name: true,
        },
      },
    },
  });
  return NextResponse.json({
    status: "ok",
    data: newLoan,
  });
  } catch (error) {
    console.log(error.message);
    return NextResponse.json({ status: 500, error: "Failed to expense!" });
  }
}