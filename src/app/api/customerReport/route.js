// import prisma from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();


// ---------------------------------- handler section ------------------------------------

function DiscountPrice(saleData) {
  return saleData.reduce((sum, item) => {
    return sum + parseFloat(item.discountedPrice || 0); // Ensure there's no undefined or null value
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
  return parseFloat(result._sum.amount) ||0;
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
  return parseFloat(result._sum.amount) ||0;
}


async function DueAmount(sales) {
  const result = sales.reduce((acc, item) => {
    if (item.paymentStatus === "due") {
      acc.dueAmount += parseFloat(item.discountedPrice)
      acc.dueInvoice.push(item.invoice)
    } else if (item.paymentStatus === "partial") {
      acc.partialInvoice.push(item.invoice)
    }
    return acc;
  }, { dueAmount: 0, dueInvoice: [], partialInvoice: [] });

  const dueSpecialDisount = await getSpecialDiscount(result.dueInvoice);
  const dueAmount = parseFloat(result.dueAmount) - parseFloat(dueSpecialDisount);

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
  const partialDueAmount = parseFloat(partialDue._sum.amount)||0;
  const finalDueAmount = partialDueAmount + dueAmount;
  return finalDueAmount.toFixed(2)||0;
}


async function CashAmount(sales,dateKey) {
  const result = sales.reduce((acc, item) => {
    if (item.paymentStatus === "paid") {
      acc.paidAmount += parseFloat(item.discountedPrice)
      acc.paidInvoice.push(item.invoice)
    } else if (item.paymentStatus === "partial") {
      acc.partialInvoice.push(item.invoice)
    }
    return acc;
  }, { paidAmount: 0, paidInvoice: [], partialInvoice: [] });

  const paidSpecialDisount = await getSpecialDiscount(result.paidInvoice);
  const paidAmount = parseFloat(result.paidAmount) - paidSpecialDisount;

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
  const partialPaidAmount = parseFloat(partialPaid._sum.amount) ||0;
  const finalPaidAmount = partialPaidAmount + paidAmount;
  // console.log(sales)
  //  console.log(`Date: ${dateKey}, Final Paid Amount: ${partialPaidAmount}`);
  return finalPaidAmount.toFixed(2) ||0;
}

// account status
async function AccountStatus(dateKey,userId) {
  const specificDate =new Date(dateKey);
  try {
    // total due from due list 
    const totalDue = await prisma.dueList.aggregate({
        where: {
          created_at:{
            // gte: new Date(specificDate.setHours(0, 0, 0, 0)),
            lt: new Date(specificDate.setHours(23, 59, 59, 999))
          },
            customer_id: parseInt(userId)
        },
        _sum: {
            amount:true
        }
    });
    const totalCustomerDue = parseFloat(totalDue._sum.amount ||0);
   
    // total Loan
    const totalLoan = await prisma.customerLoan.aggregate({
        where: {
          created_at:{
            // gte: new Date(specificDate.setHours(0, 0, 0, 0)),
            lt: new Date(specificDate.setHours(23, 59, 59, 999))
          },
            customer_id: parseInt(userId)
        },
        _sum: {
            amount:true
        }
    });
    const totalCustomerLoan = parseFloat(totalLoan._sum.amount || 0);

    const customerObligations = (totalCustomerDue) + totalCustomerLoan;
    // console.log(customerObligations)

    // customer cash collect like advanced, not partial (if partial have invoice)
    const advancedCash = await prisma.collectPayment.aggregate({
        where: {
          created_at:{
            // gte: new Date(specificDate.setHours(0, 0, 0, 0)),
            lt: new Date(specificDate.setHours(23, 59, 59, 999))
          },
            customer_id: parseInt(userId),
            invoice:"null",
        },
        _sum: {
            amount: true
        }
    });
    const totalAdvancedCash = parseFloat(advancedCash._sum.amount ||0);
    
    // ------ make status

    //  Calculate balance
    const balanceAmount = totalAdvancedCash - customerObligations;

    return {
      status: balanceAmount >= 0 ? "Balance Remaining" : "Due Balance",
      amount: (Math.abs(balanceAmount)).toFixed(2), 
      isCredit: balanceAmount >= 0 
    };
   
  } catch (error) {
    console.error("Error in AccountStatus:", error);
    return {
      status: "Error",
      amount: 0,
      isCredit: false,
      error: error.message
    };
  }
}

// date ways dynmic aggregation
async function dateWaysDynamic(dateKey, userId, model, conditions = {}, sumField = 'amount') {
  const specificDate = new Date(dateKey);
  const startDate = new Date(specificDate);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(specificDate);
  endDate.setHours(23, 59, 59, 999);

  try {
    const total = await prisma[model].aggregate({
      where: {
        created_at: {
          gte: startDate,
          lt: endDate
        },
        customer_id: parseInt(userId),
        ...conditions
      },
      _sum: {
        [sumField]: true
      }
    });

    return parseFloat(total._sum[sumField] || 0);
  } catch (error) {
    console.error(`Error in dateWaysDynamic (${model}):`, error);
    return 0; // Return 0 instead of object for consistency
  }
}


// ---------------------------------- handler section End ------------------------------------





// API handler function
// export async function GET(req, res) {
//   try {
    
//     const { searchParams } = new URL(req.url);
//     const page = searchParams.get("page");
//     const pageSize = searchParams.get("pageSize");
//     const userId = searchParams.get("userId");
//     const pageInt = page ? parseInt(page) : 1;
//     const pageSizeInt = pageSize ? parseInt(pageSize) : 10;

//      if (!userId) {
//       return NextResponse.json({ status: "error", error: "User ID is required." }, { status: 400 });
//     }


//     const sales = await prisma.sales.findMany({
//       where: {
//         customer_id: parseInt(userId),
//       },
//       orderBy: {
//         created_at: "desc",
//       },
//     });
    
//     let formatedData = Array();
//     for (const item of sales) {
//       const dateKey = new Date(item.created_at).toISOString().split("T")[0]; // Extract date in YYYY-MM-DD format
//       if (!formatedData[dateKey]) {
//         formatedData[dateKey] = [];
//       }
//       formatedData[dateKey].push(item);
//     }

    
//     // Date ways array TODO:
// let formatedDataArray = await Promise.all(Object.entries(formatedData).map(async ([dateKey, salesArray]) => {
    
//     // --- START DEBUGGING ---

//     const totalDiscountedPrice = DiscountPrice(salesArray);
//     const totalSpecialDiscount = await SpecialDiscount(salesArray);
//     const finalSale = totalDiscountedPrice - totalSpecialDiscount;
//     const dueDebug = await DueAmount(salesArray)

//     // console.log(`--- Debugging Date: ${dateKey} ---`);
//     // console.log(" Due :", dueDebug);
//     // console.log("Total Price (after item discounts):", totalDiscountedPrice);
//     // console.log("Special Discount for this day:", totalSpecialDiscount);
//     // console.log("Final Net Sale:", finalSale);
//     // console.log("------------------------------------");

//     // --- END DEBUGGING ---

//     return {
//         date: dateKey,
//         sale: finalSale, // Use the calculated value
//         due: await DueAmount(salesArray),
//         discountedPrice: totalDiscountedPrice, // Reuse the calculated value
//         specialDiscount: totalSpecialDiscount, // Reuse the calculated value
//         cash: await CashAmount(salesArray, dateKey),
//         accountStatus: await AccountStatus(dateKey, userId) || { error: "No status returned" },
//         loan: await dateWaysDynamic(dateKey, userId, "customerLoan"),
//         collection: await dateWaysDynamic(dateKey, userId, "collectPayment", { invoice: "null" }),
//     };
// }));

    
    
//     // Paginate the grouped data
//     const { paginatedData, totalRecords, totalPages } = paginateGroupedData(
//       formatedDataArray,
//       pageInt,
//       pageSizeInt
//     );
//     // console.log(paginatedData)
//       return NextResponse.json({
//         status: "ok",
//         data: paginatedData,
//         pagination: {
//           currentPage: pageInt,
//           pageSize: pageSizeInt,
//           totalPages: totalPages,
//           totalRecords: totalRecords,
//         },
//       });
//   } catch (error) {
//     console.error("Error fetching sales data:", error);
//     return NextResponse.json(
//       {
//         status: "error",
//         error: "Failed to retrieve sales data",
//       },
//       { status: 500 }
//     );
//   }
// }


// Helper function to paginate the grouped data
const paginateGroupedData = (formatedDataArray, page, pageSize) => {
  const totalRecords = formatedDataArray.length;
  const totalPages = Math.ceil(totalRecords / pageSize);

  // Get the subset of grouped data for the current page
  const paginatedGroupedData = formatedDataArray.slice(
    (page - 1) * pageSize, 
    page * pageSize
  );

  return {
    paginatedData: paginatedGroupedData, 
    totalRecords,
    totalPages
  };
};









// -------------------------------------------------------------------------------------


export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = parseInt(searchParams.get("userId"));
    const page = parseInt(searchParams.get("page")) || 1;
    const pageSize = parseInt(searchParams.get("pageSize")) || 10;

    if (!userId) {
      return NextResponse.json({ status: "error", error: "User ID is required." }, { status: 400 });
    }

    // --- Step 1: Fetch all transaction dates from all relevant tables ---
    const [saleDates, paymentDates, loanDates] = await Promise.all([
        prisma.sales.findMany({ where: { customer_id: userId }, select: { created_at: true } }),
        prisma.collectPayment.findMany({ where: { customer_id: userId }, select: { created_at: true } }),
        prisma.customerLoan.findMany({ where: { customer_id: userId }, select: { created_at: true } }),
    ]);

    const allDates = [
        ...saleDates.map(d => d.created_at.toISOString().split('T')[0]),
        ...paymentDates.map(d => d.created_at.toISOString().split('T')[0]),
        ...loanDates.map(d => d.created_at.toISOString().split('T')[0]),
    ];

    // Get unique dates and sort them in descending order
    const uniqueDates = [...new Set(allDates)].sort((a, b) => new Date(b) - new Date(a));

    // --- Step 2: Fetch all transactions for the user ---
    // This is more efficient than fetching inside the loop
    const allSales = await prisma.sales.findMany({
        where: { customer_id: userId },
        orderBy: { created_at: "desc" },
    });

    // --- Step 3: Group transactions by date ---
    const transactionsByDate = {}; // sales
    allSales.forEach(item => {
        const dateKey = item.created_at.toISOString().split('T')[0];
        if (!transactionsByDate[dateKey]) transactionsByDate[dateKey] = [];
        transactionsByDate[dateKey].push(item);
    });

    // --- Step 4: Map over unique dates and calculate daily summaries ---
    let reportData = await Promise.all(uniqueDates.map(async (dateKey) => {
        const salesArray = transactionsByDate[dateKey] || []; // Get sales for the day, or an empty array if none
        
        const totalDiscountedPrice = DiscountPrice(salesArray);
        const totalSpecialDiscount = await SpecialDiscount(salesArray);
        const finalSale = totalDiscountedPrice - totalSpecialDiscount;

        return {
            date: dateKey,
            sale: finalSale,
            due: await DueAmount(salesArray),
            cash: await CashAmount(salesArray),
            accountStatus: await AccountStatus(dateKey, userId),
            loan: await dateWaysDynamic(dateKey, userId, "customerLoan"),
            collection: await dateWaysDynamic(dateKey, userId, "collectPayment", { invoice: "null" }),
        };
    }));

    // --- Step 5: Paginate the final report data ---
    const totalRecords = reportData.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const paginatedData = reportData.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({
      status: "ok",
      data: paginatedData,
      pagination: { currentPage: page, pageSize, totalPages, totalRecords },
    });

  } catch (error) {
    console.error("Error fetching customer report:", error);
    return NextResponse.json({ status: "error", error: "Failed to retrieve report data" }, { status: 500 });
  }
}




// Helper function to calculate the opening balance before a given date
async function getOpeningBalance(userId, startDate) {
  const [totalDue, totalLoan, totalPaid] = await prisma.$transaction([
    prisma.dueList.aggregate({ where: { customer_id: userId, created_at: { lt: startDate } }, _sum: { amount: true } }),
    prisma.customerLoan.aggregate({ where: { customer_id: userId, created_at: { lt: startDate } }, _sum: { amount: true } }),
    prisma.collectPayment.aggregate({ where: { customer_id: userId, created_at: { lt: startDate } }, _sum: { amount: true } }),
  ]);

  const obligations = (totalDue._sum.amount ?? 0) + (totalLoan._sum.amount ?? 0);
  const credits = totalPaid._sum.amount ?? 0;
  const balance = credits - obligations;

  return { amount: balance };
}

