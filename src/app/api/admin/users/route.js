

import { NextResponse } from "next/server";
import { withRoleAuthorization } from "@/lib/authMiddleware";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// This is the actual logic of your API
const getAllUsersHandler = async (req, { params }, user) => {
  try {
    const loggedInUserId = user?.userId;

    if (!loggedInUserId) {
        return NextResponse.json({ error: "Could not identify logged-in user." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const pageSize = parseInt(searchParams.get("pageSize")) || 10;
    const skip = (page - 1) * pageSize;

    // Get users with pagination and case-insensitive sorting
    const users = await prisma.user.findMany({
      where: {
        id: {
          not: parseInt(loggedInUserId),
        },
      },
      orderBy: {
        name: 'asc', // Prisma now supports case-insensitive sorting in some databases
      },
      skip: skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        // Include all fields except password
      },
    });

    // Get total count for pagination
    const totalUserCount = await prisma.user.count({
      where: {
        id: {
          not: parseInt(loggedInUserId),
        },
      },
    });

    const totalPage = Math.ceil(totalUserCount / pageSize);

    return NextResponse.json({
      status: "ok",
      data: users,
      pagination: {
        currentPage: page,
        pageSize: pageSize,
        totalPages: totalPage,
        totalRecords: totalUserCount,
      },
    });

  } catch (error) {
    console.error("Get Users API error:", error.message);
    return NextResponse.json({ error: "Failed to retrieve users." }, { status: 500 });
  }
};

// Here, we protect the route. Only users with the 'ADMIN' role can access it.
export const GET = withRoleAuthorization(['ADMIN'])(getAllUsersHandler);

