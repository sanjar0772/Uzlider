export type CostSettings = {
  mpg: number;
  fuelPricePerGallon: number;
  fixedCostPerMile: number;
  targetRpm: number;
  factoringRatePct?: number;
};

export const DEFAULT_SETTINGS: CostSettings = {
  mpg: 6.5,
  fuelPricePerGallon: 4.1,
  fixedCostPerMile: 0.35,
  targetRpm: 2.0,
  factoringRatePct: 3.0,
};

export type LoadFinancials = {
  totalMiles: number;
  revenue: number;
  fuelCost: number;
  fixedCost: number;
  driverPay: number;
  lumper: number;
  costs: number;
  netProfit: number;
  marginPct: number;
  loadedRpm: number;
  allInRpm: number;
};

type LoadLike = {
  rate?: number | null;
  driverPay?: number | null;
  miles?: number | null;
  deadheadMiles?: number | null;
  detention?: number | null;
  lumperFee?: number | null;
  otherCharges?: number | null;
};

export function computePnl(
  load: LoadLike,
  settings: CostSettings,
  truckMpg?: number | null
): LoadFinancials {
  const miles = load.miles ?? 0;
  const dh = load.deadheadMiles ?? 0;
  const totalMiles = miles + dh;
  const mpg = truckMpg && truckMpg > 0 ? truckMpg : settings.mpg || 6.5;
  const rate = load.rate ?? 0;

  const revenue = rate + (load.detention ?? 0) + (load.otherCharges ?? 0);
  const fuelCost = mpg > 0 ? (totalMiles / mpg) * settings.fuelPricePerGallon : 0;
  const fixedCost = totalMiles * settings.fixedCostPerMile;
  const driverPay = load.driverPay ?? 0;
  const lumper = load.lumperFee ?? 0;
  const costs = driverPay + fuelCost + fixedCost + lumper;
  const netProfit = revenue - costs;
  const marginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const loadedRpm = miles > 0 ? rate / miles : 0;
  const allInRpm = totalMiles > 0 ? rate / totalMiles : 0;

  return {
    totalMiles,
    revenue,
    fuelCost,
    fixedCost,
    driverPay,
    lumper,
    costs,
    netProfit,
    marginPct,
    loadedRpm,
    allInRpm,
  };
}

// Tailwind text classes for an RPM value vs the company target.
export function rpmColor(rpm: number, target: number): string {
  if (!rpm) return "text-slate-400";
  if (rpm >= target) return "text-emerald-600 dark:text-emerald-400";
  if (rpm >= target * 0.85) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function rpmBg(rpm: number, target: number): string {
  if (!rpm) return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  if (rpm >= target)
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
  if (rpm >= target * 0.85)
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
  return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
}

// Days until a date (negative if past). null-safe.
export function daysUntil(d: string | Date | null | undefined): number | null {
  if (!d) return null;
  const target = new Date(d).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / 86400000);
}

// Compliance severity for an expiry date.
export function expiryStatus(
  d: string | Date | null | undefined
): "none" | "ok" | "soon" | "expired" {
  const days = daysUntil(d);
  if (days == null) return "none";
  if (days < 0) return "expired";
  if (days <= 30) return "soon";
  return "ok";
}
