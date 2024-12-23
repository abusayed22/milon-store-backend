import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { DateTime } from "@prisma/client";
const prisma = new PrismaClient();

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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ----------today total calculation ----------

    // Query to get total sales, total due, and total cash for today
    const totalSalesCalculation = await prisma.sales.aggregate({
      _sum: {
        discountedPrice: true, // Sum all discounted prices for sales
      },
      where: {
        created_at: {
          gte: today, // Only today's sales
        },
      },
    });

    // Second, get the total sales grouped by payment status (due or paid)
    const groupedByPaymentStatus = await prisma.sales.groupBy({
      by: ["paymentStatus"], // Group by paymentStatus
      _sum: {
        discountedPrice: true, // Sum the discountedPrice for each group
      },
      where: {
        created_at: {
          gte: today, // Only today's sales
        },
      },
    });

    // Calculate today totals for sales, due, and cash
    let todayTotalSalesPrice = totalSalesCalculation._sum.discountedPrice || 0;
    let todayTotalDueAmount = 0;
    let todayTotalCashAmount = 0;

    // Process the grouped data
    groupedByPaymentStatus.forEach((group) => {
      if (group.paymentStatus === "due") {
        todayTotalDueAmount = group._sum.discountedPrice || 0;
      } else if (group.paymentStatus === "paid") {
        todayTotalCashAmount = group._sum.discountedPrice || 0;
      }
    });

    // ----------- today total calculation with group by customer & Pagination TODO: ------
    const salesData = await prisma.sales.findMany({
      where: {
        created_at: {
          gte: today, // Only today's sales
        },
      },
      // skip: (pageInt - 1) * pageSizeInt,
      // take: pageSizeInt,
      select: {
        customer_id: true,
        discountedPrice: true,
        paymentStatus: true,
        customers: {
          select: {
            name: true,
          },
        },
      },
    });

    // Count the total number of sales for pagination
    const totalSalesCount = await prisma.sales.count({
      where: {
        created_at: {
          gte: today, // Only today's sales
        },
      },
    });

    // Process the data to calculate totals
    // Initialize variables for totals
    let totalSalesPrice = 0;
    let totalDueAmount = 0;
    let totalCashAmount = 0;
    // console.log(salesData)

    // Process sales data TODO:
    const groupedData = salesData.reduce((acc, sale) => {
      const customerId = sale.customer_id;

      // Update overall totals
      // totalSalesPrice += sale.discountedPrice;
      // if (sale.paymentStatus === "due") {
      //   totalDueAmount += sale.discountedPrice;
      // } else if (sale.paymentStatus === "paid") {
      //   totalCashAmount += sale.discountedPrice;
      // }

      // Group data by customer
      if (!acc[customerId]) {
        acc[customerId] = {
          customer_id: customerId,
          customerName: sale.customers.name,
          totalSalesAmount: 0,
          totalDue: 0,
          totalCash: 0,
        };
      }

      acc[customerId].totalSalesAmount += sale.discountedPrice;
      if (sale.paymentStatus === "due") {
        acc[customerId].totalDue += sale.discountedPrice;
      } else if (sale.paymentStatus === "paid") {
        acc[customerId].totalCash += sale.discountedPrice;
      }

      // console.log(acc[customerId]);
      return acc;
    }, {});

    const todaySales = Object.values(groupedData);
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
export async function POST(req, res) {
  try {
    const reqBody = await req.json();

    // Validate input
    if (!Array.isArray(reqBody)) {
      return NextResponse.json({ error: "Expected an array of sales data" });
    }
    // console.log(reqBody);

    const results = await Promise.all(
      reqBody.map(async (saleData) => {
        const {
          selectedProduct,
          category,
          subCategory,
          perPacket,
          totalpacket,
          quantity,
          customer_id,
          paymentStatus,
          totalPrice,
          note,
          discountedPrice,
          discount,
        } = saleData;

        const whereCondition = {
          id: Number(selectedProduct?.id),
          name: selectedProduct?.name,
        };

        // Step 1: Fetch product details
        const product = await prisma.products.findFirst({
          where: {
            AND: [
              { id: Number(selectedProduct?.id) }, // Match by ID
              { name: selectedProduct?.name },
            ],
          },
        });

        if (!product) {
          console.error(`Product not found: ${selectedProduct.name}`);
          // Optionally, return a more informative response or skip this sale
          return NextResponse.json({ error: `Product not found: ${selectedProduct.name}` }, { status: 404 });
        }

        // Step 2: Validate product quantity
        const categoryCount = await prisma.products.count({
          where: whereCondition,
        });

        if (product.quantity < categoryCount) {
          console.error(
            `Insufficient product quantity for: ${selectedProduct.name}`
          );
          throw new Error(
            `Insufficient product quantity for: ${selectedProduct.name}`
          );
        }

        // Step 3: Create sale and update product quantity
        // console.log(customer_id)
        return await prisma
          .$transaction(async (prisma) => {
            const newSale = await prisma.sales.create({
              data: {
                productName: selectedProduct?.name,
                category,
                subCategory,
                quantity: parseFloat(quantity) || null,
                perPacket: parseFloat(perPacket) || null,
                totalpacket: parseFloat(totalpacket) || null,
                totalPrice: parseFloat(totalPrice),
                discountedPrice: parseFloat(discountedPrice),
                discount: parseInt(discount) || 0,
                customer_id: parseInt(customer_id),
                paymentStatus,
                note: note || "",
              },
            });

            // Update the product's quantity
            const updatedProduct = await prisma.products.update({
              where: { id: product.id },
              data: {
                quantity: product.quantity - parseFloat(quantity),
                totalpacket: product.totalpacket - parseFloat(totalpacket || 0),
              },
            });

            // if (
            //   updatedProduct.totalpacket <= 0 ||
            //   updatedProduct.quantity <= 0
            // ) {
            //   await prisma.products.delete({
            //     where: { id: product.id },
            //   });
            // }

            // step 4 Check if both quantity and totalpacket are 0
            if (updatedProduct.category !== "FEED") {
              if (updatedProduct.quantity <= 0) {
                await prisma.products.delete({
                  where: {
                    id: parseInt(product.id),
                  },
                });
              }
            } else {
              if (updatedProduct.totalpacket <= 0) {
                await prisma.products.delete({
                  where: {
                    id: parseInt(product.id),
                  },
                });
              }
            }

            // Create due list if paymentStatus is "due"
            const validCategories = ["FEED", "MEDICINE", "GROCERY"];
            if (!validCategories.includes(category)) {
              throw new Error(`Invalid category: ${category}`);
            }

            return newSale;
          })
          .then(async (newSale) => {
            if (paymentStatus === "due") {
              await prisma.dueList.create({
                data: {
                  productCategory: category,
                  subCategory: subCategory || null,
                  customer_id: parseInt(customer_id) || null,
                  amount: parseFloat(discountedPrice) || 0,
                  note: note || "",
                },
              });
            }
          });
      })
    );

    // Return all created sales as response
    return NextResponse.json({ status: "ok", data: results });
  } catch (error) {
    console.error(error.message);
    return NextResponse.json({ error: error.message });
  }
}
