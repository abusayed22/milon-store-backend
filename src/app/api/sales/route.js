import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { DateTime } from "@prisma/client";

const prisma = new PrismaClient();

// -------------- Utils -----------------

// Utility function to calculate the total special discount for given invoices
async function getTotalSpecialDiscount(invoices) {
  // console.log(invoices)
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
  return specialDiscountAmount._sum.amount || 0;
}
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

    return partialAmount._sum.amount || 0; // Return 0 if no amount is found
  } catch (error) {
    console.error("Error fetching partial invoices:", error);
    throw new Error("Failed to fetch partial invoices");
  }
};

// -------------- Utils -----------------

// get all Sales List by category
export async function GET(req, res) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page");
    const pageSize = searchParams.get("pageSize");
    const pageInt = parseInt(page);
    const pageSizeInt = parseInt(pageSize);

    if (pageInt <= 0 || pageSizeInt <= 0) {
      return NextResponse.json({
        status: 400,
        error: " Invalid Pagination parametters",
      });
    }

   // Get the current date in UTC
const now = new Date(2025, 0, 17);

// Set the start of the day (00:00:00 UTC)
const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));

// Set the end of the day (23:59:59 UTC)
const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));

// Convert to ISO strings for comparison with Prisma (Optional, but it's often a good practice)
const startOfDayISO = startOfDay.toISOString();
const endOfDayISO = endOfDay.toISOString();
    // console.log(test)

    // ----------today total calculation ----------

    // ----------- today total calculation with group by customer & Pagination TODO: ------
    const salesData = await prisma.sales.findMany({
      where: {
        // created_at: {
        //   gte: today, // Only today's sales
        // },
        created_at: {
          gte:startOfDayISO, // Start of day in UTC
          lte: endOfDayISO, // End of day in UTC
        },
      },
      select: {
        customer_id: true,
        discountedPrice: true,
        paymentStatus: true,
        created_at:true,
        customers: {
          select: {
            name: true,
          },
        },
        invoice: true,
      },
    });
  

    // Query to get total sales, total due, and total cash for today
    const totalSalesCalculation = await prisma.sales.aggregate({
      _sum: {
        discountedPrice: true, // Sum all discounted prices for sales
      },
      where: {
        created_at: {
          gte:startOfDayISO, // Start of day in UTC
          lte: endOfDayISO, // End of day in UTC
        },
      },
    });
    

    // Calculate today totals for sales, due, and cash
    let todayTotalSalesPrice = totalSalesCalculation._sum.discountedPrice || 0;
    let todayTotalDueAmount = 0;
    let todayTotalCashAmount = 0;
   

    // paid invoices
    const paidInvoices = salesData
      .filter((item) => item.paymentStatus === "paid")
      .map((obj) => obj.invoice);
    const paidSpecialDiscountAmount = await getTotalSpecialDiscount(
      paidInvoices
    );

    // due invoices
    const dueInvoices = salesData
      .filter((item) => item.paymentStatus === "due")
      .map((obj) => obj.invoice);
    const dueSpecialDiscountAmount = await getTotalSpecialDiscount(dueInvoices);

    // partial payment status invoices and amount
    const partialInovices = salesData.filter((item) => item.paymentStatus === "partial").map((obj) => obj.invoice);
