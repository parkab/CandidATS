import type { CSSProperties, ReactNode } from 'react';

type PolaroidShellProps = {
  children: ReactNode;
  angle?: number;
  useTilt?: boolean;
  className?: string;
  hoverClassName?: string;
};

export default function PolaroidShell({
  children,
  angle = 0,
  useTilt = true,
  className = '',
  hoverClassName,
}: PolaroidShellProps) {
  const articleStyle = useTilt
    ? ({ '--tilt': `${angle}deg` } as CSSProperties)
    : undefined;

  const baseClassName =
    'mx-auto w-full max-w-60 rounded-sm border border-black/10 bg-(--foreground) p-3 pb-5 text-(--background) shadow-[0_10px_24px_rgba(0,0,0,0.28)] transition-transform duration-200';

  const tiltClassName = useTilt ? 'transform-[rotate(var(--tilt))]' : '';

  const resolvedHoverClassName =
    hoverClassName ??
    (useTilt
      ? 'hover:transform-[translateY(-0.25rem)_rotate(var(--tilt))]'
      : 'hover:-translate-y-1');

  const combinedClassName = [
    baseClassName,
    tiltClassName,
    resolvedHoverClassName,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article style={articleStyle} className={combinedClassName}>
      {children}
    </article>
  );
}
