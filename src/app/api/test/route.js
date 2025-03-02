import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { empty } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

function DiscountPrice(saleData) {
    return saleData.reduce((sum, item) => {
        return sum + (item.discountedPrice || 0); // Ensure there's no undefined or null value
    }, 0);
}

async function getSpecialDiscount(invoices) {
    const uniqueInvoices = invoices  // Extract invoice numbers
        .filter((value, index, self) => self.indexOf(value) === index); // Keep unique values
    let conditondata = uniqueInvoices;
    if (Array.isArray(conditondata) && conditondata.length === 0) {
        return 0;
    }
    const result = await prisma.specialDiscount.aggregate({
        _sum: {
            amount: true, // Sum the discountedPrice column
        },
        where: {
            invoice: {
                in: conditondata, // Replace with your list of invoice numbers
            },
        },
    });
    return result._sum.amount;
}

async function SpecialDiscount(saleData, stype = false) {
    const uniqueInvoices = saleData
        .map(item => item.invoice)  // Extract invoice numbers
        .filter((value, index, self) => self.indexOf(value) === index); // Keep unique values
    let conditondata = uniqueInvoices;

    if (stype == true) {
        conditondata = saleData;
    }

    if (Array.isArray(conditondata) && conditondata.length === 0) {
        return 0;
    }

    const result = await prisma.specialDiscount.aggregate({
        _sum: {
            amount: true, // Sum the discountedPrice column
        },
        where: {
            invoice: {
                in: conditondata, // Replace with your list of invoice numbers
            },
        },
    });
    return result._sum.amount;
}

// async function CashAmount(saleData) {
//     let paymentStatusSummary = saleData.reduce((acc, item) => {
//         if (item.paymentStatus === 'paid') {
//             acc.paid += item.discountedPrice;
//             acc.paidInvoices.push(item.invoice);
//         } else if (item.paymentStatus === 'partial') {
//             acc.partial += item.discountedPrice;
//             acc.partialInvoices.push(item.invoice);
//         }
//         return acc;
//     }, { paid: 0, partial: 0, paidInvoices: [], partialInvoices: [] });
//     const paidDiscountAmount = await SpecialDiscount(paymentStatusSummary.paidInvoices, true);
//     const partialInvoiceAmount = await SpecialDiscount(paymentStatusSummary.partialInvoices, true);

//     const formateData = {
//         paid: paymentStatusSummary.paid, partial: paymentStatusSummary.partial, paidInvoices: paidDiscountAmount, partialInvoices: partialInvoiceAmount
//     }
//     return formateData;
// }


// due amount calculation
async function DueAmount(sales) {
    const result = sales.reduce((acc, item) => {
        if (item.paymentStatus === "due") {
            acc.dueAmount += item.discountedPrice
            acc.dueInvoice.push(item.invoice)
        } else if (item.paymentStatus === "partial") {
            acc.partialInvoice.push(item.invoice)
        }
        return acc;
    }, { dueAmount: 0, dueInvoice: [], partialInvoice: [] });

    const dueSpecialDisount = await getSpecialDiscount(result.dueInvoice);
    const dueAmount = result.dueAmount - dueSpecialDisount;

    // partial due amount 
    const partialDue = await prisma.dueList.aggregate({
        where: {
            invoice: {
                in: result.partialInvoice
            }
        },
        _sum: {
            amount: true
        }
    })
    const partialDueAmount = partialDue._sum.amount;
    const finalDueAmount = partialDueAmount + dueAmount;
    return finalDueAmount;
}

// cash amount calculation
async function CashAmount(sales) {
    const result = sales.reduce((acc, item) => {
        if (item.paymentStatus === "paid") {
            acc.paidAmount += item.discountedPrice
            acc.paidInvoice.push(item.invoice)
        } else if (item.paymentStatus === "partial") {
            acc.partialInvoice.push(item.invoice)
        }
        return acc;
    }, { paidAmount: 0, paidInvoice: [], partialInvoice: [] });

    const paidSpecialDisount = await getSpecialDiscount(result.paidInvoice);
    const paidAmount = result.paidAmount - paidSpecialDisount;

    // partial paid amount 
    const partialPaid = await prisma.collectPayment.aggregate({
        where: {
            invoice: {
                in: result.partialInvoice
            }
        },
        _sum: {
            amount: true
        }
    })
    const partialPaidAmount = partialPaid._sum.amount;
    const finalPaidAmount = partialPaidAmount + paidAmount;
    return finalPaidAmount;
}


export async function GET(req, res) {
    const sales = await prisma.sales.findMany({
        where: {
            customer_id: parseInt(1),
        },
        orderBy: {
            created_at: "desc",
        },
    });
    let formatedData = Array();
    for (const item of sales) {
        const dateKey = new Date(item.created_at).toISOString().split("T")[0]; // Extract date in YYYY-MM-DD format
        if (!formatedData[dateKey]) {
            formatedData[dateKey] = [];
        }
        formatedData[dateKey].push(item);
    }

    let formatedDataArray = await Promise.all(Object.entries(formatedData).map(async ([dateKey, salesArray]) => ({
        date: dateKey,
        sale: (DiscountPrice(salesArray) - await SpecialDiscount(salesArray)),
        due: await DueAmount(salesArray),
        discountedPrice: DiscountPrice(salesArray),
        specialDiscount: await SpecialDiscount(salesArray),
        cash: await CashAmount(salesArray),
    })));
    console.log(formatedDataArray);
    return NextResponse.json({ formatedData });
}