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
  return finalDueAmount;
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
  return finalPaidAmount;
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
      amount: Math.abs(balanceAmount), 
      isCredit: balanceAmount >= 0 // Boolean flag for easy checking
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

    
    // Date ways array TODO:
let formatedDataArray = await Promise.all(Object.entries(formatedData).map(async ([dateKey, salesArray]) => {
    
    // --- START DEBUGGING ---

    const totalDiscountedPrice = DiscountPrice(salesArray);
    const totalSpecialDiscount = await SpecialDiscount(salesArray);
    const finalSale = totalDiscountedPrice - totalSpecialDiscount;
    const dueDebug = await DueAmount(salesArray)

    // console.log(`--- Debugging Date: ${dateKey} ---`);
    // console.log(" Due :", dueDebug);
    // console.log("Total Price (after item discounts):", totalDiscountedPrice);
    // console.log("Special Discount for this day:", totalSpecialDiscount);
    // console.log("Final Net Sale:", finalSale);
    // console.log("------------------------------------");

    // --- END DEBUGGING ---

    return {
        date: dateKey,
        sale: finalSale, // Use the calculated value
        due: await DueAmount(salesArray),
        discountedPrice: totalDiscountedPrice, // Reuse the calculated value
        specialDiscount: totalSpecialDiscount, // Reuse the calculated value
        cash: await CashAmount(salesArray, dateKey),
        accountStatus: await AccountStatus(dateKey, userId) || { error: "No status returned" },
        loan: await dateWaysDynamic(dateKey, userId, "customerLoan"),
        collection: await dateWaysDynamic(dateKey, userId, "collectPayment", { invoice: "null" }),
    };
}));

    
    
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


// export async function GET(req) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const userId = parseInt(searchParams.get("userId"));
//     const page = parseInt(searchParams.get("page")) || 1;
//     const pageSize = parseInt(searchParams.get("pageSize")) || 10;

//     if (!userId) {
//       return NextResponse.json({ status: "error", error: "User ID is required." }, { status: 400 });
//     }

//     // --- Step 1: Get all unique transaction dates for the user to establish pagination ---
//     const allSaleDates = await prisma.sales.findMany({
//       where: { customer_id: userId },
//       select: { created_at: true },
//       orderBy: { created_at: 'desc' },
//       distinct: ['created_at'],
//     });
    
//     const uniqueDates = [...new Set(allSaleDates.map(s => s.created_at.toISOString().split('T')[0]))];

//     // --- Step 2: Paginate the unique dates ---
//     const totalRecords = uniqueDates.length;
//     const totalPages = Math.ceil(totalRecords / pageSize);
//     const paginatedDates = uniqueDates.slice((page - 1) * pageSize, page * pageSize);

//     if (paginatedDates.length === 0) {
//       return NextResponse.json({ status: "ok", data: [], pagination: { currentPage: page, pageSize, totalPages, totalRecords } });
//     }

//     // --- Step 3: Determine the date range for the current page ---
//     const pageStartDate = new Date(paginatedDates[paginatedDates.length - 1]);
//     pageStartDate.setUTCHours(0, 0, 0, 0);
//     const pageEndDate = new Date(paginatedDates[0]);
//     pageEndDate.setUTCHours(23, 59, 59, 999);

//     // --- Step 4: Fetch all necessary data for the user in efficient batches ---
//     const [
//       salesForPeriod,
//       // specialDiscountsForPeriod is removed from here to be fetched separately
//       dueListForPeriod,
//       paymentsForPeriod,
//       loansForPeriod,
//       openingBalanceData
//     ] = await Promise.all([
//       // Transactions within the page's date range
//       prisma.sales.findMany({ where: { customer_id: userId, created_at: { gte: pageStartDate, lte: pageEndDate } } }),
//       prisma.dueList.findMany({ where: { customer_id: userId, created_at: { gte: pageStartDate, lte: pageEndDate } } }),
//       prisma.collectPayment.findMany({ where: { customer_id: userId, created_at: { gte: pageStartDate, lte: pageEndDate } } }),
//       prisma.customerLoan.findMany({ where: { customer_id: userId, created_at: { gte: pageStartDate, lte: pageEndDate } } }),
//       // Data to calculate the opening balance (everything before the page's start date)
//       getOpeningBalance(userId, pageStartDate),
//     ]);

//     // --- FIX: Fetch special discounts based on the invoices from the sales we just fetched ---
//     const invoicesForPeriod = salesForPeriod.map(sale => sale.invoice);
//     const specialDiscountsForPeriod = await prisma.specialDiscount.findMany({
//       where: {
//         invoice: { in: invoicesForPeriod },
//         created_at: { gte: pageStartDate, lte: pageEndDate }
//       }
//     });

//     // --- Step 5: Process the data day-by-day for the paginated dates ---
//     let runningBalance = openingBalanceData.amount;
//     const reportData = paginatedDates.map(dateKey => {
//       const dayStart = new Date(dateKey);
//       dayStart.setUTCHours(0, 0, 0, 0);
//       const dayEnd = new Date(dateKey);
//       dayEnd.setUTCHours(23, 59, 59, 999);

//       // Filter the pre-fetched data for the current day
//       const salesToday = salesForPeriod.filter(s => s.created_at >= dayStart && s.created_at <= dayEnd);
//       const discountsToday = specialDiscountsForPeriod.filter(d => d.created_at >= dayStart && d.created_at <= dayEnd);
//       const duesToday = dueListForPeriod.filter(d => d.created_at >= dayStart && d.created_at <= dayEnd);
//       const paymentsToday = paymentsForPeriod.filter(p => p.created_at >= dayStart && p.created_at <= dayEnd);
//       const loansToday = loansForPeriod.filter(l => l.created_at >= dayStart && l.created_at <= dayEnd);

//       // Calculate daily totals
//       const totalSale = salesToday.reduce((sum, item) => sum + item.discountedPrice, 0);
//       const totalSpecialDiscount = discountsToday.reduce((sum, item) => sum + item.amount, 0);
//       const netSale = totalSale - totalSpecialDiscount;
      
//       const totalDue = duesToday.reduce((sum, item) => sum + item.amount, 0);
//       const totalCash = paymentsToday.reduce((sum, item) => sum + item.amount, 0);
//       const totalLoan = loansToday.reduce((sum, item) => sum + item.amount, 0);
      
//       // Update the running balance
//       runningBalance += (totalCash - (netSale + totalLoan));
      
//       return {
//         date: dateKey,
//         sale: netSale,
//         due: totalDue,
//         cash: totalCash,
//         loan: totalLoan,
//         accountStatus: {
//           status: runningBalance >= 0 ? "Balance Remaining" : "Due Balance",
//           amount: Math.abs(runningBalance),
//         },
//       };
//     });

//     return NextResponse.json({
//       status: "ok",
//       data: reportData,
//       pagination: { currentPage: page, pageSize, totalPages, totalRecords },
//     });

//   } catch (error) {
//     console.error("Error fetching customer report:", error);
//     return NextResponse.json({ status: "error", error: "Failed to retrieve report data" }, { status: 500 });
//   }
// }

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

