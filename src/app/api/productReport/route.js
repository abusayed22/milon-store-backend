import { localDate } from "@/lib/dateTime";
import { PrismaClient } from "@prisma/client";
import { DateTime } from "luxon";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

const getStockSummaryWithDateFilter = async (startDate, endDate) => {
  // Get product history within date range with aggregation
  const stockHistory = await prisma.productHistory.groupBy({
    by: ["productId"],
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
        in: stockHistory.map((item) => item.productId),
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
  const summary = productDetails.map((product) => {
    const history = stockHistory.find((item) => item.productId === product.id);

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
      return DateTime.fromFormat(dateString, "yyMMdd", { zone: timeZone });
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
      transfersUpToDate,
    ] = await Promise.all([
      prisma.products.findMany({
        select: { id: true, name: true, category: true, subCategory: true },
      }),
      // Previous Stock Queries
      prisma.productHistory.groupBy({
        by: ["productId"],
        where: upToStartDateFilter,
        _sum: { quantity: true, totalpacket: true },
      }),
      prisma.sales.groupBy({
        by: ["productId"],
        where: upToStartDateFilter,
        _sum: { quantity: true, totalpacket: true },
      }),
      prisma.productTransferList.groupBy({
        by: ["productId"],
        where: upToStartDateFilter,
        _sum: { quantity: true, totalpacket: true },
      }),
      // Period Queries
      prisma.productHistory.groupBy({
        by: ["productId"],
        where: dateRangeFilter,
        _sum: { quantity: true, totalpacket: true },
      }),
      prisma.sales.groupBy({
        by: ["productId"],
        where: dateRangeFilter,
        _sum: { quantity: true, totalpacket: true },
      }),
      prisma.productTransferList.groupBy({
        by: ["productId"],
        where: dateRangeFilter,
        _sum: { quantity: true, totalpacket: true },
      }),
      // Closing Stock Queries
      prisma.productHistory.groupBy({
        by: ["productId"],
        where: upToDateFilter,
        _sum: { quantity: true, totalpacket: true },
      }),
      prisma.sales.groupBy({
        by: ["productId"],
        where: upToDateFilter,
        _sum: { quantity: true, totalpacket: true },
      }),
      prisma.productTransferList.groupBy({
        by: ["productId"],
        where: upToDateFilter,
        _sum: { quantity: true, totalpacket: true },
      }),
    ]);

    // --- 2. PROCESS AND CALCULATE THE REPORT FOR EACH PRODUCT ---
    const reportData = allProducts.map((product) => {
      const isFeed = product.category === "FEED";

      // Helper function to find and sum quantities
      const getSum = (dataArray, productId) => {
        const item =
          dataArray.find((d) => d.productId === productId)?._sum || {};
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
      const periodStock = addedQty - soldQty - transferredQty;
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
        // periodStock,
        added: addedQty,
        sold: soldQty,
        transferred: transferredQty,
        closingStock: closingStock,
      };
    });

    reportData.sort((a, b) => a.productName.localeCompare(b.productName));

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
    return NextResponse.json(
      {
        status: "error",
        error: "Failed to generate stock report.",
      },
      { status: 500 }
    );
  }
}
