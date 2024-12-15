import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// get all sub-category by category
export async function GET(req, res) {
  try {
    const category = await prisma.productTransferList.findMany();
    return NextResponse.json({ status: "ok", data: category });
  } catch (error) {
    console.log(error.message);
    return NextResponse.json({
      status: 500,
      error: "Failed to get all categories!",
    });
  }
}

// create trasnfer in trasnfer list by product and customer ,
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
      customer_id,
      note,
    } = reqBody;

    
    // const selected = JSON.parse(selectedProduct);

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

    if (product.quantity < quantity) {
      console.error("Insufficient product quantity");
      return NextResponse.json(
        { error: "Insufficient product quantity" },
        { status: 400 }
      );
    }
    

    // Step 3: Create sale and update product quantity in a transaction
    const transfer = await prisma.$transaction(async (prisma) => {
      // Create the transfer
      const transferData = {
        productName: selectedProduct?.name,
        category: category,
        subCategory: subCategory,
        quantity: quantity ? parseFloat(quantity) : null, // Set as null if empty
        perPacket: perPacket ? parseFloat(perPacket) : null, // Set as null if empty
        totalpacket: totalpacket ? parseFloat(totalpacket) : null, // Set as null if empty
        note: note || product.note,
      };
      const newTransfer = await prisma.productTransferList.create({
        data: transferData,
      });
// console.log(transferData)
      // Update the product's quantity
      let updatedProduct;
      if(category !== "FEED") {
        updatedProduct = await prisma.products.update({
          where: { id: product.id },
          data: {
            quantity: product.quantity - quantity,
            // totalpacket: product.totalpacket - totalpacket,
          }, 
        });
        // updatedProduct = updateCalculationProduct;
      }else {
        updatedProduct = await prisma.products.update({
          where: { id: product.id },
          data: {
            quantity: product.quantity - quantity,
            totalpacket: product.totalpacket - totalpacket,
          }, // Reduce the quantity
        });
        // updatedProduct = updateCalculationProduct;
      }
      

      // step 4 Check if both quantity and totalpacket are 0
      if(updatedProduct.category !== "FEED"){
        if (updatedProduct.quantity <= 0) {
          await prisma.products.delete({
            where: {
              id: parseInt(product.id),
            },
          });
        }
      } else{
        if (updatedProduct.totalpacket <= 0) {
          await prisma.products.delete({
            where: {
              id: parseInt(product.id),
            },
          });
        }
      }
      

      return newTransfer;
    });
    return NextResponse.json({ status: "ok", data: transfer }, { status: 201 });
  } catch (error) {
    console.error("Error creating sale:", error.message);
    return NextResponse.json(
      { error: "Failed to create sale" },
      { status: 500 }
    );
  }
}
