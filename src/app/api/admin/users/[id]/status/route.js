import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { withRoleAuthorization } from "@/lib/authMiddleware"; // Your existing security middleware

const prisma = new PrismaClient();

const updateUserHandler = async (req, { params }) => {
  try {
    const { id } = params;
    const { name, role, status } = await req.json();

    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid User ID format." }, { status: 400 });
    }

    const dataToUpdate = {};
    if (name) dataToUpdate.name = name;
    if (role) dataToUpdate.role = role;
    if (status) dataToUpdate.status = status;

    if (Object.keys(dataToUpdate).length === 0) {
        return NextResponse.json({ error: "No update data provided." }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });
    
    // Don't send the password back
    const { password, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({
      status: "ok",
      message: "User updated successfully.",
      user: userWithoutPassword,
    });

  } catch (error) {
    console.error("Update User API error:", error);
    if (error.code === 'P2025') {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
};


// const updateUserStatusHandler = async (req, { params }) => {
//   try {
//     const { id } = params;
//     const { role } = await req.json();

//     // 1. Validate the input
//     if (!id || !role) {
//       return NextResponse.json({ error: "User ID and new role are required." }, { status: 400 });
//     }
//     if (role !== 'PENDING' && role !== 'SALESPERSON') {
//         return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
//     }

//     const userId = parseInt(id);
//     if (isNaN(userId)) {
//         return NextResponse.json({ error: "Invalid User ID format." }, { status: 400 });
//     }

//     // 2. Update the user's role in the database
//     const updatedUser = await prisma.user.update({
//       where: { id: userId },
//       data: { role: role },
//     });

//     return NextResponse.json({
//       status: "ok",
//       message: "User status updated successfully.",
//       user: updatedUser,
//     });

//   } catch (error) {
//     console.error("Update User Status API error:", error);
//     if (error.code === 'P2025') { // Prisma's code for "record not found"
//         return NextResponse.json({ error: "User not found." }, { status: 404 });
//     }
//     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
//   }
// };

// 3. Secure the route: Only users with the 'ADMIN' role can access it.
export const PATCH = withRoleAuthorization(['ADMIN'])(updateUserHandler);