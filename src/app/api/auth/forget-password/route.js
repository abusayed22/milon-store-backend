import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import crypto from "crypto";
import nodemailer from "nodemailer";

// In a real app, you would use a service like Nodemailer, Resend, or SendGrid
const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password/${resetToken}`;
  const mailOptions = {
    from: '"milon-enterprise" <no-reply@yourapp.com>',
    to: email,
    subject: "Password Reset Request",
    html: `<p>You are receiving this email because you (or someone else) have requested the reset of the password for your account.</p>
             <p>Please click on the following link, or paste this into your browser to complete the process:</p>
             <p><a href="${resetUrl}">${resetUrl}</a></p>
             <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`,
  };

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });

  try {
    console.log("Attempting to send email...");
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully.");
  } catch (emailError) {
    console.error("NODEMAILER ERROR:", emailError);
    // Still return a generic error to the client for security
    return NextResponse.json(
      { error: "Failed to send password reset email." },
      { status: 500 }
    );
  }
};

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // For security, always return a success message, even if the user doesn't exist.
    // This prevents attackers from guessing which emails are registered.
    if (!user) {
      return NextResponse.json({
        status: "ok",
        message:
          "If an account with this email exists, a password reset link has been sent.",
      });
    }

    // 1. Generate a secure, random token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const tokenExpiration = new Date(Date.now() + 10 * 60 * 1000);

    // 4. Update the user record with the hashed token and expiration date
    await prisma.user.update({
      where: { email: user.email },
      data: {
        passwordResetToken: hashedToken,
        passwordResetTokenExpiresAt: tokenExpiration,
      },
    });

    // 5. Send the email with the PLAIN (unhashed) token
    await sendPasswordResetEmail(user.email, resetToken);

    return NextResponse.json({
      status: "ok",
      message:
        "If an account with this email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot Password API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
