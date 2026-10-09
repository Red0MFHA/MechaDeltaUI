import { describe, expect, it } from "vitest";

import { signSession, verifySession } from "./session-token";

describe("session token", () => {
  it("round-trips a valid token", async () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const token = await signSession({
      sub: "usr-demo",
      email: "demo@mechadelta.lab",
      name: "Demo",
      exp,
    });
    const claims = await verifySession(token);
    expect(claims).toMatchObject({ sub: "usr-demo", email: "demo@mechadelta.lab" });
  });

  it("rejects a tampered token and an expired one", async () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const token = await signSession({ sub: "usr-demo", email: "demo@mechadelta.lab", exp });
    expect(await verifySession(`${token}x`)).toBeNull();
    expect(await verifySession(token, Date.now() + 120_000)).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
  });
});