console.log(partialInovices)
// console.log(salesData)
   
    // partial cash and due amount
    const partialDueAmount = await byPartialInvoices("dueList",partialInovices);
    const partialCashAmount = await byPartialInvoices("collectPayment",partialInovices);
    console.log("due",partialDueAmount)
    console.log("cash",partialCashAmount)
  
    const customerInvoices = salesData.map((obj) => obj.invoice);
    // console.log(customerInvoices)
    const specialDiscount = await prisma.specialDiscount.aggregate({
      where: {
        invoice: {
          in: customerInvoices,
        },
      },
      _sum: {
        amount: true,
      },
    });
    // console.log(specialDiscount._sum.amount)

    // Count the total number of sales for pagination
    const totalSalesCount = await prisma.sales.count({
      where: {
        created_at: {
          gte:startOfDayISO, // Start of day in UTC
          lte: endOfDayISO, // End of day in UTC
        },
      },
    });

    const groupData = await salesData.reduce(async (accPromise, sale) => {
      const acc = await accPromise; // Ensure accumulator handles async/await
      const customerId = sale.customer_id;
      const customerName = sale.customers?.name || "Unknown Customer";

      if (!acc[customerId]) {
        acc[customerId] = {
          customerId,
          customerName,
          totalSale: 0,
          totalCash: 0,
          totalDue: 0,
          discountApplied: false, // initiate for prvent double counting
          partialPaymentProcessed: false, // initiate for prvent double counting
        };
      }

      // Customer invoices grouped by payment status
      const customerSales = salesData.filter((item) => item.customer_id === customerId);
      const dueInvoices = customerSales.filter((item) => item.paymentStatus === "due").map((obj) => obj.invoice);
      const cashInvoices = customerSales.filter((item) => item.paymentStatus === "paid").map((obj) => obj.invoice);

      // Calculate special discounts for due and cash invoices
      const dueTotalSpecialDiscountAmount = dueInvoices.length > 0 ? await getTotalSpecialDiscount(dueInvoices) : 0; // Assign 0 if dueInvoices is empty
      const cashTotalSpecialDiscountAmount =cashInvoices.length > 0 ? await getTotalSpecialDiscount(cashInvoices): 0; // Assign 0 if cashInvoices is empty

    
      // Update total sales, cash, and due
      acc[customerId].totalSale += sale.discountedPrice;
      if (sale.paymentStatus === "due") {
        console.log("due",sale.discountedPrice)
        acc[customerId].totalDue += sale.discountedPrice;
        todayTotalDueAmount += sale.discountedPrice;
      } else if (sale.paymentStatus === "paid") {
        console.log("cash",sale.discountedPrice)
        // console.log(sale.discountedPrice)
        // console.log("Sale discountedPrice:", sale.discountedPrice);
        acc[customerId].totalCash += sale.discountedPrice;
        todayTotalCashAmount += sale.discountedPrice;
      } else if (sale.paymentStatus === "partial") {
        // Ensure partial due and cash amounts are calculated correctly and only once
        // Avoid re-calculating these here
        // console.log("Partial payment amounts:", { partialDueAmount, partialCashAmount });
        if (!acc[customerId].partialPaymentProcessed) {
          acc[customerId].totalDue += partialDueAmount ||0;
          todayTotalDueAmount += partialDueAmount ||0;
          acc[customerId].totalCash += partialCashAmount ||0;
          todayTotalCashAmount += partialCashAmount ||0;
        }
        acc[customerId].partialPaymentProcessed = true;
      }

      // Apply special discounts to total due and total cash (only once per customer)
      if (!acc[customerId].discountApplied) {
        acc[customerId].totalDue -= dueTotalSpecialDiscountAmount ||0;
        acc[customerId].totalCash -= cashTotalSpecialDiscountAmount ||0;
        acc[customerId].discountApplied = true; // Mark discount as applied
      }
      
      return acc;
    }, Promise.resolve({}));

    // console.log("cash",todayTotalCashAmount)
    // TODO: total calculation pore korbo

    const todaySales = Object.values(groupData);
  

    const paginatedSales = todaySales.slice(
      (pageInt - 1) * pageSizeInt,
      pageInt * pageSizeInt
    );
    const totalRecords = todaySales.length; // Total number of grouped customers
    const totalPages = Math.ceil(totalRecords / pageSizeInt);

    // console.log(todayTotalCashAmount)
    // console.log(specialDiscount._sum.amount)
    // total cash - special Discount
    const netTotalCash = todayTotalCashAmount - specialDiscount._sum.amount;


    return NextResponse.json({
      status: "ok",
      data: paginatedSales,
      todayTotals: {
        todayTotalSalesPrice,
        todayTotalDueAmount,
        todayTotalCashAmount: netTotalCash,
        today:startOfDayISO,
      },
      pagination: {
        currentPage: pageInt,
        pageSize: pageSizeInt,
        totalSales: totalSalesCount,
        totalPage: totalPages,
      },
    });
  } catch (error) {
    console.log(error.message);
    return NextResponse.json({
      status: 500,
      error: "Failed to get all Sales!",
    });
  }
}

