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
      <div 
        className={`flex items-center justify-center text-xxs w-full h-[60px] rounded-lg ${className || ""}`}
        style={{ backgroundColor: "#f3f4f6", color: "#9ca3af", border: "1px solid #e5e7eb" }}
      >
        加载失败
      </div>
    );
  }

  if (!url) {
    return (
      <div 
        className={`animate-pulse w-full h-[60px] rounded-lg ${className || ""}`} 
        style={{ backgroundColor: "#f3f4f6" }}
      />
    );
  }

  return (
    <img
      src={url}
      className={className}
      {...props}
    />
  );
}
