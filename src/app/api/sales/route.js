import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { DateTime } from "@prisma/client";
const prisma = new PrismaClient();

// get all Sales List by category
export async function GET(req, res) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch sales with customer data
    // const groupSale = await prisma.sales.groupBy({
    //   by: ['customer_id'],
    //   where: {
    //     created_at: {
    //       gte: today
    //     }
    //   },
    //   _sum: {
    //     salesPrice: true
    //   },
    //   _count: {
    //     id: true // count of sales item
    //   },
    //   _avg: {
    //     quantity: true // Average quantity (optional, based on requirements)
    //   },
    //   _min: {
    //     updated_at: true  // Earliest transaction time
    //   },
    //   _max: {
    //     created_at: true  //  Latest transaction time
    //   },

    // })

    // const todaySales = await Promise.all(
    //   groupSale.map(async (sale) => {
    //     const customer = await prisma.customers.findUnique({
    //       where: {
    //         id: sale.customer_id
    //       },
    //       select: {name : true}
    //     })
    //     return {...sale,customerName: customer.name}
    //   })

    // )

    const salesData = await prisma.sales.findMany({
      where: {
        created_at: {
          gte: today, // Only today's sales
        },
      },
      select: {
        customer_id: true,
        salesPrice: true,
        paymentStatus: true,
        customers: {
          select: {
            name: true,
          },
        },
      },
    });

    // Process the data to calculate totals
    // Initialize variables for totals
    let totalSalesPrice = 0;
    let totalDueAmount = 0;
    let totalCashAmount = 0;

    // Process sales data
    const groupedData = salesData.reduce((acc, sale) => {
      const customerId = sale.customer_id;

      // Update overall totals
      totalSalesPrice += sale.salesPrice;
      if (sale.paymentStatus === "due") {
        totalDueAmount += sale.salesPrice;
      } else if (sale.paymentStatus === "paid") {
        totalCashAmount += sale.salesPrice;
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

      acc[customerId].totalSalesAmount += sale.salesPrice;
      if (sale.paymentStatus === "due") {
        acc[customerId].totalDue += sale.salesPrice;
      } else if (sale.paymentStatus === "paid") {
        acc[customerId].totalCash += sale.salesPrice;
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
  const userid = Number(userId);

  try {
    const sales = await prisma.sales.findMany({
      where: { customer_id: userid },
      orderBy: {
        created_at: "desc",
      },
    });
    return NextResponse.json({ status: "ok", data: sales });
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
    const {
      selectedProduct,
      category,
      subCategory,
      perPacket,
      totalpacket,
      quantity,
      totalPrice,
      customer_id,
      paymentStatus,
      note,
    } = reqBody;

    // const selected = JSON.parse(selectedProduct)
    // console.log(selected)

    // if sub category not have
    const whereCondition = {
      id: Number(selectedProduct?.id),
      name: selectedProduct?.name,
    };

    // Step 1: Fetch product details from the `products` table based on `productName`
    const product = await prisma.products.findFirst({
      where: { id: Number(selectedProduct?.id) },
    });

    if (!product) {
      console.error("Product not found");
      return NextResponse.json({ status: 404, error: "Product not found" });
    }

    // Step 2: Calculate quantity based on category length
    const categoryCount = await prisma.products.count({
      where: whereCondition,
    });

    if (product.quantity < categoryCount) {
      console.error("Insufficient product quantity");
      return NextResponse.json(
        { error: "Insufficient product quantity" },
        { status: 400 }
      );
    }

    // Step 3: Create sale and update product quantity in a transaction
    const sale = await prisma.$transaction(async (prisma) => {
      // Create the sale
      const saleData = {
        productName: selectedProduct?.name,
        category: category,
        subCategory: subCategory,
        quantity: quantity ? parseFloat(quantity) : null, // Set as null if empty
        perPacket: perPacket ? parseFloat(perPacket) : null, // Set as null if empty
        salesPrice: totalPrice ? parseFloat(totalPrice) : null, // Set as null if empty
        totalpacket: totalpacket ? parseFloat(totalpacket) : null, // Set as null if empty
        customer_id: parseInt(customer_id),
        paymentStatus: paymentStatus,
        note: note || "",
      };
      // console.log(saleData)
      const newSale = await prisma.sales.create({
        data: saleData,
      });
      // console.log(newSale)

      // Update the product's quantity
      await prisma.products.update({
        where: { id: product.id },
        data: { quantity: product.quantity - quantity }, // Reduce the quantity
      });

      // step 4 conditionally create an entry "dueList",if paymentStatus "due"
      const validCategories = ["FEED", "MEDICINE", "GROCERY"];

      if (!validCategories.includes(category)) {
        throw new Error(`Invalid category: ${category}`);
      }

      if (paymentStatus === "due") {
        await prisma.dueList.create({
          //TODO: data code are ago because prisma not migrate
          data: {
            // productCategory: category,
            // subCategory: subCategory || null,
            customer_id: parseInt(customer_id),
            amount: totalPrice ? parseFloat(totalPrice) : 0,
            note: note || product.note,
          },
        });
      }

      return newSale;
    });

    return NextResponse.json({ status: "ok", data: sale }, { status: 201 });
  } catch (error) {
    console.error("Error creating sale:", error.message);
    return NextResponse.json(
      { error: "Failed to create sale" },
      { status: 500 }
    );
  }
}
