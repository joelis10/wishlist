"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon } from "./icons";

type ImageFieldProps = {
  initialPath?: string | null;
  allowRemove?: boolean;
};

export function ImageField({ initialPath = null, allowRemove = false }: ImageFieldProps) {
  const [preview, setPreview] = useState<string | null>(initialPath);
  const [remove, setRemove] = useState(false);
  const [isBlob, setIsBlob] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function choose(file: File | null) {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    if (file) {
      setPreview(URL.createObjectURL(file));
      setIsBlob(true);
      setRemove(false);
    } else {
      setPreview(initialPath);
      setIsBlob(false);
    }
  }

  function clear() {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    if (inputRef.current) inputRef.current.value = "";
    if (initialPath) {
      setPreview(null);
      setRemove(true);
      setIsBlob(false);
    } else {
      setPreview(null);
      setIsBlob(false);
    }
  }

  return (
    <div>
      <span className="label">Image</span>
      <div className="flex items-center gap-4">
        <div className="relative flex aspect-[16/10] w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-raised text-muted">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="size-5" />
          )}
        </div>
        <div>
          <label className="btn btn-secondary btn-sm cursor-pointer">
            {preview || isBlob ? "Replace" : "Upload"}
            <input
              ref={inputRef}
              type="file"
              name="image"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              className="sr-only"
              onChange={(event) => choose(event.target.files?.[0] || null)}
            />
          </label>
          {preview ? (
            <button type="button" onClick={clear} className="btn btn-ghost btn-sm ml-1">
              Remove
            </button>
          ) : null}
          <p className="mt-1.5 text-xs text-muted">JPG, PNG, WebP, AVIF or GIF. 8 MB max.</p>
        </div>
      </div>
      {allowRemove ? <input type="hidden" name="removeImage" value={remove ? "on" : ""} /> : null}
    </div>
  );
}
