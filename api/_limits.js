import { redis, hasRedis, validCode } from "./_redis.js";

// Only families with a saved plan can use the AI, with an hourly limit to protect the free quota
export async function checkFamilyLimit(code, kind, perHour) {
  if (!hasRedis) return { ok: true };
  if (!validCode(code) || !(await redis("EXISTS", `plan:${code}`))) return { ok: false, status: 403, error: "Unknown family" };
  const bucket = `${kind}:${code}:${Math.floor(Date.now() / 3_600_000)}`;
  const used = await redis("INCR", bucket);
  if (used === 1) await redis("EXPIRE", bucket, 3600);
  if (used > perHour) return { ok: false, status: 429, error: "Too many requests this hour" };
  return { ok: true };
}
