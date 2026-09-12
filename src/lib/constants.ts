export const ROLES = ["OWNER", "MANAGER", "DISPATCHER", "UPDATER", "DRIVER"] as const;
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

// Which roles can perform which action.
export const can = {
  manageUsers: (role: string) => role === "OWNER" || role === "MANAGER",
  manageDrivers: (role: string) =>
    ["OWNER", "MANAGER", "DISPATCHER"].includes(role),
  createLoad: (role: string) =>
    ["OWNER", "MANAGER", "DISPATCHER"].includes(role),
  editLoad: (role: string) =>
    ["OWNER", "MANAGER", "DISPATCHER"].includes(role),
  deleteLoad: (role: string) => ["OWNER", "MANAGER"].includes(role),
  assignDriver: (role: string) =>
    ["OWNER", "MANAGER", "DISPATCHER"].includes(role),
  updateStatus: (role: string) =>
    ["OWNER", "MANAGER", "DISPATCHER", "UPDATER", "DRIVER"].includes(role),
  viewAllLoads: (role: string) => role !== "DRIVER",
};

export const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-700",
  MANAGER: "bg-blue-100 text-blue-700",
  DISPATCHER: "bg-emerald-100 text-emerald-700",
  UPDATER: "bg-amber-100 text-amber-700",
  DRIVER: "bg-slate-100 text-slate-700",
};

export const LOAD_STATUS_COLORS: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  IN_TRANSIT: "bg-amber-100 text-amber-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export const DRIVER_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-700",
  ON_LOAD: "bg-amber-100 text-amber-700",
  OFF_DUTY: "bg-slate-100 text-slate-700",
};
