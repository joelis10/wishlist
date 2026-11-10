import cron from "node-cron";
import { config } from "./env";
import { listItemsForScraping, updateItemFromScrape } from "./items";
import { scrapeProductUrl } from "./scraper";
import type { ScrapeResult } from "./scraper/types";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type GlobalWithJob = typeof globalThis & {
  __wishlistScrapeRunning?: boolean;
  __wishlistCronStarted?: boolean;
};

function log(message: string): void {
  console.log(`[jobs] ${message}`);
}

function randomJitter(max: number): number {
  return Math.floor(Math.random() * Math.max(1, max));
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "invalid";
  }
}

export async function runScrapeQueue(reason = "cron"): Promise<void> {
  const g = globalThis as GlobalWithJob;
  if (g.__wishlistScrapeRunning) {
    log("Skipping run because the previous run is still active.");
    return;
  }
  g.__wishlistScrapeRunning = true;

  const started = Date.now();
  try {
    const targets = listItemsForScraping(config.scrape.maxPerRun);
    if (targets.length === 0) {
      log("No items need checking.");
      return;
    }
    log(`Checking ${targets.length} item${targets.length === 1 ? "" : "s"} (${reason}).`);

    const byUrl = new Map<string, ScrapeResult>();
    const lastDomainAt = new Map<string, number>();
    let updated = 0;
    let failed = 0;

    for (const [index, target] of targets.entries()) {
      const domain = domainOf(target.url);
      const lastAt = lastDomainAt.get(domain) || 0;
      const domainWait = Math.max(0, lastAt + config.scrape.domainDelayMs - Date.now());
      const baseWait = index === 0 ? 0 : config.scrape.delayMs;
      const wait = Math.max(domainWait, baseWait) + randomJitter(1200);
      if (wait > 0) await sleep(wait);

      try {
        let result = byUrl.get(target.url);
        if (!result) {
          result = await scrapeProductUrl(target.url, {
            mode: config.scrape.jobsHeadless ? config.scrape.headless : "never",
            useCache: true,
          });
          byUrl.set(target.url, result);
        }

        const price = result.hadProductData ? result.candidates.price[0] : undefined;
        const inStock =
          result.availability != null
            ? result.availability
            : result.httpStatus === 404 || result.httpStatus === 410
              ? false
              : undefined;

        const changes: {
          priceCents?: number | null;
          currency?: string;
          inStock?: boolean | null;
        } = {};
        if (price && price.value !== target.priceCents) {
          changes.priceCents = price.value;
          changes.currency = price.currency;
        }
        if (inStock != null) changes.inStock = inStock;

        updateItemFromScrape(target.id, changes);
        if (Object.keys(changes).length > 0) {
          updated += 1;
          if (changes.priceCents != null) {
            log(`Price updated for item ${target.id}: ${price?.label}.`);
          }
        }
      } catch (error) {
        failed += 1;
        updateItemFromScrape(target.id, {});
        log(
          `Could not refresh item ${target.id}: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        );
      }
      lastDomainAt.set(domain, Date.now());
    }

    log(
      `Finished in ${Math.round((Date.now() - started) / 1000)}s. ${updated} updated, ${failed} failed.`,
    );
  } finally {
    g.__wishlistScrapeRunning = false;
  }
}

export function startScheduler(): void {
  const g = globalThis as GlobalWithJob;
  if (g.__wishlistCronStarted) return;
  g.__wishlistCronStarted = true;

  if (!config.scrape.enabled) {
    log("Price refresh is disabled (SCRAPE_ENABLED=false).");
    return;
  }

  if (!cron.validate(config.scrape.cron)) {
    log(`Invalid SCRAPE_CRON expression: ${config.scrape.cron}. Scheduler not started.`);
    return;
  }

  try {
    cron.schedule(
      config.scrape.cron,
      async () => {
        try {
          await runScrapeQueue("cron");
        } catch (error) {
          log(`Price refresh failed: ${error instanceof Error ? error.message : "unknown error"}`);
        }
      },
      {
        timezone: config.timezone,
        noOverlap: true,
        name: "wishlist-price-refresh",
        unref: true,
      },
    );
  } catch (error) {
    log(
      `Scheduler not started: ${error instanceof Error ? error.message : "invalid configuration"}`,
    );
    return;
  }

  log(
    `Price refresh scheduled with "${config.scrape.cron}"${
      config.timezone ? ` (${config.timezone})` : ""
    }.`,
  );
}
