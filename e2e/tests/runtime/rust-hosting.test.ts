import { expect, test } from "../db-reset.fixture";

test("protected editor deep links survive browser refresh", async ({ gmPage }) => {
  await gmPage.goto("/create?tab=Units");
  await expect(gmPage.getByRole("tab", { name: "Units", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await gmPage.reload();
  await expect(gmPage.getByRole("tab", { name: "Units", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("unknown API routes return JSON 404 rather than the SPA shell", async ({ request }) => {
  const response = await request.get("/api/v1/does-not-exist");
  expect(response.status()).toBe(404);
  expect(response.headers()["content-type"]).toContain("application/json");
  expect((await response.json()).error.code).toBe("NOT_FOUND");
});

test("unknown assets return 404 rather than the SPA shell", async ({ request }) => {
  const response = await request.get("/assets/does-not-exist.js");
  expect(response.status()).toBe(404);
  expect(await response.text()).not.toContain('<div id="root"');
});
