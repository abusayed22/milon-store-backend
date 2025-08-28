import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// --- GET: Find an invoice by its ID ---
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get("invoiceId");

    if (!invoiceId) {
      return NextResponse.json({ status: "error", error: "Invoice ID is required." }, { status: 400 });
    }

    const sales = await prisma.sales.findMany({
      where: { invoice: invoiceId },
      include: { customers: true },
    });

    if (sales.length === 0) {
      return NextResponse.json({ status: "error", error: "Invoice not found." }, { status: 404 });
    }

    // Return the customer and the list of products sold
    return NextResponse.json({
      status: "ok",
      data: {
        customer: sales[0].customers,
        products: sales,
      },
    });
  } catch (error) {
    console.error("Error fetching invoice for return:", error);
    return NextResponse.json({ status: "error", error: "An internal server error occurred." }, { status: 500 });
  }
}





// --- POST: Process a sales return ---
export async function POST(req) {
  try {
    const { returnedItems } = await req.json();

    if (!Array.isArray(returnedItems) || returnedItems.length === 0) {
      return NextResponse.json({ status: "error", error: "No items selected for return." }, { status: 400 });
    }

    const returnResults = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of returnedItems) {
        // 1. Find the original sale record to validate
        const originalSale = await tx.sales.findUnique({ where: { id: item.originalSaleId } });
        if (!originalSale) {
          throw new Error(`Original sale record not found for product: ${item.productName}`);
        }

        // 2. Add the returned quantity back to the product's stock
        await tx.products.update({
          where: { id: item.productId },
          data: {
            quantity: { increment: item.returnQuantity },
            totalpacket: { increment: item.returnTotalPacket || 0 },
          },
        });

        // 3. Create a record of the return
        const returnRecord = await tx.salesReturn.create({
          data: {
            originalSaleId: item.originalSaleId,
            productId: item.productId,
            productName: item.productName,
            quantity: item.returnQuantity,
            totalpacket: item.returnTotalPacket,
            returnAmount: item.returnAmount,
            reason: item.reason || "",
          },
        });

        // 4. (Optional but recommended) Adjust customer's due balance
        // This assumes you want to credit the return amount to their account
        await tx.collectPayment.create({
            data: {
                customer_id: originalSale.customer_id,
                amount: item.returnAmount,
                note: `Return for invoice: ${originalSale.invoice}`,
            }
        });

        results.push(returnRecord);
      }
      return results;
    });

    return NextResponse.json({ status: "ok", data: returnResults });

  } catch (error) {
    console.error("Error processing sales return:", error);
    return NextResponse.json({ status: "error", error: error.message || "Failed to process return." }, { status: 500 });
  }
}


