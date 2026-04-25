'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-GB">
      <body className="min-h-screen bg-[#030508] font-sans text-[#fff8e0] antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <h1 className="mb-2 text-center text-lg font-semibold tracking-wide">
            Something went wrong
          </h1>
          <p className="mb-6 max-w-md text-center text-sm text-white/55">
            {error.digest ? `Reference: ${error.digest}` : error.message}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full border border-white/20 bg-white/10 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
