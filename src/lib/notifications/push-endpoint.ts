// Only browser push providers may receive server-side notification requests.
// Keep this check at delivery as subscriptions can also be written through RLS.
export function isTrustedPushEndpoint(endpoint: string): boolean {
  if (endpoint.length > 2048 || /[\s\\]/u.test(endpoint)) return false;
  try {
    const url = new URL(endpoint);
    // web-push uses legacy url.parse. Reject encoded/noncanonical authorities
    // which WHATWG URL normalizes differently (e.g. fcm%2egoogleapis.com).
    const authority = endpoint
      .match(/^https:\/\/([^/?#]+)(?:[/?#]|$)/i)?.[1]
      ?.toLowerCase();
    if (authority !== url.host && authority !== `${url.host}:443`) return false;
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.hash
    )
      return false;
    return (
      url.hostname === "fcm.googleapis.com" ||
      url.hostname === "updates.push.services.mozilla.com" ||
      /^[a-z0-9-]+\.push\.apple\.com$/.test(url.hostname) ||
      /^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname)
    );
  } catch {
    return false;
  }
}
