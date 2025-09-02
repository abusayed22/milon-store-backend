import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
// import { DateTime } from "@prisma/client";
import { DateTime } from "luxon";
import { localDate } from "@/lib/dateTime";

const prisma = new PrismaClient();

// -------------- Utils -----------------

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


    // Define the timezone
    const timeZone = "Asia/Dhaka";

    // Get the current UTC time
    const nowUTC = DateTime.utc();

    // Calculate the start and end of the day in UTC, adjusted for Asia/Dhaka
    const startOfDayUTC = nowUTC.setZone(timeZone).startOf("day").toUTC();
    const endOfDayUTC = nowUTC.setZone(timeZone).endOf("day").toUTC();

 

    // ----------today total calculation ----------

    // ----------- today total calculation with group by customer & Pagination TODO: ------
    const salesData = await prisma.sales.findMany({
      where: {
        created_at: {
          gte: startOfDayUTC, // Start of day in UTC
          lte: endOfDayUTC, // End of day in UTC
        },
      },
      select: {
        customer_id: true,
        discountedPrice: true,
        paymentStatus: true,
        created_at: true,
        customers:{
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
          gte: startOfDayUTC, // Start of day in UTC
          lte: endOfDayUTC, // End of day in UTC
        },
      },
    });

    // Calculate today totals for sales, due, and cash
    let todayTotalSalesPrice = parseFloat(totalSalesCalculation._sum.discountedPrice || 0);
    let todayTotalDueAmount = 0;
    let todayTotalCashAmount = 0;

    // partial payment status invoices and amount
    const partialInovices = salesData
      .filter((item) => item.paymentStatus === "partial")
      .map((obj) => obj.invoice);

    // partial cash and due amount
    const partialDueAmount = await byPartialInvoices(
      "dueList",
      partialInovices
    );
    const partialCashAmount = await byPartialInvoices(
      "collectPayment",
      partialInovices
    );

    // Count the total number of sales for pagination
    const totalSalesCount = await prisma.sales.count({
      where: {
        created_at: {
          gte: startOfDayUTC, // Start of day in UTC
          lte: endOfDayUTC, // End of day in UTC
        },
      },
    });

    // customer group data
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
      const customerSales = salesData.filter(
        (item) => item.customer_id === customerId
      );
      const dueInvoices = customerSales
        .filter((item) => item.paymentStatus === "due")
        .map((obj) => obj.invoice);
      const cashInvoices = customerSales
        .filter((item) => item.paymentStatus === "paid")
        .map((obj) => obj.invoice);

      // Calculate special discounts for due and cash invoices
      const dueTotalSpecialDiscountAmount =
        dueInvoices.length > 0 ? await getTotalSpecialDiscount(dueInvoices) : 0; // Assign 0 if dueInvoices is empty
      const cashTotalSpecialDiscountAmount =
        cashInvoices.length > 0
          ? await getTotalSpecialDiscount(cashInvoices)
          : 0; // Assign 0 if cashInvoices is empty

      // customer special discount
      const customerInvoices = customerSales.map((obj) => obj.invoice);
      const customerSpecialDiscount =
        customerSales.length > 0
          ? await getTotalSpecialDiscount(customerInvoices)
          : 0;

      // Update total sales, cash, and due
      acc[customerId].totalSale += sale.discountedPrice;
      if (sale.paymentStatus === "due") {
        acc[customerId].totalDue += sale.discountedPrice;
        todayTotalDueAmount += sale.discountedPrice;
      } else if (sale.paymentStatus === "paid") {
        //
        acc[customerId].totalCash += sale.discountedPrice;
        todayTotalCashAmount += sale.discountedPrice;
      } else if (sale.paymentStatus === "partial") {
        // Ensure partial due and cash amounts are calculated correctly and only once
        // Avoid re-calculating these here
        if (!acc[customerId].partialPaymentProcessed) {
          acc[customerId].totalDue += partialDueAmount || 0;
          todayTotalDueAmount += partialDueAmount || 0;
          acc[customerId].totalCash += partialCashAmount || 0;
          todayTotalCashAmount += partialCashAmount || 0;
        }
        acc[customerId].partialPaymentProcessed = true;
      }

      // Apply special discounts to total due and total cash (only once per customer)
      // Avoid re-calculating these here
      if (!acc[customerId].discountApplied) {
        acc[customerId].totalSale -= customerSpecialDiscount;
        acc[customerId].totalDue -= dueTotalSpecialDiscountAmount || 0;
        acc[customerId].totalCash -= cashTotalSpecialDiscountAmount || 0;
        acc[customerId].discountApplied = true; // Mark discount as applied
      }

      return acc;
    }, Promise.resolve({}));

    const todaySales = Object.values(groupData);

    const paginatedSales = todaySales.slice(
      (pageInt - 1) * pageSizeInt,
      pageInt * pageSizeInt
    );
    const totalRecords = todaySales.length; // Total number of grouped customers
    const totalPages = Math.ceil(totalRecords / pageSizeInt);

    return NextResponse.json({
      status: "ok",
      data: paginatedSales,
      todayTotals: {
        todayTotalSalesPrice,
        todayTotalDueAmount,
        todayTotalCashAmount,
        today: endOfDayUTC,
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
    
    let startOfDayBST;
    let endOfDayBST;

    if (status === "today") {
      const timeZone = "Asia/Dhaka";
      const nowInDhaka = DateTime.now().setZone(timeZone);
      startOfDayBST = nowInDhaka.startOf("day").toJSDate();
      endOfDayBST = nowInDhaka.endOf("day").toJSDate();
    }



    if (status == "today") {
      const sales = await prisma.sales.findMany({
        where: {
          customer_id: userid,
          created_at: {
            gte: startOfDayBST,
            lte: endOfDayBST,
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
      let partialPaymentProcessed = false;

      const salesData = await prisma.sales.findMany({
        where: {
          customer_id: userid,
          created_at: {
            gte: startOfDayBST,
            lte: endOfDayBST,
          },
        },
        orderBy: {
          created_at: "desc",
        },
      });

      // partial invoices
      const partialInovices = salesData
        .filter((obj) => obj.paymentStatus === "partial")
        .map((obj) => obj.invoice);
      // This customer invoice for more calculation 
      const customerInvoices = sales.map((obj) => obj.invoice);
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

      // total page calculation
      const totalCount = await prisma.sales.count({
        where: {
          customer_id: userid,
          created_at: {
            gte: startOfDayBST,
            lte: endOfDayBST,
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
        } else if (s.paymentStatus === "partial") {
          if (!partialPaymentProcessed) {
            totalDue += partialDueAmount || 0;
            totalCash += partialCashAmount || 0;
          }
          partialPaymentProcessed = true;
        }
      });

      return NextResponse.json({
        status: "ok",
        data: sales,
        totals: {
          totalSales: totalSales - totalSpecialDiscount,
          totalCash,
          totalDue,
          today: startOfDayBST,
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
      });

      // total page calculation
      const totalCount = await prisma.sales.count({
        where: {
          customer_id: userid,
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
    const totalDue = parseFloat(due._sum.discountedPrice || 0);
    return NextResponse.json({ status: "ok", data: totalDue });
  } catch (error) {
    console.log(error.message);
    return NextResponse.json({
      status: 500,
      error: "Failed to get all categories!",
    });
  }
}


// sales create 
export async function POST(req, res) {
  try {
    const reqBody = await req.json();

    // Get the current time in your specific timezone
        const nowInDhaka = DateTime.now().setZone("Asia/Dhaka").toJSDate();

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
            const salesCreated = await prisma.sales.create({
              data: {
                productName: selectedProduct?.name,
                productId: parseInt(selectedProduct?.id),
                category,
                subCategory,
                quantity: parseFloat(quantity),
                perPacket: parseFloat(perPacket),
                totalpacket: parseFloat(totalpacket),
                totalPrice: parseFloat(totalPrice),
                discountedPrice: parseFloat(discountedPrice),
                discount: parseFloat(discount) || 0,
                customer_id: parseInt(customer_id),
                paymentStatus,
                invoice: invoiceId,
                note: note || "",
                created_at:nowInDhaka
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
              created_at: nowInDhaka
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
              created_at: nowInDhaka
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
              created_at: nowInDhaka
            },
          });
        } else if (paymentStatus === "due") {
          await prisma.dueList.create({
            data: {
              productCategory: sales[0]?.category,
              subCategory: sales[0]?.subCategory || null,
              customer_id: parseInt(customer_id),
              amount:  parseFloat(due),
              invoice: invoiceId,
              note: note || "",
              created_at: nowInDhaka
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
