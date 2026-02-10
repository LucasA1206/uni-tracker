"use client";

import { useEffect, useState, useCallback, useMemo } from "react";

interface FinanceProfile {
  id: number;
  savingsBalance: number;
  spendingBalance: number;
  investingCashBalance: number;
  savingPercent: number;
  spendingPercent: number;
  investingPercent: number;
  savingsInterestRatePA: number;
}

interface FortnightData {
  currentPeriodStart: string;
  previousPeriodStart: string;
  currentAmount: number;
  previousAmount: number;
}

interface StockHolding {
  id: number;
  ticker: string;
  exchange: string | null;
  shares: number;
  averagePrice: number;
  currency: string;
}

interface QuoteData {
  price: number;
  priceAud: number;
  currency: string;
  name?: string;
}

function formatFortnightRange(periodStartIso: string): string {
  const start = new Date(periodStartIso);
  const end = new Date(start);
  end.setDate(end.getDate() + 13);
  return `${start.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} – ${end.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`;
}

function formatMoney(amount: number, currency: string = "AUD"): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Australian resident income tax rates (ATO) for 2025–26.
 * Assumes: resident for tax purposes, claims tax-free threshold.
 * Excludes: offsets, HELP/HECS, Medicare levy surcharge, private health, etc.
 */
function calcAusResidentIncomeTaxAnnual(taxableIncome: number): number {
  const x = Math.max(0, taxableIncome);
  if (x <= 18_200) return 0;
  if (x <= 45_000) return (x - 18_200) * 0.16;
  if (x <= 135_000) return 4_288 + (x - 45_000) * 0.30;
  if (x <= 190_000) return 31_288 + (x - 135_000) * 0.37;
  return 51_638 + (x - 190_000) * 0.45;
}

/**
 * Medicare levy (base) is 2% of taxable income, with a low-income reduction.
 * Low-income thresholds are indexed annually; these values are from ATO guidance
 * for 2024–25 (often very close year-to-year).
 */
function calcMedicareLevyAnnual(
  taxableIncome: number,
  applyLowIncomeReduction: boolean,
): number {
  const x = Math.max(0, taxableIncome);
  const base = 0.02 * x;
  if (!applyLowIncomeReduction) return base;

  const lower = 27_222; // single, not SAPTO
  if (x <= lower) return 0;

  // Reduction range: levy is 10% of income over lower threshold, capped at 2%.
  const reduced = 0.10 * (x - lower);
  return Math.min(base, reduced);
}

