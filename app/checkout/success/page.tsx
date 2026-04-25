import Link from 'next/link';

export default function CheckoutSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-white">
      <h1 className="mb-3 text-2xl font-semibold">Thank you</h1>
      <p className="mb-6 max-w-md text-center text-white/60">
        Your checkout completed. Subscription status updates via Polar webhooks — refresh the app
        in a moment if permissions don&apos;t update immediately.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-white px-6 py-2 text-sm font-medium text-black hover:bg-white/90"
      >
        Open Cymatics Portal
      </Link>
    </div>
  );
}
