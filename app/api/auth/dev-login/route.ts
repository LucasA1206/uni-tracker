
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req: NextRequest) {
    // Ensure this runs only in dev mode
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
            { error: "Not allowed in production" },
            { status: 403 }
        );
    }

    if (!JWT_SECRET) {
        // If not set, usually auth fails anyway, but let's be explicit
        return NextResponse.json(
            { error: "Server misconfigured: JWT_SECRET is not set" },
            { status: 500 }
        );
    }

    try {
        // 1. Find ANY user (e.g. the first one) to log in as
        let user = await prisma.user.findFirst();

        // 2. If no user exists, create a dummy dev user
        if (!user) {
            console.log("No users found. Creating DevUser...");
            user = await prisma.user.create({
                data: {
                    username: "DevUser",
                    passwordHash: "$2a$10$abcdefgThisIsAFakeHashForDevOnly",
                    role: "admin",
                    name: "Dev User",
                },
            });
        }

        // 3. Generate token
        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        // 4. Set cookie
        const res = NextResponse.json({ success: true, user });
        res.cookies.set("auth-token", token, {
            httpOnly: true,
            secure: false, // Dev is usually http
            maxAge: 7 * 24 * 60 * 60,
            path: "/",
        });

        return res;
    } catch (error: any) {
        console.error("Dev login error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