// get Sales List by user id
export async function PATCH(req, res) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const status = searchParams.get("status");
  const userid = Number(userId);
  const page = searchParams.get("page");
  const pageSize = searchParams.get("pageSize");
  const pageInt = parseInt(page);
  const pageSizeInt = parseInt(pageSize);

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (status == "today") {
      const sales = await prisma.sales.findMany({
        where: {
          customer_id: userid,
          created_at: {
            gte: today,
          },
        },
        orderBy: {
          created_at: "desc",
        },
        // skip: (pageInt - 1) * pageSizeInt,
        // take: pageSizeInt,
      });

      let totalSales = 0;
      let totalDue = 0;
      let totalCash = 0;

      const salesData = await prisma.sales.findMany({
        where: {
          customer_id: userid,
          created_at: {
            gte: today,
          },
        },
        orderBy: {
          created_at: "desc",
        },
      });

      // total page calculation
      const totalCount = await prisma.sales.count({
        where: {
          customer_id: userid,
          created_at: {
            gte: today,
          },
        },
      });
      const totalPage = Math.ceil(totalCount / pageSizeInt);

      salesData.forEach((s) => {
        totalSales += s.discountedPrice || 0;
        if (s.paymentStatus === "due") {
          totalDue += s.discountedPrice || 0;
        } else if (s.paymentStatus === "paid") {
          totalCash += s.discountedPrice || 0;
        }
      });

      return NextResponse.json({
        status: "ok",
        data: sales,
        totals: {
          totalSales,
          totalCash,
          totalDue,
        },
        pagination: {
          currentPage: pageInt,
          pageSize: pageSizeInt,
          totalPage,
        },
      });
    } else {
      const sales = await prisma.sales.findMany({
        where: { customer_id: userid },
        orderBy: {
          created_at: "desc",
        },
        // skip: (pageInt - 1) * pageSizeInt,
        // take: pageSizeInt,
      });

      // total page calculation
      const totalCount = await prisma.sales.count({
        where: {
          customer_id: userid,
          // created_at: {
          //   gte: today,
          // },
        },
      });
      const totalPage = Math.ceil(totalCount / pageSizeInt);

      return NextResponse.json({
        status: "ok",
        data: sales,
        pagination: {
          currentPage: pageInt,
          pageSize: pageSizeInt,
          totalPage,
        },
      });
    }
  } catch (error) {
    console.log(error.message);
    return NextResponse.json({
      status: 500,
      error: "Failed to get sales history!",
    });
  }
}

// get Due Sales List by user id
export async function OPTIONS(req, res) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const userid = Number(userId);

  try {
    const due = await prisma.sales.aggregate({
      where: { customer_id: userid, paymentStatus: "due" },
      _sum: {
        discountedPrice: true,
      },
    });
    const totalDue = due._sum.discountedPrice || 0;
    return NextResponse.json({ status: "ok", data: totalDue });
  } catch (error) {
    console.log(error.message);
    return NextResponse.json({
      status: 500,
      error: "Failed to get all categories!",
    });
  }
}

// create sales in sales list by product and customer ,
// export async function POST(req, res) {
//   try {
//     const reqBody = await req.json();

//     // Validate input
//     if (!Array.isArray(reqBody)) {
//       return NextResponse.json({ error: "Expected an array of sales data" });
//     }

//     // Set to track processed invoice IDs TODO: more sales create one create specialDiscount
//     // many times create breakdown
//     const processedInvoiceIds = new Set();
//     const processedCollectPayments = new Set();

//     const results = await Promise.all(
//       reqBody.map(async (saleData) => {
//         const {
//           selectedProduct,
//           category,
//           subCategory,
//           perPacket,
//           totalpacket,
//           quantity,
//           customer_id,
//           paymentStatus,
//           cash,
//           due,
//           sepcialDiscount,
//           totalPrice,
//           note,
//           discountedPrice,
//           discount,
//           invoiceId,
//         } = saleData;

//         const whereCondition = {
//           id: Number(selectedProduct?.id),
//           name: selectedProduct?.name,
//         };

