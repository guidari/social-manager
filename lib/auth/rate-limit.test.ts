import { beforeEach, describe, expect, it, vi } from "vitest";

const { redis } = vi.hoisted(() => ({
  redis: {
    get: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock("@/lib/redis", () => ({ redis }));

import { clearLoginRateLimit, isLoginRateLimited, registerFailedLogin } from "./rate-limit";

const IP = "203.0.113.7";
const EMAIL = "user@example.com";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isLoginRateLimited", () => {
  it("returns false when there is no recorded count", async () => {
    redis.get.mockResolvedValue(null);
    await expect(isLoginRateLimited(IP, EMAIL)).resolves.toBe(false);
  });

  it("returns false when the count is below the threshold", async () => {
    redis.get.mockResolvedValue("4");
    await expect(isLoginRateLimited(IP, EMAIL)).resolves.toBe(false);
  });

  it("returns true when the count meets the threshold", async () => {
    redis.get.mockResolvedValue("5");
    await expect(isLoginRateLimited(IP, EMAIL)).resolves.toBe(true);
  });

  it("returns true when the count exceeds the threshold", async () => {
    redis.get.mockResolvedValue("10");
    await expect(isLoginRateLimited(IP, EMAIL)).resolves.toBe(true);
  });

  it("fails open (returns false) when redis errors", async () => {
    redis.get.mockRejectedValue(new Error("connection refused"));
    await expect(isLoginRateLimited(IP, EMAIL)).resolves.toBe(false);
  });
});

describe("registerFailedLogin", () => {
  it("increments the counter and sets an expiry on the first attempt", async () => {
    redis.incr.mockResolvedValue(1);
    await registerFailedLogin(IP, EMAIL);
    expect(redis.incr).toHaveBeenCalledWith(`ratelimit:login:${IP}:${EMAIL}`);
    expect(redis.expire).toHaveBeenCalledWith(`ratelimit:login:${IP}:${EMAIL}`, 15 * 60);
  });

  it("does not reset the expiry on subsequent attempts", async () => {
    redis.incr.mockResolvedValue(2);
    await registerFailedLogin(IP, EMAIL);
    expect(redis.expire).not.toHaveBeenCalled();
  });

  it("swallows redis errors instead of throwing", async () => {
    redis.incr.mockRejectedValue(new Error("connection refused"));
    await expect(registerFailedLogin(IP, EMAIL)).resolves.toBeUndefined();
  });
});

describe("clearLoginRateLimit", () => {
  it("deletes the rate limit key", async () => {
    redis.del.mockResolvedValue(1);
    await clearLoginRateLimit(IP, EMAIL);
    expect(redis.del).toHaveBeenCalledWith(`ratelimit:login:${IP}:${EMAIL}`);
  });

  it("swallows redis errors instead of throwing", async () => {
    redis.del.mockRejectedValue(new Error("connection refused"));
    await expect(clearLoginRateLimit(IP, EMAIL)).resolves.toBeUndefined();
  });
});
