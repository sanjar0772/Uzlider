export const ROLES = [
  "OWNER",
  "MANAGER",
  "DISPATCHER",
  "UPDATER",
  "ACCOUNTANT",
  "DRIVER",
] as const;
export type Role = (typeof ROLES)[number];

export const LOAD_STATUSES = [
  "NEW",
  "ASSIGNED",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
] as const;
export type LoadStatus = (typeof LOAD_STATUSES)[number];

export const DRIVER_STATUSES = ["AVAILABLE", "ON_LOAD", "OFF_DUTY"] as const;
export type DriverStatus = (typeof DRIVER_STATUSES)[number];

export const TRUCK_STATUSES = ["ACTIVE", "MAINTENANCE", "INACTIVE"] as const;
export type TruckStatus = (typeof TRUCK_STATUSES)[number];

export const EQUIPMENT_TYPES = [
  "VAN",
  "REEFER",
  "FLATBED",
  "POWER_ONLY",
  "STEP_DECK",
  "OTHER",
] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const INVOICE_STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

// ---- Permission matrix ----
export const can = {
  manageUsers: (r: string) => ["OWNER", "MANAGER"].includes(r),
  manageDrivers: (r: string) =>
    ["OWNER", "MANAGER", "DISPATCHER"].includes(r),
  manageTrucks: (r: string) => ["OWNER", "MANAGER", "DISPATCHER"].includes(r),
  manageCustomers: (r: string) =>
    ["OWNER", "MANAGER", "DISPATCHER"].includes(r),
  createLoad: (r: string) => ["OWNER", "MANAGER", "DISPATCHER"].includes(r),
  editLoad: (r: string) => ["OWNER", "MANAGER", "DISPATCHER"].includes(r),
  deleteLoad: (r: string) => ["OWNER", "MANAGER"].includes(r),
  assignDriver: (r: string) => ["OWNER", "MANAGER", "DISPATCHER"].includes(r),
  updateStatus: (r: string) =>
    ["OWNER", "MANAGER", "DISPATCHER", "UPDATER", "DRIVER"].includes(r),
  manageInvoices: (r: string) =>
    ["OWNER", "MANAGER", "ACCOUNTANT"].includes(r),
  viewInvoices: (r: string) =>
    ["OWNER", "MANAGER", "ACCOUNTANT"].includes(r),
  viewReports: (r: string) =>
    ["OWNER", "MANAGER", "ACCOUNTANT"].includes(r),
  viewFinancials: (r: string) =>
    ["OWNER", "MANAGER", "ACCOUNTANT", "DISPATCHER"].includes(r),
  viewAllLoads: (r: string) => r !== "DRIVER",
  viewActivity: (r: string) => ["OWNER", "MANAGER"].includes(r),
  // Company + Telegram settings: admins only.
  manageSettings: (r: string) => ["OWNER", "MANAGER"].includes(r),
  manageTelegram: (r: string) => ["OWNER", "MANAGER"].includes(r),
  // Only an Owner may create/modify/delete Owner accounts or grant the Owner role.
  manageOwners: (r: string) => r === "OWNER",
};

// Rank used to stop privilege escalation: a user may never act on an account
// whose role outranks their own, nor grant a role above their own.
export const ROLE_RANK: Record<string, number> = {
  OWNER: 5,
  MANAGER: 4,
  ACCOUNTANT: 3,
  DISPATCHER: 3,
  UPDATER: 2,
  DRIVER: 1,
};

// Validate that a value is a member of an enum list (guards against 500s and
// clients pushing arbitrary status strings straight into the database).
export function isLoadStatus(v: any): v is LoadStatus {
  return typeof v === "string" && (LOAD_STATUSES as readonly string[]).includes(v);
}
export function isDriverStatus(v: any): v is DriverStatus {
  return typeof v === "string" && (DRIVER_STATUSES as readonly string[]).includes(v);
}
export function isTruckStatus(v: any): v is TruckStatus {
  return typeof v === "string" && (TRUCK_STATUSES as readonly string[]).includes(v);
}
export function isInvoiceStatus(v: any): v is InvoiceStatus {
  return typeof v === "string" && (INVOICE_STATUSES as readonly string[]).includes(v);
}
export function isEquipmentType(v: any): v is EquipmentType {
  return typeof v === "string" && (EQUIPMENT_TYPES as readonly string[]).includes(v);
}

export const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  MANAGER: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  DISPATCHER:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  UPDATER: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  ACCOUNTANT:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  DRIVER: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
};

export const LOAD_STATUS_COLORS: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  ASSIGNED: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  IN_TRANSIT:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  DELIVERED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

export const DRIVER_STATUS_COLORS: Record<string, string> = {
  AVAILABLE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  ON_LOAD: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  OFF_DUTY: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
};

export const TRUCK_STATUS_COLORS: Record<string, string> = {
  ACTIVE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  MAINTENANCE:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  INACTIVE: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
};

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  SENT: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};
