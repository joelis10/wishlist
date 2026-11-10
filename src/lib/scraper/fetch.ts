import dns from "node:dns/promises";
import net from "node:net";
import { ScrapeError } from "./types";

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
];

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15_000;

export function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function inCidr(ip: string, base: string, prefix: number): boolean {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

function isPrivateIpv4(ip: string): boolean {
  return (
    inCidr(ip, "0.0.0.0", 8) ||
    inCidr(ip, "10.0.0.0", 8) ||
    inCidr(ip, "100.64.0.0", 10) ||
    inCidr(ip, "127.0.0.0", 8) ||
    inCidr(ip, "169.254.0.0", 16) ||
    inCidr(ip, "172.16.0.0", 12) ||
    inCidr(ip, "192.0.0.0", 24) ||
    inCidr(ip, "192.0.2.0", 24) ||
    inCidr(ip, "192.168.0.0", 16) ||
    inCidr(ip, "198.18.0.0", 15) ||
    inCidr(ip, "198.51.100.0", 24) ||
    inCidr(ip, "203.0.113.0", 24) ||
    inCidr(ip, "224.0.0.0", 4) ||
    inCidr(ip, "240.0.0.0", 4)
  );
}

function isPrivateIpv6(ip: string): boolean {
  const value = ip.toLowerCase().split("%")[0];
  if (value === "::" || value === "::1") return true;
  if (value.startsWith("fc") || value.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(value)) return true;
  if (value.startsWith("::ffff:")) {
    const tail = value.slice(7);
    if (net.isIP(tail) === 4) return isPrivateIpv4(tail);
  }
  return false;
}

export function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".home") ||
    host.endsWith(".lan") ||
    !host.includes(".")
  ) {
    return true;
  }
  if (net.isIP(host) === 4) return isPrivateIpv4(host);
  if (net.isIP(host) === 6) return isPrivateIpv6(host);
  return false;
}

async function resolveSafe(hostname: string): Promise<void> {
  if (isPrivateHostname(hostname)) throw new ScrapeError("That address is not allowed.");
  let addresses: { address: string; family: number }[];
  try {
    addresses = await Promise.race([
      dns.lookup(hostname, { all: true, verbatim: true }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DNS lookup timed out")), 4000),
      ),
    ]);
  } catch {
    throw new ScrapeError("That website could not be reached.");
  }
  for (const entry of addresses) {
    if (entry.family === 4 && isPrivateIpv4(entry.address)) {
      throw new ScrapeError("That address is not allowed.");
    }
    if (entry.family === 6 && isPrivateIpv6(entry.address)) {
      throw new ScrapeError("That address is not allowed.");
    }
  }
}

export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ScrapeError("That link is not valid.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ScrapeError("Only http and https links are supported.");
  }
  if (url.username || url.password) throw new ScrapeError("That link is not supported.");
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new ScrapeError("Only standard web ports are supported.");
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  await resolveSafe(hostname);
  return url;
}

async function readLimited(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel().catch(() => {});
      break;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}

export type FetchedPage = {
  status: number;
  finalUrl: string;
  html: string;
  blocked: boolean;
  blockedReason: string | null;
};

export function looksBlocked(html: string, status: number): { blocked: boolean; reason: string | null } {
  if ([401, 403, 429, 503].includes(status)) {
    return { blocked: true, reason: `The site returned HTTP ${status}.` };
  }
  const sample = html.slice(0, 60_000).toLowerCase();
  if (
    /just a moment\.\.\.|checking your browser|cf-browser-verification|attention required! \| cloudflare|access denied|verify you are human|enable javascript and cookies to continue|unusual traffic/.test(
      sample,
    )
  ) {
    return { blocked: true, reason: "The site showed a bot check." };
  }
  return { blocked: false, reason: null };
}

export async function fetchPage(rawUrl: string, userAgent: string): Promise<FetchedPage> {
  let current = await assertPublicUrl(rawUrl);
  const deadline = Date.now() + TIMEOUT_MS;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new ScrapeError("The site took too long to respond.");

    let response: Response;
    try {
      response = await fetch(current.toString(), {
        redirect: "manual",
        signal: AbortSignal.timeout(remaining),
        headers: {
          "User-Agent": userAgent,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-GB,en;q=0.9",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
        },
      });
    } catch (error) {
      if (error instanceof ScrapeError) throw error;
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new ScrapeError("The site took too long to respond.");
      }
      throw new ScrapeError("The site could not be reached.");
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) break;
      if (redirects === MAX_REDIRECTS) throw new ScrapeError("Too many redirects.");
      current = await assertPublicUrl(new URL(location, current).toString());
      continue;
    }

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      throw new ScrapeError("That link is not a product page.");
    }

    const html = await readLimited(response);
    const block = looksBlocked(html, response.status);
    return {
      status: response.status,
      finalUrl: current.toString(),
      html,
      blocked: block.blocked,
      blockedReason: block.reason,
    };
  }

  throw new ScrapeError("Too many redirects.");
}
