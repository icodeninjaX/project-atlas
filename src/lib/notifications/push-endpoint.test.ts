import { describe, expect, it } from "vitest";
import { isTrustedPushEndpoint } from "./push-endpoint";

describe("browser push destinations", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/token",
    "https://updates.push.services.mozilla.com/wpush/v2/token",
    "https://web.push.apple.com/token",
    "https://wns2-db5p.notify.windows.com/?token=abc",
  ])("allows the browser provider %s", (endpoint) => {
    expect(isTrustedPushEndpoint(endpoint)).toBe(true);
  });
  it.each([
    "http://fcm.googleapis.com/token",
    "https://127.0.0.1/token",
    "https://[::1]/token",
    "https://169.254.169.254/token",
    "https://internal.example/token",
    "https://fcm.googleapis.com.attacker.invalid/token",
    "https://evilpush.apple.com/token",
    "https://user:pass@fcm.googleapis.com/token",
    "https://fcm.googleapis.com:8443/token",
    "https://fcm.googleapis.com/token#fragment",
    "https://fcm.google\tapis.com/token",
    "https://fcm.googleapis.com\\@attacker.invalid/token",
    "https://fcm.googleapis.com./token",
    "https://fcm%2egoogleapis.com/token",
    "https://%66cm.googleapis.com/token",
  ])("rejects %s", (endpoint) => {
    expect(isTrustedPushEndpoint(endpoint)).toBe(false);
  });
});
