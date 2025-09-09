import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    // --- FIX 1: Add a guard clause for the request body ---
    // First, check if the request even has a body before trying to parse it.
    if (!req.body) {
        return NextResponse.json({ error: "Request body is missing." }, { status: 400 });
    }
    const body = await req.json();
    const { email, password } = body;
    // ----------------------------------------------------

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });


    if (!user || !(await bcrypt.compare(password, user.password))) {
        return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }


     if (user.status !== 'ACTIVE' ) {
      return NextResponse.json(
        { error: "Your account is pending approval by an administrator." },
        { status: 403 } // 403 Forbidden is the correct status code here
      );
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return NextResponse.json({
      status: "ok",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    // --- FIX 2: Make the error logging safer ---
    // This handles cases where the 'error' object might be null or not have a 'message'.
    console.error("Login API error:", error?.message || error);
    
    // Add specific handling for JSON parsing errors
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
    }
    // -------------------------------------------
    
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}