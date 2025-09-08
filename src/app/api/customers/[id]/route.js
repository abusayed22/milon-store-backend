import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(req, { params }) {
  try {
    // --- Security: Verify the user's token ---
    // const authHeader = req.headers.get("authorization");
    // if (!authHeader || !authHeader.startsWith("Bearer ")) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }
    // const token = authHeader.split(" ")[1];
    // // const decoded = verifyJwt(token);
    // if (!decoded) {
    //   return NextResponse.json(
    //     { error: "Unauthorized: Invalid token" },
    //     { status: 401 }
    //   );
    // }
    // -----------------------------------------

    const { id } = await params; // Get the customer ID from the URL
const customerId = parseInt(id);


    if (isNaN(customerId)) {
      return NextResponse.json(
        { error: "Invalid customer ID format. Must be a number." },
        { status: 400 }
      );
    }
    // ----------------------

    const customer = await prisma.customers.findUnique({
      where: {
        id: customerId, // Use the validated, parsed ID
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ status: "ok", data: customer });
  } catch (error) {
    console.error("Error fetching customer:", error.message);
    return NextResponse.json(
      { error: "Failed to retrieve customer." },
      { status: 500 }
    );
  }
}
