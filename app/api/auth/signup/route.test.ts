import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

const { prisma, hashPassword, generateUniqueWorkspaceSlug } = vi.hoisted(() => ({
  prisma: { $transaction: vi.fn() },
  hashPassword: vi.fn(),
  generateUniqueWorkspaceSlug: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));
vi.mock("@/lib/auth/password", () => ({ hashPassword }));
vi.mock("@/lib/workspace/slug", () => ({ generateUniqueWorkspaceSlug }));

import { POST } from "./route";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

function jsonRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  hashPassword.mockResolvedValue("hashed-password");
  generateUniqueWorkspaceSlug.mockResolvedValue("ada-lovelace");
});

const validBody = { email: "ada@example.com", password: "password123", name: "Ada Lovelace" };

describe("POST /api/auth/signup", () => {
  it("returns 422 with field errors for an invalid payload", async () => {
    const response = await POST(
      jsonRequest({ email: "not-an-email", password: "short", name: "" }),
    );
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(body.error.fields)).toEqual(
      expect.arrayContaining(["email", "password", "name"]),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns 422 when the request body is not valid JSON", async () => {
    const request = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    const response = await POST(request);
    expect(response.status).toBe(422);
  });

  it("creates the user and workspace, sets a session cookie, and returns 201", async () => {
    const user = { id: "user-1", email: "ada@example.com", name: "Ada Lovelace" };
    const workspace = { id: "ws-1", name: "Ada Lovelace's Workspace", slug: "ada-lovelace" };
    const createWorkspace = vi.fn().mockResolvedValue(workspace);

    prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        user: { create: vi.fn().mockResolvedValue(user) },
        workspace: { create: createWorkspace },
      };
      return callback(tx);
    });

    const response = await POST(jsonRequest(validBody));

    expect(response.status).toBe(201);
    expect(hashPassword).toHaveBeenCalledWith("password123");

    // Acceptance criterion: signup produces exactly one workspace with the
    // creator as `owner`.
    expect(createWorkspace).toHaveBeenCalledTimes(1);
    expect(createWorkspace).toHaveBeenCalledWith({
      data: expect.objectContaining({
        members: { create: { userId: user.id, role: "owner", joinedAt: expect.any(Date) } },
      }),
    });

    const body = await response.json();
    expect(body).toEqual({
      user: { id: "user-1", email: "ada@example.com", name: "Ada Lovelace" },
      workspace: { id: "ws-1", name: "Ada Lovelace's Workspace", slug: "ada-lovelace" },
      session: { expiresAt: expect.any(String) },
    });

    const cookie = response.cookies.get(SESSION_COOKIE_NAME);
    expect(cookie).toBeDefined();
    expect(cookie?.value).toBeTruthy();
  });

  it("returns 409 CONFLICT when the email is already registered", async () => {
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.19.3",
      }),
    );

    const response = await POST(jsonRequest(validBody));
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("CONFLICT");
  });

  it("rethrows unexpected errors", async () => {
    prisma.$transaction.mockRejectedValue(new Error("connection lost"));
    await expect(POST(jsonRequest(validBody))).rejects.toThrow("connection lost");
  });
});
