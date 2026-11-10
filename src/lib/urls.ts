/** A readable version of a link for display: no query, hash or common referral path. */
export function displayUrl(value: string): string {
  try {
    const url = new URL(value);
    let path = url.pathname
      .replace(/\/ref=[^/]+/gi, "")
      .replace(/\/ref-[^/]+/gi, "")
      .replace(/\/+$/, "");
    if (!path) path = "/";
    return `${url.origin}${path}`;
  } catch {
    return value;
  }
}
