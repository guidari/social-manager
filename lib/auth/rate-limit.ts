import { redis } from "@/lib/redis";

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 5;

function rateLimitKey(ip: string, email: string): string {
  return `ratelimit:login:${ip}:${email}`;
}

/**
 * Redis-backed by design (matches the provisioned stack) but fails open on
 * Redis errors — an unreachable rate limiter should never block real logins.
 */
export async function isLoginRateLimited(ip: string, email: string): Promise<boolean> {
  try {
    const count = await redis.get(rateLimitKey(ip, email));
    return count !== null && Number(count) >= MAX_ATTEMPTS;
  } catch (err) {
    console.error("Login rate limit check failed", err);
    return false;
  }
}

export async function registerFailedLogin(ip: string, email: string): Promise<void> {
  try {
    const key = rateLimitKey(ip, email);
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }
  } catch (err) {
    console.error("Failed to register failed login attempt", err);
  }
}

export async function clearLoginRateLimit(ip: string, email: string): Promise<void> {
  try {
    await redis.del(rateLimitKey(ip, email));
  } catch (err) {
    console.error("Failed to clear login rate limit", err);
  }
}
