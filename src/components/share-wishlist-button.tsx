"use client";

import { useState } from "react";
import { ShareIcon } from "./icons";
import { CopyLink } from "./copy-link";
import { Modal } from "./modal";

export function ShareWishlistButton({ title, url }: { title: string; url: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => setOpen(true)}
        aria-label="Share wishlist"
      >
        <ShareIcon className="size-4" />
        <span className="hidden xs:inline">Share</span>
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Share wishlist"
        size="md"
        footer={
          <div className="flex justify-end">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        }
      >
        <div className="space-y-3 pb-2">
          <p className="text-sm text-muted">
            Anyone with this link can view it. Add people with specific access in wishlist settings.
          </p>
          <CopyLink url={url} title={title} />
        </div>
      </Modal>
    </>
  );
}