//         // Step 1: Fetch product details
//         const product = await prisma.products.findFirst({
//           where: {
//             AND: [
//               { id: Number(selectedProduct?.id) }, // Match by ID
//               { name: selectedProduct?.name },
//             ],
//           },
//         });

//         if (!product) {
//           console.error(`Product not found: ${selectedProduct.name}`);
//           // Optionally, return a more informative response or skip this sale
//           return NextResponse.json(
//             { error: `Product not found: ${selectedProduct.name}` },
//             { status: 404 }
//           );
//         }

//         // Step 2: Validate product quantity
//         const categoryCount = await prisma.products.count({
//           where: whereCondition,
//         });

//         if (product.quantity < categoryCount) {
//           console.error(
//             `Insufficient product quantity for: ${selectedProduct.name}`
//           );

//           return NextResponse.json({
//             error: `Insufficient product quantity for: ${selectedProduct.name}`,
//           });
//         }

//         // Step 3: Create sale and update product quantity
//         await prisma.$transaction(async (prisma) => {
//           const newSale = await prisma.sales.create({
//             data: {
//               productName: selectedProduct?.name,
//               category,
//               subCategory,
//               quantity: parseFloat(quantity) || null,
//               perPacket: parseFloat(perPacket) || null,
//               totalpacket: parseFloat(totalpacket) || null,
//               totalPrice: parseFloat(totalPrice),
//               discountedPrice: parseFloat(discountedPrice),
//               discount: parseInt(discount) || 0,
//               customer_id: parseInt(customer_id),
//               paymentStatus: paymentStatus,
//               invoice: invoiceId,
//               note: note || "",
//             },
//           });

//           // Update the product's quantity
//           const updatedProduct = await prisma.products.update({
//             where: { id: product.id },
//             data: {
//               quantity: product.quantity - parseFloat(quantity),
//               totalpacket: product.totalpacket - parseFloat(totalpacket || 0),
//             },
//           });

//           // if total packet or quantity is 0 then is now avible for stock
//           if (updatedProduct.category !== "FEED") {
//             if (updatedProduct.quantity <= 0) {
//               await prisma.products.update({
//                 where: {
//                   id: parseInt(product.id),
//                 },
//                 data: {
//                   stock: false,
//                 },
//               });
//             }
//           } else {
//             if (updatedProduct.totalpacket <= 0) {
//               await prisma.products.update({
//                 where: {
//                   id: parseInt(product.id),
//                 },
//                 data: {
//                   stock: false,
//                 },
//               });
//             }
//           }

//           // create special discount (once per invoice)
//           if (sepcialDiscount && !processedInvoiceIds.has(invoiceId)) {
//             await prisma.specialDiscount.create({
//               data: {
//                 amount: parseFloat(sepcialDiscount),
//                 invoice: invoiceId,
//               },
//             });
//             // Mark this invoice as processed
//             processedInvoiceIds.add(invoiceId);
//           }

//           return newSale;
//         });

//         // Step 4: Handle payment-related actions
//         if (!processedInvoiceIds.has(invoiceId)) {
//           if (paymentStatus === "partial") {
//             await prisma.collectPayment.create({
//               data: {
//                 customer_id: parseInt(customer_id),
//                 amount: parseFloat(cash),
//                 invoice: invoiceId,
//                 note: note || "",
//               },
//             });
//             await prisma.dueList.create({
//               data: {
//                 productCategory: category,
//                 subCategory: subCategory || null,
//                 customer_id: parseInt(customer_id),
//                 amount: parseFloat(due),
//                 invoice: invoiceId,
//                 note: note || "",
//               },
//             });
//           } else if (paymentStatus === "due") {
//             await prisma.dueList.create({
//               data: {
//                 productCategory: category,
//                 subCategory: subCategory || null,
//                 customer_id: parseInt(customer_id),
//                 amount: parseFloat(discountedPrice),
//                 invoice: invoiceId,
//                 note: note || "",
//               },
//             });
//           }
//           // Mark the invoice as processed for payment-related actions
//           processedInvoiceIds.add(invoiceId);
//         }

//       })
//     );

