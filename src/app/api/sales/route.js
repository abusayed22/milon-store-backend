import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// get all Sales List by category
export async function GET(req, res) {
  try {
    const sales = await prisma.sales.findMany({
      include:{
        customers: {
          select:{
            name:true
          }
        }
      }
    });
    
    let totalSalesPrice = 0;
    const formattedSales = sales.map(sale => {
      totalSalesPrice += sale.salesPrice; // Add each sale's price to total

      return {
        id: sale.id,
        productName: sale.productName,
        category: sale.category,
        subCategory: sale.subCategory,
        quantity: sale.quantity,
        perPacket: sale.perPacket,
        totalpacket: sale.totalpacket,
        salesPrice: sale.salesPrice,
        customer_id: sale.customer_id,
        customerName: sale.customers?.name || null, // Include customer name
        paymentStatus: sale.paymentStatus,
        note: sale.note,
        created_at: sale.created_at,
        updated_at: sale.updated_at,
      };
    });

    return NextResponse.json({ status: "ok", data: formattedSales, totalSalesPrice });
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
    const reqBody = await req.json()
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
    
    const selected = JSON.parse(selectedProduct)

    // if sub category not have
    const whereCondition = {
      id:Number(selected?.id),
      name: selected?.name
    };


    // Step 1: Fetch product details from the `products` table based on `productName`
    const product = await prisma.products.findFirst({
      where: {id:Number(selected?.id)},
    });
    

    if (!product) {
      console.error("Product not found")
      return NextResponse.json({ status: 404, error: "Product not found" });
    }

     // Step 2: Calculate quantity based on category length
     const categoryCount = await prisma.products.count({
      where: whereCondition,
    });

    if (product.quantity < categoryCount) {
      console.error("Insufficient product quantity" )
      return NextResponse.json(
        { error: "Insufficient product quantity" },
        { status: 400 }
      );
    }

    // Step 3: Create sale and update product quantity in a transaction
    const sale = await prisma.$transaction(async (prisma) => {
      // Create the sale
      const saleData = {
        productName: selected?.name,
        category: category,
        subCategory: subCategory,
        quantity: quantity ? parseFloat(quantity) : null, // Set as null if empty
        perPacket: perPacket ? parseFloat(perPacket) : null, // Set as null if empty
        salesPrice: totalPrice ? parseFloat(totalPrice) : null, // Set as null if empty
        totalpacket: totalpacket ? parseFloat(totalpacket) : null, // Set as null if empty
        customer_id: parseInt(customer_id),
        paymentStatus: paymentStatus,
        note: note || product.note,
      };
      const newSale = await prisma.sales.create({
        data: saleData,
      });

      // Update the product's quantity
      await prisma.products.update({
        where: { id: product.id },
        data: { quantity: product.quantity - quantity }, // Reduce the quantity
      });

      // step 4 conditionally create an entry "dueList",if paymentStatus "due"
      if (paymentStatus === "due") {
        await prisma.dueList.create({
          data: {
            name: selected?.name,
            productCategory: category,
            subCategory: subCategory || null,
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
