import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const [sales, discount, expenses, 
       payment] =
      await prisma.$transaction([
        prisma.sales.aggregate({
          where: { paymentStatus: "paid" },
          _sum: { discountedPrice: true },
        }),
        prisma.specialDiscount.aggregate({
          where: {
            invoice: {
              in: (
                await prisma.sales.findMany({
                  where: { paymentStatus: "paid" },
                  select: { invoice: true },
                })
              ).map((i) => i.invoice),
            },
          },
          _sum: { amount: true },
        }),
        prisma.expneses.aggregate({ _sum: { amount: true } }),
        prisma.customerLoan.aggregate({ _sum: { amount: true } }),
        prisma.collectPayment.aggregate({ _sum: { amount: true } }),
      ]);
    const totalPaidSales =
      (sales._sum.discountedPrice ?? 0) - (discount._sum.amount ?? 0);
    const totalExpenses = expenses._sum.amount ?? 0;
    const totalLoan = loan._sum.amount ?? 0;
    const totalCollected = payment._sum.amount ?? 0;
    const availableCash =
      totalPaidSales + totalCollected - totalExpenses - totalLoan;
   

      return NextResponse.json({ status: "ok", availableCash });
  } catch (error) {
    console.error(
      `API Route Error for type "${type}" or date "${dateParam}":`,
      error.message
    );
    return NextResponse.json(
      { status: 500, error: "Failed to process request." },
      { status: 500 }
    );
  }
}
