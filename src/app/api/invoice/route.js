import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get("invoice");
    
    if (!invoiceId) {
      return NextResponse.json({ status: "error", error: "Invoice ID is required." }, { status: 400 });
    }
    
    
    // 1. Fetch all sales records for the given invoice, including the customer details
    const sales = await prisma.sales.findMany({
      where: { invoice: invoiceId },
      include: {
        customers: true, // This fetches the related customer data
      },
    });
    
    if (sales.length === 0) {
      return NextResponse.json({ status: "error", error: "Invoice not found." }, { status: 404 });
    }
    
    
    // 2. Fetch any special discount associated with this invoice
    const specialDiscount = await prisma.specialDiscount.findFirst({
      where: { invoice: invoiceId },
    });
   // due
    const due = await prisma.dueList.aggregate({
      where: { invoice: invoiceId },
      _sum:{
        amount:true
      }
    });
    const dueAmount = due._sum.amount
   // cash
    const cash = await prisma.collectPayment.aggregate({
      where: { invoice: invoiceId },
      _sum:{
        amount:true
      }
    });
    const cashAmount = cash._sum.amount

    const customer = sales[0].customers;

    // 3. Calculate totals
    const subTotal = sales.reduce((acc, item) => acc + item.discountedPrice, 0);
    const totalDiscount = sales.reduce((acc, item) => acc + (item.totalPrice - item.discountedPrice), 0);
    const specialDiscountAmount = specialDiscount?.amount || 0;
    const grandTotal = subTotal - specialDiscountAmount;

 
    // 4. Format the data to match your InvoiceDetails component's expected structure
    const invoiceData = {
      invoiceNo: sales[0].invoice,
      date: sales[0].created_at,
      paymentStatus: sales[0].paymentStatus,
      billingAddress: {
        name: customer.name,
        address: customer.address,
        phone: customer.phone,
        taxNo: "N/A", // You can add this field to your customer model if needed
      },
      shippingAddress: { // Assuming billing and shipping are the same
        name: customer.name,
        address: customer.address,
        phone: customer.phone,
      },
      
      products: sales.map(sale => ({
        id: sale.productId,
        name: sale.productName,
        discount:sale.discount||0,
        description: sale.subCategory || '',
        discountedPrice: sale.discountedPrice ||0, // Calculate the per-item rate
        quantity: sale.category === "FEED" ? sale.totalpacket :sale.quantity,
      })),

      subTotal: subTotal,
      discount: totalDiscount,
      specialDiscount: specialDiscountAmount,
      totalAmount: grandTotal,
      cash: cashAmount ||0,
      due:dueAmount ||0
    };

    return NextResponse.json({ status: "ok", data: invoiceData });

  } catch (error) {
    console.error("Invoice API error:", error.message);
    return NextResponse.json({
      status: "error",
      error: "An internal server error occurred."
    }, { status: 500 });
  }
}