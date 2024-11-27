import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { DateTime } from "@prisma/client";
const prisma = new PrismaClient();

// get all Sales List by category
export async function GET(req, res) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const salesData = await prisma.sales.findMany({
      where: {
        created_at: {
          gte: today, // Only today's sales
        },
      },
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
    // console.log(salesData)

    // Process the data to calculate totals
    // Initialize variables for totals
    let totalSalesPrice = 0;
    let totalDueAmount = 0;
    let totalCashAmount = 0;

    // Process sales data
    const groupedData = salesData.reduce((acc, sale) => {
      const customerId = sale.customer_id;

      // Update overall totals
      totalSalesPrice += sale.discountedPrice;
      if (sale.paymentStatus === "due") {
        totalDueAmount += sale.discountedPrice;
      } else if (sale.paymentStatus === "paid") {
        totalCashAmount += sale.discountedPrice;
      }

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

      return acc;
    }, {});

    const todaySales = Object.values(groupedData);

    return NextResponse.json({
      status: "ok",
      data: todaySales,
      totals: {
        totalSalesPrice,
        totalDueAmount,
        totalCashAmount,
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
      });

      let totalSales = 0;
      let totalDue = 0;
      let totalCash = 0;

      sales.forEach((s) => {
        totalSales += s.salesPrice || 0;
        if (s.paymentStatus === "due") {
          totalDue += s.salesPrice || 0;
        } else if (s.paymentStatus === "paid") {
          totalCash += s.salesPrice || 0;
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
      });
    } else {
      const sales = await prisma.sales.findMany({
        where: { customer_id: userid },
        orderBy: {
          created_at: "desc",
        },
      });
      return NextResponse.json({ status: "ok", data: sales });
    }
  } catch (error) {
    console.log(error.message);
    return NextResponse.json({
      status: 500,
      error: "Failed to get all categories!",
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
        salesPrice: true,
      },
    });
    const totalDue = due._sum.salesPrice || 0;
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

        // if (!selectedProduct || !selectedProduct.id || !selectedProduct.name) {
        //   throw new Error("Invalid selectedProduct data");
        // }

        const whereCondition = {
          id: Number(selectedProduct?.id),
          name: selectedProduct?.name,
        };

        // Step 1: Fetch product details
        const product = await prisma.products.findFirst({
          where: { id: Number(selectedProduct?.id) },
        });

        if (!product) {
          console.error(`Product not found: ${selectedProduct.name}`);
          throw new Error(`Product not found: ${selectedProduct.name}`);
        }

        // Step 2: Validate product quantity
        const categoryCount = await prisma.products.count({
          where: whereCondition,
        });

        if (product.quantity < categoryCount) {
          console.error(`Insufficient product quantity for: ${selectedProduct.name}`);
          throw new Error(`Insufficient product quantity for: ${selectedProduct.name}`);
        }

        // Step 3: Create sale and update product quantity
        return await prisma.$transaction(async (prisma) => {
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
              customer_id: parseInt(customer_id) || null,
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

          // Delete product if out of stock TODO:
          // if (updatedProduct.quantity <= 0 || ) {
          //   await prisma.products.delete({
          //     where: { id: product.id },
          //   });
          // }

          if(updatedProduct.category === "FEED"){
            if(updatedProduct.totalpacket <= 0){
              await prisma.products.delete({
                where: { id: product.id },
              });
            } else {
              if(updatedProduct.quantity <= 0){
                await prisma.products.delete({
                  where: { id: product.id },
                });
              }
            }
          }

          // Create due list if paymentStatus is "due"
          const validCategories = ["FEED", "MEDICINE", "GROCERY"];
          if (!validCategories.includes(category)) {
            throw new Error(`Invalid category: ${category}`);
          }

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

          return newSale;
        });
      })
    );

    // Return all created sales as response
    return NextResponse.json({ status: "ok", data: results });
  } catch (error) {
    console.error("Error processing sales:", error.message);
    return NextResponse.json({ error: error.message });
  }
}
