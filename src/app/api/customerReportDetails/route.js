import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
const prisma = new PrismaClient();

// Helper function to convert compact date (YYMMDD) to Date object
const parseCompactDate = (compactDate) => {
  const year = `20${compactDate.slice(0, 2)}`; // Convert '25' to '2025'
  const month = compactDate.slice(2, 4); // Extract '01' for January
  const day = compactDate.slice(4, 6); // Extract '09' for the day

  // Return the formatted date as 'YYYY-MM-DD'
  return `${year}-${month}-${day}`;
};


// Utility function to calculate the total special discount for given invoices
async function getTotalSpecialDiscount(invoices) {
  const specialDiscountAmount = await prisma.specialDiscount.aggregate({
    where: {
      invoice: {
        in: invoices,
      },
    },
    _sum: {
      amount: true,
    },
  });
  return parseFloat(specialDiscountAmount._sum.amount || 0);
}

// partial invoices with status total amount
const byPartialInvoices = async (invoiceModel, invoices) => {
  if (!Array.isArray(invoices) || invoices.length === 0) {
    // throw new Error("Invoices must be a non-empty array");
  }

  try {
    const partialAmount = await prisma[invoiceModel].aggregate({
      where: {
        invoice: {
          in: invoices,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return parseFloat(partialAmount._sum.amount || 0); 
  } catch (error) {
    console.error("Error fetching partial invoices:", error);
    throw new Error("Failed to fetch partial invoices");
  }
};

//     --------------------------------------------------------------------------------------
// API handler function
export async function GET(req, res) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const page = parseInt(searchParams.get("page")) || 1; // Default to page 1
  const pageSize = parseInt(searchParams.get("pageSize")) || 10; // Default to 10 records per page
  const dateData = searchParams.get("dateDate"); // Get the compact date (e.g., '250109')

  try {
    // ✅ Parse Compact Date (e.g., '241223' → '2024-12-23')
    const parseCompactDate = (compactDate) => {
      if (!compactDate || compactDate.length !== 6) return null;

      // Extract year, month, and day
      const year = 2000 + parseInt(compactDate.slice(0, 2), 10); // '24' → 2024
      const month = parseInt(compactDate.slice(2, 4), 10) - 1; // '12' → 11 (zero-based)
      const day = parseInt(compactDate.slice(4, 6), 10); // '28' → 28

      // Create a Date in UTC directly
      const utcDate = new Date(Date.UTC(year, month, day));

      // Return the UTC Date object
      return utcDate;
    };

    const parsedDate = parseCompactDate(dateData); 

    // Query sales data based on the date range
    const salesData = await prisma.sales.findMany({
      where: {
        customer_id: parseInt(userId),
        created_at: {
          gte: parsedDate, 
          lt: new Date(parsedDate.getTime() + 24 * 60 * 60 * 1000), 
        },
      },
      include:{
        customers:true
      }
    });

    let totalSales = 0;
    let totalDue = 0;
    let totalCash = 0;
    let partialPaymentProcessed = false;

      // partial invoices
      const partialInovices = salesData.filter((obj) => obj.paymentStatus === "partial").map((obj) => obj.invoice);
      
      // customer invoices
      const customerInvoices = salesData.map((obj) => obj.invoice);

      // This customer total special Discount
      const totalSpecialDiscount = await getTotalSpecialDiscount(
        customerInvoices
      );
    
      // partial cash and due amount
      const partialDueAmount = await byPartialInvoices(
        "dueList",
        partialInovices
      );
      const partialCashAmount = await byPartialInvoices(
        "collectPayment",
        partialInovices
      );


      const data = salesData.forEach((s) => {
        totalSales += s.discountedPrice;

        if(s.paymentStatus === "due"){
          totalDue += s.discountedPrice
        } else if(s.paymentStatus==="paid"){
          totalCash+= s.discountedPrice
        }else if(s.paymentStatus==="partial"){
          if(!partialPaymentProcessed){
            totalDue += parseFloat(partialDueAmount)
            totalCash += parseFloat(partialCashAmount)
          }
          partialPaymentProcessed = true;
        }
      })

      // total page calculation
      const totalCount = await prisma.sales.count({
        where: {
          customer_id: parseInt(userId),
          created_at: {
            gte: parsedDate, 
            lt: new Date(parsedDate.getTime() + 24 * 60 * 60 * 1000), 
          },
        },
      });
      const totalPage = Math.ceil(totalCount / pageSize);
      
    

      return NextResponse.json({
        status: "ok",
        data: salesData,
        totals: {
          totalSales: totalSales - totalSpecialDiscount,
          totalCash,
          totalDue,
        },
        pagination: {
          currentPage: page,
          pageSize: pageSize,
          totalPage,
        },
    });
  } catch (error) {
    console.error("Error fetching sales data:", error);
    return NextResponse.json(
      {
        status: "error",
        error: "Failed to retrieve sales data",
      },
      { status: 500 }
    );
  }
}
