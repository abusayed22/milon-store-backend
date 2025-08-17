import { localDate } from "@/lib/dateTime";
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

// Fetch transfer data by utc today
export async function PATCH(req) {
  try {
    // get value from url
    const url = new URL(req.url);
    // const startDate = url.searchParams.get("startDate");
    // const endDate = url.searchParams.get("endDate");
    const current = url.searchParams.get("page");
    const pageSize = url.searchParams.get("pageSize");
    const page = current ? Number(current) : 1;
    const limit = pageSize ? Number(pageSize) : 10;
    const skip = (page - 1) * limit;

    // Get today's start and end times in UTC
    // Get the current UTC date
    const now = new Date();
    // Get the offset for Bangladesh Standard Time (UTC +6 hours)
    const bangladeshOffset = 6 * 60; // 6 hours in minutes
    // Set the start of the day (00:00:00 BST)
    const startOfDayBST = new Date(now.getTime() + bangladeshOffset * 60000);
    startOfDayBST.setHours(0, 0, 0, 0); // Set to 00:00:00 in Bangladesh Time

    // Set the end of the day (23:59:59 BST)
    const endOfDayBST = new Date(now.getTime() + bangladeshOffset * 60000);
    endOfDayBST.setHours(23, 59, 59, 999); // Set to 23:59:59 in Bangladesh Time



    // Query records with today's UTC date
    const products = await prisma.productTransferList.findMany({
      where: {
        created_at: {
          gte: startOfDayBST, // Greater than or equal to start of the day in UTC
          lte: endOfDayBST, // Less than or equal to end of the day in UTC
        },
      },
      skip,
      take: limit
    });

    // Get total count for pagination metadata
    const totalCount = await prisma.productTransferList.count({
      where: {
        created_at: {
          gte: startOfDayBST, // Greater than or equal to start of the day in UTC
          lte: endOfDayBST, // Less than or equal to end of the day in UTC
        },
      },
    });

    return NextResponse.json({
      status: "ok", data: products,
      pagination: {
        // total: totalCount,
        // page,
        // limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching products for today in UTC:", error);
    return NextResponse.json({ error: "Internal Server Error" });
  }
}

// create trasnfer in trasnfer list by product and customer ,
export async function POST(req, res) {
  try {
    const reqBody = await req.json();


    // const selected = JSON.parse(selectedProduct);

    // if sub category not have


    const Result = await Promise.all(
      reqBody.map(async (item) => {

        const {
          selectedProduct,
          category,
          subCategory,
          perPacket,
          totalpacket,
          quantity,
          note,
        } = item;

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
            productId: selectedProduct?.id,
            category: category,
            subCategory: subCategory,
            quantity: quantity ? parseFloat(quantity) : null, // Set as null if empty
            perPacket: perPacket ? parseFloat(perPacket) : null, // Set as null if empty
            totalpacket: totalpacket ? parseFloat(totalpacket) : null, // Set as null if empty
            note: note || "",
            created_at: localDate()
          };

          const newTransfer = await prisma.productTransferList.create({
            data: transferData,
          });

          // Update the product's quantity
          let updatedProduct;
          if (category !== "FEED") {
            updatedProduct = await prisma.products.update({
              where: { id: product.id },
              data: {
                quantity: parseFloat(product.quantity )- parseFloat(quantity),
              },
            });
          } else {
            updatedProduct = await prisma.products.update({
              where: { id: product.id },
              data: {
                quantity: parseFloat(product.quantity) - parseFloat(quantity),
                totalpacket: parseFloat(product.totalpacket) - parseFloat(totalpacket),
              },
            });
          }

          // if total packet or quantity is 0 then is now avible for stock
          if (updatedProduct.category !== "FEED") {
            if (updatedProduct.quantity <= 0) {
              // Set stock to false instead of deleting the product
              await prisma.products.update({
                where: {
                  id: parseInt(product.id),
                },
                data: {
                  stock: false, // Set stock to false
                },
              });
            }
          } else {
            if (updatedProduct.totalpacket <= 0) {
              // Set stock to false instead of deleting the product
              await prisma.products.update({
                where: {
                  id: parseInt(product.id),
                },
                data: {
                  stock: false, // Set stock to false
                },
              });
            }
          }

          return newTransfer;
        });

        return transfer;
      })
    );



    return NextResponse.json({ status: "ok", data: Result }, { status: 201 });
  } catch (error) {
    console.error("Error creating transfer:", error.message);
    return NextResponse.json(
      { error: "Failed to create sale" },
      { status: 500 }
    );
  }
}
