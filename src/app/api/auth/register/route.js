import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { name, email, password } = await req.json();

    // --- 1. Validation ---
    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    // --- 2. Check if user already exists ---
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 }); // 409 Conflict
    }

    // --- 3. Hash the password (CRITICAL for security) ---
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

    // --- 4. Create the new user in the database ---
    const newUser = await prisma.user.create({
      data: {
        name:name.toLowerCase(),
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'SALESPERSON', 
        status:"PENDING"
      },
    });
    console.log(newUser)

    // Don't send the password back in the response
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json({
      status: "ok",
      message: "User registered successfully.",
      user: userWithoutPassword,
    }, { status: 201 }); // 201 Created

  } catch (error) {
    console.error("Registration API error:", error);
    return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
  }
}