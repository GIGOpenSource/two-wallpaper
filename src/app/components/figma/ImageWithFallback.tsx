import React, { useEffect, useState } from 'react';

/** 加载失败时的占位图（浅灰底 + 图片图标） */
const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false);
  const { src, alt, style, className, onError, ...rest } = props;

  useEffect(() => {
    setDidError(false);
  }, [src]);

  const showFallback = didError || !src;

  if (showFallback) {
    return (
      <div
        className={`bg-muted flex items-center justify-center overflow-hidden ${className ?? ''}`}
        style={style}
        role="img"
        aria-label={alt || 'Image unavailable'}
        data-original-url={typeof src === 'string' ? src : undefined}
      >
        <img
          src={ERROR_IMG_SRC}
          alt=""
          className="w-1/3 h-1/3 max-w-24 max-h-24 object-contain opacity-40"
          draggable={false}
        />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      {...rest}
      onError={(event) => {
        setDidError(true);
        onError?.(event);
      }}
    />
  );
}
