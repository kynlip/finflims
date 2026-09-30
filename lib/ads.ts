import { cache } from "react";
import { getUsersDb } from "@/lib/db-helpers";

// ============================================================================
// AD-FREE (VIP) ENTITLEMENTS
// ============================================================================

export interface AdFreeStatus {
  active: boolean;
  until: string | null;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

export function getAdFreeStatusFromValue(
  value: unknown,
  now = new Date(),
): AdFreeStatus {
  const until = toDate(value);
  const active = Boolean(until && until.getTime() > now.getTime());

  return {
    active,
    until: until ? until.toISOString() : null,
  };
}

export const getAdFreeStatus = cache(
  async function getAdFreeStatus(
    email?: string | null,
  ): Promise<AdFreeStatus> {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) {
      return { active: false, until: null };
    }

    try {
      const db = await getUsersDb();
      const user = await db
        .collection("users")
        .findOne({ email: normalizedEmail }, { projection: { adFreeUntil: 1 } });

      return getAdFreeStatusFromValue(user?.adFreeUntil);
    } catch (error) {
      console.error("Failed to read ad-free entitlement:", error);
      return { active: false, until: null };
    }
  },
);

