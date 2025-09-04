import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import crypto from 'crypto';
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token and new password are required." }, { status: 400 });
    }
    if (password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    // 1. Hash the incoming token to match the one in the database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Find the user by the hashed token and check if it has expired
    const user = await prisma.user.findUnique({
      where: {
        passwordResetToken: hashedToken,
        passwordResetTokenExpiresAt: {
          gt: new Date(), 
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired password reset token." }, { status: 400 });
    }

    // 3. Hash the new password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Update the user's password and clear the reset token fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
      },
    });

    return NextResponse.json({ status: "ok", message: "Password has been reset successfully." });

  } catch (error) {
    console.error("Reset Password API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
