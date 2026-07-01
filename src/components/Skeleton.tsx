interface Props {
  className?: string
  /** 'light' for cream/white backgrounds, 'dark' for carbon backgrounds */
  tone?: 'light' | 'dark'
}

// Single pulsing block. Compose these into shapes that mirror the
// real content (a card, a row, a table cell) so the loading state
// telegraphs what's about to appear instead of just saying "wait".
export default function Skeleton({ className = '', tone = 'light' }: Props) {
  const fill = tone === 'dark' ? 'bg-white/10' : 'bg-black/8'
  return <div className={`animate-pulse rounded-md ${fill} ${className}`} />
}
