"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, ShareIcon } from "./icons";

export function CopyLink({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && Boolean(navigator.share));
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      const input = document.getElementById("share-link-input") as HTMLInputElement | null;
      input?.select();
      document.execCommand("copy");
      setCopied(true);
    }
  }

  async function share() {
    if (canShare) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        return;
      }
    }
    await copy();
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="share-link-input"
          readOnly
          value={url}
          className="input flex-1 text-[13px]"
          onFocus={(event) => event.currentTarget.select()}
          aria-label="Wishlist link"
        />
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void copy()}>
            {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
            {copied ? "Copied" : "Copy link"}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void share()}>
            <ShareIcon className="size-3.5" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
