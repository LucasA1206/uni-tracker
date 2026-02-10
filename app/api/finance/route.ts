import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.financeProfile.findUnique({
    where: { userId: auth.userId },
  });

  if (!profile) {
    const created = await prisma.financeProfile.create({
      data: {
        userId: auth.userId,
      },
    });
    return NextResponse.json(created);
  }

  return NextResponse.json(profile);
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const {
    savingsBalance,
    spendingBalance,
    investingCashBalance,
    savingPercent,
    spendingPercent,
    investingPercent,
    savingsInterestRatePA,
    investingCashBalanceUsd,
  } = body as {
    savingsBalance?: number;
    spendingBalance?: number;
    investingCashBalance?: number;
    savingPercent?: number;
    spendingPercent?: number;
    investingPercent?: number;
    savingsInterestRatePA?: number;
    investingCashBalanceUsd?: number;
  };

  const data: Record<string, number> = {};
  if (typeof savingsBalance === "number" && savingsBalance >= 0) data.savingsBalance = savingsBalance;
  if (typeof spendingBalance === "number" && spendingBalance >= 0) data.spendingBalance = spendingBalance;
  if (typeof investingCashBalance === "number" && investingCashBalance >= 0)
    data.investingCashBalance = investingCashBalance;
  if (typeof savingPercent === "number" && savingPercent >= 0 && savingPercent <= 100)
    data.savingPercent = savingPercent;
  if (typeof spendingPercent === "number" && spendingPercent >= 0 && spendingPercent <= 100)
    data.spendingPercent = spendingPercent;
  if (typeof investingPercent === "number" && investingPercent >= 0 && investingPercent <= 100)
    data.investingPercent = investingPercent;
  if (typeof savingsInterestRatePA === "number" && savingsInterestRatePA >= 0)
    data.savingsInterestRatePA = savingsInterestRatePA;
  if (typeof investingCashBalanceUsd === "number" && investingCashBalanceUsd >= 0)
    data.investingCashBalanceUsd = investingCashBalanceUsd;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const profile = await prisma.financeProfile.upsert({
    where: { userId: auth.userId },
    create: { userId: auth.userId, ...data },
    update: data,
  });

  return NextResponse.json(profile);
}
