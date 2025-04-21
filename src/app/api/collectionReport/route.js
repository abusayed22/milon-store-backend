import { PrismaClient } from "@prisma/client";
import { skip } from "@prisma/client/runtime/library";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// get all sub-category by category
export async function GET(req, res) {
    try {

        // get value from url
        const url = new URL(req.url);
        const startDate = url.searchParams.get("startDate");
        const endDate = url.searchParams.get("endDate");
        const current = url.searchParams.get("page");
        const pageSize = url.searchParams.get("pageSize");
        const page = Number(current);
        const limit = Number(pageSize);

        // ✅ Parse Compact Date (e.g., '241223' → '2024-12-23')
        const parseCompactDate = (compactDate) => {
            if (!compactDate || compactDate.length !== 6) return null;

            const year = 2000 + parseInt(compactDate.slice(0, 2), 10); // '24' → 2024
            const month = parseInt(compactDate.slice(2, 4), 10) - 1; // '12' → 11 (zero-based)
            const day = parseInt(compactDate.slice(4, 6), 10); // '28' → 28

            // Start of the day (00:00:00.000 UTC)
            const localDate = new Date(year, month, day); // Local date
            return new Date(
                Date.UTC(
                    localDate.getFullYear(),
                    localDate.getMonth(),
                    localDate.getDate()
                )
            );
        };

        // Parse Dates
        const start = parseCompactDate(startDate);
        let end = parseCompactDate(endDate);

        if (end) {
            end = new Date(
                Date.UTC(
                    end.getUTCFullYear(),
                    end.getUTCMonth(),
                    end.getUTCDate(),
                    23,
                    59,
                    59,
                    999
                )
            );
        }

        // fetch expense from the database with pagination
        const collectionQuery = {
            where: {
                created_at: {
                    gte: start || undefined,
                    lte: end || undefined
                }
            },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: {
                created_at: 'desc'
            },
            include:{
                customerName:{
                    select:{
                        name:true
                    }
                }
            }
        }
        const collections = await prisma.collectPayment.findMany(collectionQuery);

        // Count total expenses for pagination
        const totalCollections = await prisma.collectPayment.count({
            where: {
                created_at: {
                    gte: start ,
                    lte: end ,
                },
            },
        });

        const totalPage = Math.ceil(totalCollections / limit);




        return NextResponse.json({
            status: "ok",
            data: collections,
            totalPage,
            totalCollections,
        });
    } catch (error) {
        console.error("API error:", error.message);
        return NextResponse.json({
            status: 501,
            error: "Failed to get Sales-Report!",
        });
    }
}