export default function FinanceTab() {
  const [profile, setProfile] = useState<FinanceProfile | null>(null);
  const [fortnight, setFortnight] = useState<FortnightData | null>(null);
  const [holdings, setHoldings] = useState<StockHolding[]>([]);
  const [quotes, setQuotes] = useState<Record<number, QuoteData>>({});
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [paycheckAmount, setPaycheckAmount] = useState("");
  const [prevFortnightSpend, setPrevFortnightSpend] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [hourlyWage, setHourlyWage] = useState("");
  const [applyMedicareLowIncomeReduction, setApplyMedicareLowIncomeReduction] = useState(true);
  const [addHoldingTicker, setAddHoldingTicker] = useState("");
  const [addHoldingShares, setAddHoldingShares] = useState("");
  const [addHoldingAvgPrice, setAddHoldingAvgPrice] = useState("");
  const [addHoldingCurrency, setAddHoldingCurrency] = useState<"AUD" | "USD">("AUD");
  const [addHoldingExchange, setAddHoldingExchange] = useState<"nasdaq" | "asx">("nasdaq");
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingHolding, setAddingHolding] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, fortnightRes, holdingsRes] = await Promise.all([
        fetch("/api/finance"),
        fetch("/api/finance/fortnight"),
        fetch("/api/finance/holdings"),
      ]);
      if (profileRes.ok) {
        const p = await profileRes.json();
        setProfile(p);
      }
      if (fortnightRes.ok) {
        const f = await fortnightRes.json();
        setFortnight(f);
      }
      if (holdingsRes.ok) {
        const h = await holdingsRes.json();
        setHoldings(h);
        setQuotes({});
      }
    } catch (err) {
      console.error("Failed to load finance data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const fetchQuotes = useCallback(async () => {
    if (holdings.length === 0) return;
    const next: Record<number, QuoteData> = {};
    for (const h of holdings) {
      try {
        const symbol = h.exchange === "ASX" || h.ticker.endsWith(".AX") ? `${h.ticker.replace(".AX", "")}.AX` : h.ticker;
        const res = await fetch(
          `/api/finance/quote?ticker=${encodeURIComponent(h.ticker.replace(/\.AX$/i, ""))}&exchange=${h.exchange?.toLowerCase() ?? "nasdaq"}`
        );
        if (res.ok) {
          const q = await res.json();
          next[h.id] = {
            price: q.price,
            priceAud: q.priceAud ?? q.price,
            currency: q.currency ?? "USD",
            name: q.name,
          };
        }
      } catch {
        // skip
      }
    }
    setQuotes((prev) => ({ ...prev, ...next }));
  }, [holdings]);

  useEffect(() => {
    if (holdings.length > 0) void fetchQuotes();
  }, [holdings, fetchQuotes]);

  const stocksValueAud = useMemo(() => {
    return holdings.reduce((sum, h) => {
      const q = quotes[h.id];
      if (!q) return sum;
      return sum + h.shares * q.priceAud;
    }, 0);
  }, [holdings, quotes]);

  const totalAtTop = useMemo(() => {
    if (!profile) return 0;
    return profile.savingsBalance + profile.spendingBalance + profile.investingCashBalance + stocksValueAud;
  }, [profile, stocksValueAud]);

  const monthlyInterest = useMemo(() => {
    if (!profile) return 0;
    return (profile.savingsBalance * (profile.savingsInterestRatePA / 100)) / 12;
  }, [profile]);

  const hoursNum = parseFloat(hoursWorked) || 0;
  const wageNum = parseFloat(hourlyWage) || 0;
  const grossFortnight = Math.max(0, hoursNum * wageNum);
  const annualisedGross = grossFortnight * 26;
  const annualIncomeTax = calcAusResidentIncomeTaxAnnual(annualisedGross);
  const annualMedicare = calcMedicareLevyAnnual(annualisedGross, applyMedicareLowIncomeReduction);
  const estimatedTaxFortnight = (annualIncomeTax + annualMedicare) / 26;
  const estimatedNetFortnight = Math.max(0, grossFortnight - estimatedTaxFortnight);

  const paycheckNum = parseFloat(paycheckAmount) || 0;
  const prevFortnightNum = parseFloat(prevFortnightSpend) || 0;
  const savingPct = profile?.savingPercent ?? 70;
  const spendingPct = profile?.spendingPercent ?? 10;
  const investingPct = profile?.investingPercent ?? 20;
  const toSaving = paycheckNum * (savingPct / 100) + prevFortnightNum;
  const toSpending = Math.max(0, paycheckNum * (spendingPct / 100) - prevFortnightNum);
  const toInvesting = paycheckNum * (investingPct / 100);

  const saveProfile = useCallback(
    async (updates: Partial<FinanceProfile>) => {
      if (!profile) return;
      setSavingProfile(true);
      try {
        const res = await fetch("/api/finance", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (res.ok) {
          const p = await res.json();
          setProfile(p);
        }
      } catch (err) {
        console.error("Failed to save profile", err);
      } finally {
        setSavingProfile(false);
      }
    },
    [profile]
  );

  const saveBalances = useCallback(() => {
    const sav = profile?.savingsBalance ?? 0;
    const spe = profile?.spendingBalance ?? 0;
    const inv = profile?.investingCashBalance ?? 0;
    saveProfile({ savingsBalance: sav, spendingBalance: spe, investingCashBalance: inv });
  }, [profile, saveProfile]);

  const updateFortnightSpending = useCallback(
    async (amount: number, period: "current" | "previous") => {
      try {
        const res = await fetch("/api/finance/fortnight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, period }),
        });
        if (res.ok) {
          const f = await fetch("/api/finance/fortnight").then((r) => r.json());
          setFortnight(f);
          setPrevFortnightSpend("");
        }
      } catch (err) {
        console.error("Failed to update fortnight spending", err);
      }
    },
    []
  );

  const searchStocks = useCallback(async () => {
    const q = addHoldingTicker.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await fetch(
        `/api/finance/stock-search?q=${encodeURIComponent(q)}&exchange=${addHoldingExchange}`
      );
      const data = await res.json().catch(() => ({ quotes: [] }));
      setSearchResults(
        (data.quotes ?? []).map((x: { symbol: string; shortname?: string; name?: string }) => ({
          symbol: x.symbol,
          name: x.shortname ?? x.name ?? x.symbol,
        }))
      );
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [addHoldingTicker, addHoldingExchange]);

  const addHolding = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const base = addHoldingTicker.trim().toUpperCase().replace(/\.AX$/, "");
      const ticker = addHoldingExchange === "asx" ? base + ".AX" : base;
      const shares = parseFloat(addHoldingShares);
      const avgPrice = parseFloat(addHoldingAvgPrice);
      if (!ticker || !(shares > 0) || !(avgPrice > 0)) return;
      setAddingHolding(true);
      try {
        const res = await fetch("/api/finance/holdings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker,
            exchange: addHoldingExchange === "asx" ? "ASX" : "NASDAQ",
            shares,
            averagePrice: avgPrice,
            currency: addHoldingCurrency,
          }),
        });
        if (res.ok) {
          const h = await res.json();
          setHoldings((prev) => [...prev, h]);
          setAddHoldingTicker("");
          setAddHoldingShares("");
          setAddHoldingAvgPrice("");
          setSearchResults([]);
        }
      } catch (err) {
        console.error("Failed to add holding", err);
      } finally {
        setAddingHolding(false);
      }
    },
    [addHoldingTicker, addHoldingShares, addHoldingAvgPrice, addHoldingCurrency, addHoldingExchange]
  );

  const deleteHolding = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/finance/holdings?id=${id}`, { method: "DELETE" });
      if (res.ok) setHoldings((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error("Failed to delete holding", err);
    }
  }, []);

  if (loading && !profile) {
    return (
      <div className="text-gray-500 dark:text-gray-400 py-8 text-center">
        Loading finance…
      </div>
    );
  }

  const p = profile ?? {
    savingsBalance: 0,
    spendingBalance: 0,
    investingCashBalance: 0,
    savingPercent: 70,
    spendingPercent: 10,
    investingPercent: 20,
    savingsInterestRatePA: 4,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Finance</h1>
      </div>

      <section className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 p-4">
        <h2 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 mb-1">Total (Savings + Spending + Investing)</h2>
        <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
          {formatMoney(totalAtTop)}
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Account balances</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Savings account</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full rounded-lg border border-gray-200 dark:border-[#2A2A2E] bg-white dark:bg-[#1A1A1A] px-3 py-2 text-sm"
              value={p.savingsBalance === 0 ? "" : p.savingsBalance}
              onChange={(e) =>
                setProfile((prev) =>
                  prev ? { ...prev, savingsBalance: parseFloat(e.target.value) || 0 } : null
                )
              }
              onBlur={saveBalances}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Spending account</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full rounded-lg border border-gray-200 dark:border-[#2A2A2E] bg-white dark:bg-[#1A1A1A] px-3 py-2 text-sm"
              value={p.spendingBalance === 0 ? "" : p.spendingBalance}
              onChange={(e) =>
                setProfile((prev) =>
                  prev ? { ...prev, spendingBalance: parseFloat(e.target.value) || 0 } : null
                )
              }
              onBlur={saveBalances}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Investing (cash)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full rounded-lg border border-gray-200 dark:border-[#2A2A2E] bg-white dark:bg-[#1A1A1A] px-3 py-2 text-sm"
              value={p.investingCashBalance === 0 ? "" : p.investingCashBalance}
              onChange={(e) =>
                setProfile((prev) =>
                  prev ? { ...prev, investingCashBalance: parseFloat(e.target.value) || 0 } : null
                )
              }
              onBlur={saveBalances}
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Interest this month (savings): {formatMoney(monthlyInterest)} ({p.savingsInterestRatePA}% p.a.)
        </p>
        <div className="mt-2 flex items-center gap-2">
          <label className="text-xs text-gray-500 dark:text-gray-400">Savings rate % p.a.</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            className="w-20 rounded border border-gray-200 dark:border-[#2A2A2E] bg-white dark:bg-[#1A1A1A] px-2 py-1 text-sm"
            value={p.savingsInterestRatePA}
            onChange={(e) =>
              setProfile((prev) =>
                prev ? { ...prev, savingsInterestRatePA: parseFloat(e.target.value) || 0 } : null
              )
            }
            onBlur={() => saveProfile({ savingsInterestRatePA: p.savingsInterestRatePA })}
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Fortnight pay (AU tax estimate)
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Estimate only. Assumes Australian resident tax rates (2025–26) and includes Medicare levy (with optional
          low-income reduction). It does not include offsets, HELP/HECS, Medicare levy surcharge, or other factors.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hours worked (this fortnight)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-44 rounded-lg border border-gray-200 dark:border-[#2A2A2E] bg-white dark:bg-[#1A1A1A] px-3 py-2 text-sm"
              value={hoursWorked}
              onChange={(e) => setHoursWorked(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hourly wage</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-44 rounded-lg border border-gray-200 dark:border-[#2A2A2E] bg-white dark:bg-[#1A1A1A] px-3 py-2 text-sm"
              value={hourlyWage}
              onChange={(e) => setHourlyWage(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={applyMedicareLowIncomeReduction}
              onChange={(e) => setApplyMedicareLowIncomeReduction(e.target.checked)}
            />
            Apply Medicare low-income reduction
          </label>
        </div>

        <div className="mt-3 rounded-lg border border-gray-200 dark:border-[#2A2A2E] p-3 text-sm">
          <p>Gross (fortnight): {formatMoney(grossFortnight)}</p>
          <p>Estimated tax (fortnight): {formatMoney(estimatedTaxFortnight)}</p>
          <p className="font-medium">Estimated net (fortnight): {formatMoney(estimatedNetFortnight)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
              disabled={estimatedNetFortnight <= 0}
              onClick={() => setPaycheckAmount(estimatedNetFortnight.toFixed(2))}
            >
              Use net as paycheck amount
            </button>
            <button
              type="button"
              className="rounded-lg bg-gray-200 dark:bg-gray-700 px-3 py-2 text-sm disabled:opacity-50"
              disabled={grossFortnight <= 0}
              onClick={() => setPaycheckAmount(grossFortnight.toFixed(2))}
            >
              Use gross as paycheck amount
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Paycheck split</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Paycheck amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              className="w-full max-w-xs rounded-lg border border-gray-200 dark:border-[#2A2A2E] bg-white dark:bg-[#1A1A1A] px-3 py-2 text-sm"
              value={paycheckAmount}
              onChange={(e) => setPaycheckAmount(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">Saving %</label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                className="w-16 rounded border border-gray-200 dark:border-[#2A2A2E] bg-white dark:bg-[#1A1A1A] px-2 py-1 text-sm"
                value={savingPct}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev ? { ...prev, savingPercent: parseFloat(e.target.value) || 0 } : null
                  )
                }
                onBlur={() => saveProfile({ savingPercent: savingPct })}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">Spending %</label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                className="w-16 rounded border border-gray-200 dark:border-[#2A2A2E] bg-white dark:bg-[#1A1A1A] px-2 py-1 text-sm"
                value={spendingPct}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev ? { ...prev, spendingPercent: parseFloat(e.target.value) || 0 } : null
                  )
                }
                onBlur={() => saveProfile({ spendingPercent: spendingPct })}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">Investing %</label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                className="w-16 rounded border border-gray-200 dark:border-[#2A2A2E] bg-white dark:bg-[#1A1A1A] px-2 py-1 text-sm"
                value={investingPct}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev ? { ...prev, investingPercent: parseFloat(e.target.value) || 0 } : null
                  )
                }
                onBlur={() => saveProfile({ investingPercent: investingPct })}
              />
            </div>
          </div>
          {paycheckNum > 0 && (
            <div className="rounded-lg border border-gray-200 dark:border-[#2A2A2E] p-3 text-sm">
              <p>Saving: {formatMoney(toSaving)}</p>
              <p>Spending: {formatMoney(toSpending)}</p>
              <p>Investing: {formatMoney(toInvesting)}</p>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Previous fortnight spending</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Resets every second Saturday (from 15 Feb 2026). Enter what you spent last fortnight; that amount is added to savings and taken from spending in the split above.
        </p>
        {fortnight && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Previous period: {formatFortnightRange(fortnight.previousPeriodStart)} — spent: {formatMoney(fortnight.previousAmount)}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Amount spent"
            className="rounded-lg border border-gray-200 dark:border-[#2A2A2E] bg-white dark:bg-[#1A1A1A] px-3 py-2 text-sm w-40"
            value={prevFortnightSpend}
            onChange={(e) => setPrevFortnightSpend(e.target.value)}
          />
          <button
            type="button"
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700"
            onClick={() => updateFortnightSpending(prevFortnightNum, "previous")}
            disabled={prevFortnightNum <= 0}
          >
            Set previous fortnight spending
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Investing (stocks)</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Total in stocks (AUD): {formatMoney(stocksValueAud)}. Total investing (cash + stocks): {formatMoney((profile?.investingCashBalance ?? 0) + stocksValueAud)}.
        </p>

        <form onSubmit={addHolding} className="mb-4 space-y-3 rounded-lg border border-gray-200 dark:border-[#2A2A2E] p-4">
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Exchange</label>
              <select
                className="rounded border border-gray-200 dark:border-[#2A2A2E] bg-white dark:bg-[#1A1A1A] px-2 py-1.5 text-sm"
                value={addHoldingExchange}
                onChange={(e) => setAddHoldingExchange(e.target.value as "nasdaq" | "asx")}
              >
                <option value="nasdaq">NASDAQ</option>
                <option value="asx">ASX</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Ticker</label>
              <input
                type="text"
                placeholder="e.g. AAPL"
                className="rounded border border-gray-200 dark:border-[#2A2A2E] bg-white dark:bg-[#1A1A1A] px-3 py-1.5 text-sm w-28"
                value={addHoldingTicker}
                onChange={(e) => setAddHoldingTicker(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="rounded bg-gray-200 dark:bg-gray-700 px-2 py-1.5 text-sm"
              onClick={searchStocks}
              disabled={searching}
            >
              {searching ? "Searching…" : "Search"}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {searchResults.slice(0, 8).map((r) => (
                <button
                  key={r.symbol}
                  type="button"
                  className="rounded border border-indigo-300 dark:border-indigo-600 px-2 py-1 text-xs"
                  onClick={() => {
                    setAddHoldingTicker(r.symbol.replace(/\.AX$/, ""));
                    setSearchResults([]);
                  }}
                >
                  {r.symbol} – {r.name.slice(0, 20)}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Shares</label>
              <input
                type="number"
                step="any"
                min="0.0001"
                required
                className="rounded border border-gray-200 dark:border-[#2A2A2E] bg-white dark:bg-[#1A1A1A] px-3 py-1.5 text-sm w-24"
                value={addHoldingShares}
                onChange={(e) => setAddHoldingShares(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Avg buy price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                className="rounded border border-gray-200 dark:border-[#2A2A2E] bg-white dark:bg-[#1A1A1A] px-3 py-1.5 text-sm w-24"
                value={addHoldingAvgPrice}
                onChange={(e) => setAddHoldingAvgPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Currency</label>
              <select
                className="rounded border border-gray-200 dark:border-[#2A2A2E] bg-white dark:bg-[#1A1A1A] px-2 py-1.5 text-sm"
                value={addHoldingCurrency}
                onChange={(e) => setAddHoldingCurrency(e.target.value as "AUD" | "USD")}
              >
                <option value="AUD">AUD</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
              disabled={addingHolding}
            >
              Add holding
            </button>
          </div>
        </form>

        <div className="space-y-2">
          {holdings.map((h) => {
            const q = quotes[h.id];
            const valueAud = q ? h.shares * q.priceAud : null;
            return (
              <div
                key={h.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-[#2A2A2E] p-3 text-sm"
              >
                <div>
                  <span className="font-medium">{h.ticker}</span>
                  {q?.name && <span className="text-gray-500 dark:text-gray-400 ml-2">({q.name})</span>}
                  <span className="text-gray-500 dark:text-gray-400 ml-2">
                    {h.shares} @ avg {formatMoney(h.averagePrice, h.currency)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {valueAud != null ? (
                    <span>{formatMoney(valueAud)}</span>
                  ) : (
                    <span className="text-gray-400">Loading…</span>
                  )}
                  <button
                    type="button"
                    className="text-red-600 dark:text-red-400 text-xs"
                    onClick={() => deleteHolding(h.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
          {holdings.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No holdings yet. Add a stock above.</p>
          )}
        </div>
      </section>
    </div>
  );
}
