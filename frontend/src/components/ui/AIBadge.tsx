/**
 * AI Badge — purple sparkle icon + "AI" text in a pill.
 * Matches the design: ✦ AI on light indigo background.
 */
export default function AIBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-500 text-xs font-semibold ${className}`}>
      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 1l1.5 3.5L13 6l-3.5 1.5L8 11 6.5 7.5 3 6l3.5-1.5L8 1z"
          fill="currentColor"
          opacity="0.7"
        />
        <path
          d="M12 9l.75 1.75L14.5 11.5l-1.75.75L12 14l-.75-1.75-1.75-.75 1.75-.75L12 9z"
          fill="currentColor"
          opacity="0.5"
        />
      </svg>
      AI
    </span>
  );
}