//     // Return all created sales as response
//     return NextResponse.json({ status: "ok", data: results });
//   } catch (error) {
//     console.error(error.message);
//     return NextResponse.json({ error: error.message });
//   }
// }

export async function POST(req, res) {
  try {
    const reqBody = await req.json();

    // Validate input
    if (!Array.isArray(reqBody)) {
      return NextResponse.json({ error: "Expected an array of sales data" });
    }

    // Map to group sales by invoice ID
    const salesGroupedByInvoice = reqBody.reduce((acc, saleData) => {
      const { invoiceId } = saleData;
      if (!acc[invoiceId]) acc[invoiceId] = [];
      acc[invoiceId].push(saleData);
      return acc;
    }, {});

    const results = await Promise.all(
      Object.entries(salesGroupedByInvoice).map(async ([invoiceId, sales]) => {
        // Initialize processedInvoiceIds for specialDiscount and payment-related actions
        const { sepcialDiscount, paymentStatus, customer_id, cash, due, note } =
          sales[0]; // Assume shared data across sales in the same invoice

        // Step 1: Process all sales for this invoice
        await Promise.all(
          sales.map(async (saleData) => {
            const {
              selectedProduct,
              category,
              subCategory,
              perPacket,
              totalpacket,
              quantity,
              totalPrice,
              discountedPrice,
              discount,
            } = saleData;

            // Fetch product details
            const product = await prisma.products.findFirst({
              where: {
                id: Number(selectedProduct?.id),
                name: selectedProduct?.name,
              },
            });

            if (!product) {
              throw new Error(`Product not found: ${selectedProduct.name}`);
            }

            // Validate product quantity
            if (product.quantity < parseFloat(quantity)) {
              throw new Error(
                `Insufficient product quantity for: ${selectedProduct.name}`
              );
            }

            // Create sale and update product quantity
            await prisma.sales.create({
              data: {
                productName: selectedProduct?.name,
                category,
                subCategory,
                quantity: parseFloat(quantity),
                perPacket: parseFloat(perPacket),
                totalpacket: parseFloat(totalpacket),
                totalPrice: parseFloat(totalPrice),
                discountedPrice: parseFloat(discountedPrice),
                discount: parseInt(discount) || 0,
                customer_id: parseInt(customer_id),
                paymentStatus,
                invoice: invoiceId,
                note: note || "",
              },
            });

            await prisma.products.update({
              where: { id: product.id },
              data: {
                quantity: product.quantity - parseFloat(quantity),
                totalpacket: product.totalpacket - parseFloat(totalpacket || 0),
                stock:
                  product.quantity - parseFloat(quantity) <= 0 ? false : true,
              },
            });
          })
        );

        // Step 2: Create specialDiscount once per invoice
        if (sepcialDiscount) {
          await prisma.specialDiscount.create({
            data: {
              amount: parseFloat(sepcialDiscount),
              invoice: invoiceId,
            },
          });
        }

        // Step 3: Create payment-related records (collectPayment and dueList)
        if (paymentStatus === "partial") {
          await prisma.collectPayment.create({
            data: {
              customer_id: parseInt(customer_id),
              amount: parseFloat(cash),
              invoice: invoiceId,
              note: note || "",
            },
          });

          await prisma.dueList.create({
            data: {
              productCategory: sales[0]?.category,
              subCategory: sales[0]?.subCategory || null,
              customer_id: parseInt(customer_id),
              amount: parseFloat(due),
              invoice: invoiceId,
              note: note || "",
            },
          });
        } else if (paymentStatus === "due") {
          await prisma.dueList.create({
            data: {
              productCategory: sales[0]?.category,
              subCategory: sales[0]?.subCategory || null,
              customer_id: parseInt(customer_id),
              amount: sales.reduce(
                (total, sale) => total + parseFloat(sale.discountedPrice),
                0
              ),
              invoice: invoiceId,
              note: note || "",
            },
          });
        }

        return { invoiceId, status: "processed" };
      })
    );

    return NextResponse.json({ status: "ok", data: results });
  } catch (error) {
    console.error(error.message);
    return NextResponse.json({ error: error.message });
  }
}
