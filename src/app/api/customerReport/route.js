// import prisma from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();


// ---------------------------------- handler section ------------------------------------

function DiscountPrice(saleData) {
  return saleData.reduce((sum, item) => {
    return sum + (item.discountedPrice || 0); // Ensure there's no undefined or null value
  }, 0);
}

async function getSpecialDiscount(invoices) {
  const uniqueInvoices = invoices 
    .filter((value, index, self) => self.indexOf(value) === index); 
  let conditondata = uniqueInvoices;
  if (Array.isArray(conditondata) && conditondata.length === 0) {
    return 0;
  }
  const result = await prisma.specialDiscount.aggregate({
    _sum: {
      amount: true, 
    },
    where: {
      invoice: {
        in: conditondata, 
      },
    },
  });
  return result._sum.amount;
}

async function SpecialDiscount(saleData, stype = false) {
  const uniqueInvoices = saleData
    .map(item => item.invoice)  
    .filter((value, index, self) => self.indexOf(value) === index); 
  let conditondata = uniqueInvoices;

  if (stype == true) {
    conditondata = saleData;
  }

  if (Array.isArray(conditondata) && conditondata.length === 0) {
    return 0;
  }

  const result = await prisma.specialDiscount.aggregate({
    _sum: {
      amount: true, 
    },
    where: {
      invoice: {
        in: conditondata, 
      },
    },
  });
  return result._sum.amount;
}


async function DueAmount(sales) {
  const result = sales.reduce((acc, item) => {
    if (item.paymentStatus === "due") {
      acc.dueAmount += item.discountedPrice
      acc.dueInvoice.push(item.invoice)
    } else if (item.paymentStatus === "partial") {
      acc.partialInvoice.push(item.invoice)
    }
    return acc;
  }, { dueAmount: 0, dueInvoice: [], partialInvoice: [] });

  const dueSpecialDisount = await getSpecialDiscount(result.dueInvoice);
  const dueAmount = result.dueAmount - dueSpecialDisount;

  // partial due amount 
  const partialDue = await prisma.dueList.aggregate({
    where: {
      invoice: {
        in: result.partialInvoice
      }
    },
    _sum: {
      amount: true
    }
  })
  const partialDueAmount = partialDue._sum.amount;
  const finalDueAmount = partialDueAmount + dueAmount;
  return finalDueAmount;
}

// cash amount calculation
async function CashAmount(sales) {
  const result = sales.reduce((acc, item) => {
    if (item.paymentStatus === "paid") {
      acc.paidAmount += item.discountedPrice
      acc.paidInvoice.push(item.invoice)
    } else if (item.paymentStatus === "partial") {
      acc.partialInvoice.push(item.invoice)
    }
    return acc;
  }, { paidAmount: 0, paidInvoice: [], partialInvoice: [] });

  const paidSpecialDisount = await getSpecialDiscount(result.paidInvoice);
  const paidAmount = result.paidAmount - paidSpecialDisount;

  // partial paid amount 
  const partialPaid = await prisma.collectPayment.aggregate({
    where: {
      invoice: {
        in: result.partialInvoice
      }
    },
    _sum: {
      amount: true
    }
  })
  const partialPaidAmount = partialPaid._sum.amount;
  const finalPaidAmount = partialPaidAmount + paidAmount;
  return finalPaidAmount;
}




// ---------------------------------- handler section ------------------------------------





// API handler function
export async function GET(req, res) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page");
    const pageSize = searchParams.get("pageSize");
    const userId = searchParams.get("userId");
    const pageInt = page ? parseInt(page) : 1;
    const pageSizeInt = pageSize ? parseInt(pageSize) : 10;


    const sales = await prisma.sales.findMany({
      where: {
        customer_id: parseInt(userId),
      },
      orderBy: {
        created_at: "desc",
      },
    });
    
    let formatedData = Array();
    for (const item of sales) {
      const dateKey = new Date(item.created_at).toISOString().split("T")[0]; // Extract date in YYYY-MM-DD format
      if (!formatedData[dateKey]) {
        formatedData[dateKey] = [];
      }
      formatedData[dateKey].push(item);
    }
  
    let formatedDataArray = await Promise.all(Object.entries(formatedData).map(async ([dateKey, salesArray]) => ({
      date: dateKey,
      sale: (DiscountPrice(salesArray) - await SpecialDiscount(salesArray)),
      due: await DueAmount(salesArray),
      discountedPrice: DiscountPrice(salesArray),
      specialDiscount: await SpecialDiscount(salesArray),
      cash: await CashAmount(salesArray),
    })));
    
    
    // Paginate the grouped data
    const { paginatedData, totalRecords, totalPages } = paginateGroupedData(
      formatedDataArray,
      pageInt,
      pageSizeInt
    );
    // console.log(paginatedData)
      return NextResponse.json({
        status: "ok",
        data: paginatedData,
        pagination: {
          currentPage: pageInt,
          pageSize: pageSizeInt,
          totalPages: totalPages,
          totalRecords: totalRecords,
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


// Helper function to paginate the grouped data
const paginateGroupedData = (formatedDataArray, page, pageSize) => {

  const totalRecords = formatedDataArray.length; // Get the total number of grouped entries (dates)

  const totalPages = Math.ceil(totalRecords / pageSize);

  // Get the subset of grouped data for the current page
  const paginatedGroupedData = formatedDataArray.slice(
    (page - 1) * pageSize, // Skip records for previous pages
    page * pageSize // Take records for the current page
  );

  return {
    paginatedData: paginatedGroupedData, // Paginated data (a slice of the full array)
    totalRecords,
    totalPages
  };
};