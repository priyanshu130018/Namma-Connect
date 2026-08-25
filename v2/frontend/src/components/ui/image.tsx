import * as React from "react";
import { Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AppImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  aspectRatio?: "square" | "video" | "wide" | "portrait" | "auto";
  containerClassName?: string;
}

const aspectClasses = {
  square: "aspect-square",
  video: "aspect-video",
  wide: "aspect-[16/10]",
  portrait: "aspect-[3/4]",
  auto: "",
};

export function AppImage({
  src,
  alt = "Image",
  fallbackSrc,
  aspectRatio = "wide",
  containerClassName,
  className,
  ...props
}: AppImageProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  const fallback =
    fallbackSrc ||
    "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22250%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20250%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22400%22%20height%3D%22250%22%20fill%3D%22%23f1f5f9%22%3E%3C%2Frect%3E%3Ctext%20x%3D%22120%22%20y%3D%22135%22%20fill%3D%22%2394a3b8%22%20font-size%3D%2216%22%20font-family%3D%22sans-serif%22%3ENamma%20Connect%3C%2Ftext%3E%3C%2Fsvg%3E";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-slate-100",
        aspectClasses[aspectRatio],
        containerClassName
      )}
    >
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-slate-200" />
      )}

      {hasError ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 text-slate-400 p-4 text-center">
          <ImageIcon className="h-8 w-8 mb-1 opacity-50" />
          <span className="text-xs font-semibold text-slate-500">
            {alt || "Image unavailable"}
          </span>
        </div>
      ) : (
        <img
          src={src || fallback}
          alt={alt}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          className={cn(
            "h-full w-full object-cover transition-all duration-300",
            isLoading ? "opacity-0 scale-95" : "opacity-100 scale-100",
            className
          )}
          {...props}
        />
      )}
    </div>
  );
}
