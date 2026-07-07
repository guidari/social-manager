import { describe, expect, it, vi } from "vitest";
import { generateUniqueWorkspaceSlug } from "./slug";

function fakeClient(existingSlugs: string[]) {
  return {
    workspace: {
      findUnique: vi.fn(({ where: { slug } }: { where: { slug: string } }) =>
        Promise.resolve(existingSlugs.includes(slug) ? { id: "existing" } : null),
      ),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("generateUniqueWorkspaceSlug", () => {
  it("slugifies the seed name", async () => {
    const client = fakeClient([]);
    await expect(generateUniqueWorkspaceSlug(client, "Ada Lovelace")).resolves.toBe("ada-lovelace");
  });

  it("strips diacritics and non-alphanumeric characters", async () => {
    const client = fakeClient([]);
    await expect(generateUniqueWorkspaceSlug(client, "José Á. Núñez!!")).resolves.toBe(
      "jose-a-nunez",
    );
  });

  it("falls back to 'workspace' when the seed has no usable characters", async () => {
    const client = fakeClient([]);
    await expect(generateUniqueWorkspaceSlug(client, "!!!")).resolves.toBe("workspace");
  });

  it("appends a random suffix when the base slug is taken", async () => {
    const client = fakeClient(["ada-lovelace"]);
    const slug = await generateUniqueWorkspaceSlug(client, "Ada Lovelace");
    expect(slug).toMatch(/^ada-lovelace-[0-9a-f]{6}$/);
  });

  it("retries with new suffixes until a free slug is found", async () => {
    const client = fakeClient([]);
    let calls = 0;
    client.workspace.findUnique.mockImplementation(() => {
      calls += 1;
      // First two candidates are taken, third is free.
      return Promise.resolve(calls <= 2 ? { id: "existing" } : null);
    });

    const slug = await generateUniqueWorkspaceSlug(client, "Ada");
    expect(calls).toBe(3);
    expect(slug).toMatch(/^ada(-[0-9a-f]{6})?$/);
  });

  it("gives up after 5 attempts and returns a longer random suffix", async () => {
    const client = fakeClient([]);
    client.workspace.findUnique.mockResolvedValue({ id: "existing" });

    const slug = await generateUniqueWorkspaceSlug(client, "Ada");
    expect(client.workspace.findUnique).toHaveBeenCalledTimes(5);
    expect(slug).toMatch(/^ada-[0-9a-f]{8}$/);
  });
});
