import React, { useEffect, useState } from "react";
import { db } from "../lib/db";

interface ScreenshotImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  screenshotId: string;
}

export default function ScreenshotImage({ screenshotId, className, ...props }: ScreenshotImageProps) {
  const [url, setUrl] = useState<string>("");
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    let generatedUrl = "";

    async function fetchBlob() {
      try {
        const record = await db.screenshots.get(screenshotId);
        if (record && record.blob && active) {
          generatedUrl = URL.createObjectURL(record.blob);
          setUrl(generatedUrl);
        } else if (active) {
          setError(true);
        }
      } catch (err) {
        console.error("Error loading screenshot blob:", err);
        if (active) setError(true);
      }
    }

    fetchBlob();

    return () => {
      active = false;
      if (generatedUrl) {
        URL.revokeObjectURL(generatedUrl);
      }
    };
  }, [screenshotId]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-[var(--color-bg-hover)] text-xxs text-[var(--text-muted)] w-full h-[60px] rounded-lg border border-[var(--color-border-subtle)] ${className || ""}`}>
        加载失败
      </div>
    );
  }

  if (!url) {
    return <div className={`animate-pulse bg-[var(--color-bg-hover)] w-full h-[60px] rounded-lg ${className || ""}`} />;
  }

  return (
    <img
      src={url}
      className={className}
      {...props}
    />
  );
}
