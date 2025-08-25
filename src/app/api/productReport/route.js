import { localDate } from "@/lib/dateTime";
import { PrismaClient } from "@prisma/client";
import { DateTime } from "luxon";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();


const getStockSummaryWithDateFilter = async (startDate, endDate) => {
  // Get product history within date range with aggregation
  const stockHistory = await prisma.productHistory.groupBy({
    by: ['productId'],
    where: {
      created_at: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: {
      quantity: true,
      totalpacket: true,
    },
    _count: {
      id: true,
    },
  });

  // Get product details
  const productDetails = await prisma.products.findMany({
    where: {
      id: {
        in: stockHistory.map(item => item.productId),
      },
      stock: true,
    },
    select: {
      id: true,
      name: true,
      category: true,
      subCategory: true,
    },
  });

  // Combine data
  const summary = productDetails.map(product => {
    const history = stockHistory.find(item => item.productId === product.id);
    
    return {
      productId: product.id,
      productName: product.name,
      category: product.category,
      subCategory: product.subCategory,
      totalQuantityChange: parseFloat(history?._sum.quantity || 0),
      totalPacketChange: parseFloat(history?._sum.totalpacket || 0),
      numberOfChanges: history?._count.id || 0,
    };
  });

  return summary;
};



// get all sub-category by category
// export async function GET(req, res) {
//   try {
//     // Add CORS headers
//     const headers = {
//       "Access-Control-Allow-Origin": "*", // Replace '*' with your frontend domain in production
//       "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
//       "Access-Control-Allow-Headers": "Content-Type, Authorization",
//     };

//     // Handle OPTIONS preflight request
//     if (req.method === "OPTIONS") {
//       return new Response(null, { status: 204, headers });
//     }

//     // get value from url
//     const url = new URL(req.url);
//     const startDate = url.searchParams.get("startDate");
//     const endDate = url.searchParams.get("endDate");
//     const current = url.searchParams.get("page");
//     const pageSize = url.searchParams.get("pageSize");
//     const page = Number(current);
//     const limit = Number(pageSize);

//     // ✅ Parse Compact Date (e.g., '241223' → '2024-12-23')
//     const parseCompactDate = (compactDate) => {
//       if (!compactDate || compactDate.length !== 6) return null;

//       const year = 2000 + parseInt(compactDate.slice(0, 2), 10); // '24' → 2024
//       const month = parseInt(compactDate.slice(2, 4), 10) - 1; // '12' → 11 (zero-based)
//       const day = parseInt(compactDate.slice(4, 6), 10); // '28' → 28

//       // Start of the day (00:00:00.000 UTC)
//       const localDate = new Date(year, month, day); // Local date
//       return new Date(
//         Date.UTC(
//           localDate.getFullYear(),
//           localDate.getMonth(),
//           localDate.getDate()
//         )
//       );
//     };

//     // Parse Dates
//     const start = parseCompactDate(startDate);
//     let end = parseCompactDate(endDate);

//     if (end) {
//       end = new Date(
//         Date.UTC(
//           end.getUTCFullYear(),
//           end.getUTCMonth(),
//           end.getUTCDate(),
//           23,
//           59,
//           59,
//           999
//         )
//       );
//     }

//     // 1️⃣ Fetch Product History Data for Date Range
//     const productHistory = await prisma.productHistory.findMany({
//       where: {
//         created_at: {
//           gte: start?.toISOString(),
//           lte: end?.toISOString(),
//         },
//       },
//       include: {
//         product: true,
//       },
//       orderBy: {
//         created_at: "desc",
//       },
//     });
//     // console.log(productHistory)
 

//     const currentStock = await prisma.products.findMany({
//       where: {
//         stock: true,
//       },
//       select: {
//         id: true,
//         name: true,
//         category: true,
//         subCategory: true,
//         quantity: true,
//         totalpacket: true,
//         unitPrice: true,
//         stock: true,
//       },
//     });

//     // calculate summary report
//     const totalproductsSummary = await Promise.all(
//       currentStock.map(async (product) => {
//         // Filter the history entries for this specific product
//         const historyEntriesForProduct = productHistory.filter((history) => {
//           return history.productId === product.id;
//         });

//         // console.log(historyEntriesForProduct)
//         // Fetch the product with product id for its sales calculation
//         const saleProductQuntity = await prisma.sales.aggregate({
//           where: {
//             productId: parseInt(product.id),
//             created_at: {
//               gte: start?.toISOString(), // Start of day in UTC
//               lte: end?.toISOString(), // End of day in UTC
//             },
//           },
//           _sum: {
//             quantity: true,
//             totalpacket: true,
//           },
//         });
//         const totalSalePacket = parseFloat( saleProductQuntity._sum.totalpacket || 0);
//         const totalSaleQty = parseFloat(saleProductQuntity._sum.quantity || 0);

//         const transferProductQuntity = await prisma.productTransferList.aggregate({
//           where: {
//             productId: parseInt(product.id),
//             created_at: {
//               gte: start?.toISOString(), // Start of day in UTC
//               lte: end?.toISOString(), // End of day in UTC
//             },
//           },
//           _sum: {
//             quantity: true,
//             totalpacket: true,
//           },
//         });
//         const totalTransferPacket = parseFloat(transferProductQuntity._sum.totalpacket || 0);
//         const totalTransferQty = parseFloat(transferProductQuntity._sum.quantity || 0);

  
//         // total product stock by date
//         const dateByStock = await prisma.products.aggregate({
//           where: {
//             id: parseInt(product.id),
//             updated_at: {
//               gte: start?.toISOString(), // Start of day in UTC
//               lte: end?.toISOString(), // End of day in UTC
//             },
//           },
//           _sum: {
//             quantity: true,
//             totalpacket: true,
//           },
//         });
//         const totalStockPacket = parseFloat(dateByStock._sum.totalpacket || 0);
//         const totalStockQty = parseFloat(dateByStock._sum.quantity || 0);
      

//         // Calculate the total packets added for this specific product
//         const totalAddPacket = historyEntriesForProduct.reduce((sum, entry) => {
//           const totalpacketValue = parseFloat(entry.totalpacket);
//           const totalQuantityValue = parseFloat(entry.quantity);

//           // Check feed and other
//           if (product.category === "FEED") {
//             if (
//               typeof totalpacketValue !== "number" ||
//               isNaN(totalpacketValue)
//             ) {
//               return sum;
//             }
//             return sum + totalpacketValue;
//           } else {
//             // Check if quantity is a valid number
//             if (
//               typeof totalQuantityValue !== "number" ||
//               isNaN(totalQuantityValue)
//             ) {
//               return sum;
//             }
//             return sum + totalQuantityValue;
//           }
//         }, 0);


//         // Optional: Calculate other values like total quantity, total stock, etc.
//         const totalAddProductQty = historyEntriesForProduct.reduce(
//           (sum, entry) => sum + (entry.quantity || 0),
//           0
//         );

//         return {
//           productName: product.name,
//           category: product.category,
//           subCategory: product.subCategory || "null",
//           totalAddPacket,
//           totalStockPacket: await getStockSummaryWithDateFilter(start,end),
//           totalStockQty,
//           totalSalePacket,
//           totalAddProductQty,
//           totalSaleQty,
//           // valueStock,
//           totalTransferPacket,
//           totalTransferQty
//           // salePacket,
//           // saleQty,
//         };
//       })
//     );

//     const productSummary = totalproductsSummary.slice(
//       (page - 1) * limit,
//       page * limit
//     );

//     const summaryRecords = totalproductsSummary.length;
//     const totalPage = Math.ceil(summaryRecords / limit);

//     return NextResponse.json({ status: "ok", data: productSummary, totalPage });
//   } catch (error) {
//     console.error("API error:", error.message);
//     return NextResponse.json({
//       status: 501,
//       error: "Failed to get Sales-Report!",
//     });
//   }
// }




// export async function GET(req, res) {
//   try {
//     // Add CORS headers
//     const headers = {
//       "Access-Control-Allow-Origin": "*", // Replace '*' with your frontend domain in production
//       "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
//       "Access-Control-Allow-Headers": "Content-Type, Authorization",
//     };

//     // Handle OPTIONS preflight request
//     if (req.method === "OPTIONS") {
//       return new Response(null, { status: 204, headers });
//     }

//     // get value from url
//     const url = new URL(req.url);
//     const startDate = url.searchParams.get("startDate");
//     const endDate = url.searchParams.get("endDate");
//     const current = url.searchParams.get("page");
//     const pageSize = url.searchParams.get("pageSize");
//     const page = Number(current);
//     const limit = Number(pageSize);

//     // ✅ Parse Compact Date (e.g., '241223' → '2024-12-23')
//     const parseCompactDate = (compactDate) => {
//       if (!compactDate || compactDate.length !== 6) return null;

//       const year = 2000 + parseInt(compactDate.slice(0, 2), 10); // '24' → 2024
//       const month = parseInt(compactDate.slice(2, 4), 10) - 1; // '12' → 11 (zero-based)
//       const day = parseInt(compactDate.slice(4, 6), 10); // '28' → 28

//       // Start of the day (00:00:00.000 UTC)
//       const localDate = new Date(year, month, day); // Local date
//       return new Date(
//         Date.UTC(
//           localDate.getFullYear(),
//           localDate.getMonth(),
//           localDate.getDate()
//         )
//       );
//     };

//     // Parse Dates
//     const start = parseCompactDate(startDate);
//     let end = parseCompactDate(endDate);

//     if (end) {
//       end = new Date(
//         Date.UTC(
//           end.getUTCFullYear(),
//           end.getUTCMonth(),
//           end.getUTCDate(),
//           23,
//           59,
//           59,
//           999
//         )
//       );
//     }

//     // 1️⃣ Fetch Product History Data for Date Range
//     const productHistory = await prisma.productHistory.findMany({
//       where: {
//         created_at: {
//           gte: start?.toISOString(),
//           lte: end?.toISOString(),
//         },
//       },
//       include: {
//         product: true,
//       },
//       orderBy: {
//         created_at: "desc",
//       },
//     });


//     //  Fetch previously Product History Data for Date Range
//     // const previousProductHistory = await prisma.productHistory.findMany({
//     //   where: {
//     //     created_at: {
//     //       lt: startOfDay.toISOString(),
//     //     },
//     //   },
//     //   include: {
//     //     product: true,
//     //   },
//     //   orderBy: {
//     //     created_at: "desc",
//     //   },
//     // });

//     const currentStock = await prisma.products.findMany({
//       where: {
//         stock: true,
//         // updated_at: {
//         //    gte:start,
//         //   lte:end}
//       },
//       select: {
//         id: true,
//         name: true,
//         category: true,
//         subCategory: true,
//         quantity: true,
//         totalpacket: true,
//         unitPrice: true,
//         stock: true,
//       },
//     });
    


//     // calculate summary report
//     const totalproductsSummary = await Promise.all(
//       currentStock.map(async (product) => {
//         // Filter the history entries for this specific product
//         const historyEntriesForProduct = productHistory.filter((history) => {
//           return history.productId === product.id;
//         });
        
//         // console.log("historyEntry ",historyEntriesForProduct)
//         // Filter the previously history entries for this specific product
//         // const previouslyHistoryEntriesForProduct = productHistory.filter((history) => {
//         //   return history.productId === product.id;
//         // });

//         // console.log(historyEntriesForProduct)
//         // Fetch the product with product id for its sales calculation
//         const saleProductQuntity = await prisma.sales.aggregate({
//           where: {
//             productId: parseInt(product.id),
//             created_at: {
//               gte: start?.toISOString(), // Start of day in UTC
//               lte: end?.toISOString(), // End of day in UTC
//             },
//           },
//           _sum: {
//             quantity: true,
//             totalpacket: true,
//           },
//         });
//         const totalSalePacket = parseFloat( saleProductQuntity._sum.totalpacket || 0);
//         const totalSaleQty = parseFloat(saleProductQuntity._sum.quantity || 0);
        
//         // Fetch the Previously product with product id for its sales calculation
//         const perviouslySaleProductQuntity = await prisma.sales.aggregate({
//           where: {
//             productId: parseInt(product.id),
//             created_at: {
//               lt:start.toISOString()
//               // gte: start?.toISOString(), // Start of day in UTC
//               // lte: end?.toISOString(), // End of day in UTC
//             },
//           },
//           _sum: {
//             quantity: true,
//             totalpacket: true,
//           },
//         });
//         const previousTotalSalePacket = parseFloat( perviouslySaleProductQuntity._sum.totalpacket || 0);
//         const previouslyTotalSaleQty = parseFloat(perviouslySaleProductQuntity._sum.quantity || 0);

//         // Transfer product
//         const transferProductQuntity = await prisma.productTransferList.aggregate({
//           where: {
//             productId: parseInt(product.id),
//             created_at: {
//               gte: start?.toISOString(), // Start of day in UTC
//               lte: end?.toISOString(), // End of day in UTC
//             },
//           },
//           _sum: {
//             quantity: true,
//             totalpacket: true,
//           },
//         });
//         const totalTransferPacket = parseFloat(transferProductQuntity._sum.totalpacket || 0);
//         const totalTransferQty = parseFloat(transferProductQuntity._sum.quantity || 0);
        
//         // Previously transfer products
//         const previouslyTransferProductQuntity = await prisma.productTransferList.aggregate({
//           where: {
//             productId: parseInt(product.id),
//             created_at: {
//               lt:start.toISOString()
//               // gte: start?.toISOString(), // Start of day in UTC
//               // lte: end?.toISOString(), // End of day in UTC
//             },
//           },
//           _sum: {
//             quantity: true,
//             totalpacket: true,
//           },
//         });
//         const previouslyTotalTransferPacket = parseFloat(previouslyTransferProductQuntity._sum.totalpacket || 0);
//         const previouslyTotalTransferQty = parseFloat(previouslyTransferProductQuntity._sum.quantity || 0);


//     // total product stock by date
//         const dateByStock = await prisma.products.aggregate({
//           where: {
//             id: parseInt(product.id),
//             updated_at: {
//               // gte: start?.toISOString(), // Start of day in UTC
//               // lte: end?.toISOString(), // End of day in UTC
//             },
//           },
//           _sum: {
//             quantity: true,
//             totalpacket: true,
//           },
//         });
//         const totalStockPacket = parseFloat(dateByStock._sum.totalpacket || 0);
//         const totalStockQty = parseFloat(dateByStock._sum.quantity || 0);

//         // previus product history
//         const previuslyProductHistory = await prisma.productHistory.aggregate({
//           where: {
//             id: parseInt(product.id),
//             created_at: {
//               // gte: end?.toISOString(), // Start of day in UTC
//               // lte: start?.toISOString(), // End of day in UTC
//               lt:new Date('2025-08-24')
//               // lt:start.toISOString()
//             },
//           },
//           _sum: {
//             quantity: true,
//             totalpacket: true,
//           },
//         });
//         const totalPrevStockPacket = parseFloat(previuslyProductHistory._sum.totalpacket || 0);
//         const totalPrevStockQty = parseFloat(previuslyProductHistory._sum.quantity || 0);
      

//         // Calculate the total packets added for this specific product
//         const totalAddPacket = historyEntriesForProduct.reduce((sum, entry) => {
//           const totalpacketValue = parseFloat(entry.totalpacket);
//           const totalQuantityValue = parseFloat(entry.quantity);

//           // Check feed and other
//           if (product.category === "FEED") {
//             if (
//               typeof totalpacketValue !== "number" ||
//               isNaN(totalpacketValue)
//             ) {
//               return sum;
//             }
//             return sum + totalpacketValue;
//           } else {
//             // Check if quantity is a valid number
//             if (
//               typeof totalQuantityValue !== "number" ||
//               isNaN(totalQuantityValue)
//             ) {
//               return sum;
//             }
//             return sum + totalQuantityValue;
//           }
//         }, 0);


//         // Optional: Calculate other values like total quantity, total stock, etc.
//         const totalAddProductQty = historyEntriesForProduct.reduce(
//           (sum, entry) => sum + (entry.quantity || 0),
//           0
//         );
        
//         // Previously total add product packet calculation
//         // const PreviouslyTotalAddPacket = historyEntriesForProduct.reduce((sum, entry) => {
//         //   const totalpacketValue = parseFloat(entry.totalpacket);
//         //   const totalQuantityValue = parseFloat(entry.quantity);

//         //   // Check feed and other
//         //   if (product.category === "FEED") {
//         //     if (
//         //       typeof totalpacketValue !== "number" ||
//         //       isNaN(totalpacketValue)
//         //     ) {
//         //       return sum;
//         //     }
//         //     return sum + totalpacketValue;
//         //   } else {
//         //     // Check if quantity is a valid number
//         //     if (
//         //       typeof totalQuantityValue !== "number" ||
//         //       isNaN(totalQuantityValue)
//         //     ) {
//         //       return sum;
//         //     }
//         //     return sum + totalQuantityValue;
//         //   }
//         // }, 0);


//         // Optional: Previously Calculate other values like total quantity, total stock, etc.
//         // const previouslyTotalAddProductQty = previouslyHistoryEntriesForProduct.reduce(
//         //   (sum, entry) => sum + (entry.quantity || 0),
//         //   0
//         // );
//         // console.log(`paket:${totalAddPacket} qty:${totalAddProductQty}`)
//         console.log(`${product.name} :`,totalPrevStockPacket ,totalPrevStockQty, `prevSale: ${previousTotalSalePacket} || prevTrasnfer:${previouslyTotalTransferPacket}`)


//         return {
//           productName: product.name,
//           category: product.category,
//           subCategory: product.subCategory || "null",
//           totalAddPacket,
//           totalStockPacket,
//           totalStockQty,
//           totalSalePacket,
//           totalAddProductQty,
//           totalSaleQty,
//           // valueStock,
//           totalTransferPacket,
//           totalTransferQty,
//           // salePacket,
//           // saleQty,
//           currentStockPacket: totalStockPacket,
//           currentStockQty: totalStockQty,
//           // previously stock
//           prevStockPacket: (totalPrevStockPacket)-(previousTotalSalePacket +previouslyTotalTransferPacket) ,
//           prevStockQty: (totalPrevStockQty)-(previouslyTotalSaleQty +previouslyTotalTransferQty),

//           stockPacket: (totalAddPacket) - (totalSalePacket+totalTransferPacket),
//           // stockQty: 
//         };
//       })
//     );

//     const productSummary = totalproductsSummary.slice(
//       (page - 1) * limit,
//       page * limit
//     );

//     const summaryRecords = totalproductsSummary.length;
//     const totalPage = Math.ceil(summaryRecords / limit);

//     return NextResponse.json({ status: "ok", data: productSummary, totalPage });
//   } catch (error) {
//     console.error("API error:", error.message);
//     return NextResponse.json({
//       status: 501,
//       error: "Failed to get Sales-Report!",
//     });
//   }
// }


export async function GET(req) {
  try {
    const url = new URL(req.url);
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("pageSize")) || 10;

    const timeZone = "Asia/Dhaka";
    let gte, lte;


 // --- ROBUST DATE PARSING ---
const parseDate = (dateString) => {
      if (!dateString || dateString.length !== 6) return null;
      // Use fromFormat to explicitly tell Luxon the expected format is "yyMMdd"
      return DateTime.fromFormat(dateString, 'yyMMdd', { zone: timeZone });
    };

    const startDt = parseDate(startDateParam);
    const endDt = parseDate(endDateParam);

    if (startDt && startDt.isValid && endDt && endDt.isValid) {
      gte = startDt.startOf("day").toJSDate();
      lte = endDt.endOf("day").toJSDate();
    } else {
      // Default to the current day if params are missing or invalid
      const nowInDhaka = DateTime.now().setZone(timeZone);
      gte = nowInDhaka.startOf("day").toJSDate();
      lte = nowInDhaka.endOf("day").toJSDate();
    }


    // --- DEFINE ALL NECESSARY DATE FILTERS ---
    // 1. For transactions BEFORE the start date (to calculate previous stock)
    const upToStartDateFilter = { created_at: { lt: gte } }; // lt = less than
    // 2. For transactions WITHIN the selected date range
    const dateRangeFilter = { created_at: { gte, lte } };
    // 3. For all transactions UP TO the end of the selected date (to calculate closing stock)
    const upToDateFilter = { created_at: { lte } };

    // --- 1. FETCH ALL DATA EFFICIENTLY IN PARALLEL ---
    const [
      allProducts,
      // Data for Previous Stock
      additionsUpToStart,
      salesUpToStart,
      transfersUpToStart,
      // Data for the Selected Period
      additionsInPeriod,
      salesInPeriod,
      transfersInPeriod,
      // Data for Closing Stock
      additionsUpToDate,
      salesUpToDate,
      transfersUpToDate
    ] = await Promise.all([
      prisma.products.findMany({ select: { id: true, name: true, category: true, subCategory: true } }),
      // Previous Stock Queries
      prisma.productHistory.groupBy({ by: ['productId'], where: upToStartDateFilter, _sum: { quantity: true, totalpacket: true } }),
      prisma.sales.groupBy({ by: ['productId'], where: upToStartDateFilter, _sum: { quantity: true, totalpacket: true } }),
      prisma.productTransferList.groupBy({ by: ['productId'], where: upToStartDateFilter, _sum: { quantity: true, totalpacket: true } }),
      // Period Queries
      prisma.productHistory.groupBy({ by: ['productId'], where: dateRangeFilter, _sum: { quantity: true, totalpacket: true } }),
      prisma.sales.groupBy({ by: ['productId'], where: dateRangeFilter, _sum: { quantity: true, totalpacket: true } }),
      prisma.productTransferList.groupBy({ by: ['productId'], where: dateRangeFilter, _sum: { quantity: true, totalpacket: true } }),
      // Closing Stock Queries
      prisma.productHistory.groupBy({ by: ['productId'], where: upToDateFilter, _sum: { quantity: true, totalpacket: true } }),
      prisma.sales.groupBy({ by: ['productId'], where: upToDateFilter, _sum: { quantity: true, totalpacket: true } }),
      prisma.productTransferList.groupBy({ by: ['productId'], where: upToDateFilter, _sum: { quantity: true, totalpacket: true } }),
    ]);
    

    // --- 2. PROCESS AND CALCULATE THE REPORT FOR EACH PRODUCT ---
    const reportData = allProducts.map(product => {
      const isFeed = product.category === 'FEED';

      // Helper function to find and sum quantities
      const getSum = (dataArray, productId) => {
        const item = dataArray.find(d => d.productId === productId)?._sum || {};
        return (isFeed ? item.totalpacket : item.quantity) ?? 0;
      };

      // Calculate Previous Stock
      const prevAdded = getSum(additionsUpToStart, product.id);
      const prevSold = getSum(salesUpToStart, product.id);
      const prevTransferred = getSum(transfersUpToStart, product.id);
      const previousStock = prevAdded - prevSold - prevTransferred;

      // Calculate movements within the period
      const addedQty = getSum(additionsInPeriod, product.id);
      const soldQty = getSum(salesInPeriod, product.id);
      const transferredQty = getSum(transfersInPeriod, product.id);
      // console.log("addedQty ",addedQty)

      
      // Calculate Closing Stock
      const totalAdded = getSum(additionsUpToDate, product.id);
      const totalSold = getSum(salesUpToDate, product.id);
      const totalTransferred = getSum(transfersUpToDate, product.id);
      const closingStock = totalAdded - totalSold - totalTransferred;

      return {
        productName: product.name,
        category: product.category,
        subCategory: product.subCategory || "N/A",
        previousStock: previousStock,
        added: addedQty,
        sold: soldQty,
        transferred: transferredQty,
        closingStock: closingStock,
      };
    });

    // --- 3. APPLY PAGINATION ---
    const paginatedData = reportData.slice((page - 1) * limit, page * limit);
    const totalRecords = reportData.length;
    const totalPage = Math.ceil(totalRecords / limit);

    return NextResponse.json({
      status: "ok",
      data: paginatedData,
      totalPage,
      totalRecords,
    });

  } catch (error) {
    console.error("Stock Report API error:", error.message);
    return NextResponse.json({
      status: "error",
      error: "Failed to generate stock report.",
    }, { status: 500 });
  }
}


