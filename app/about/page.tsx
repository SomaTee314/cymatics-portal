import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/site';

const title = 'About — Cymatics Portal × SomaTea';

export const metadata: Metadata = {
  title,
  description:
    'Cymatics Portal bridges ancient sound wisdom with modern WebGL — vibration, geometry, and the Tesla lineage of frequency.',
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title,
    type: 'website',
    url: `${SITE_URL}/about`,
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#030508] px-4 py-16 text-[#fff8e0]">
      <div className="mx-auto max-w-2xl">
        <p className="mb-8 text-center">
          <Link
            href="/"
            className="text-sm text-white/50 underline-offset-4 hover:text-white hover:underline"
          >
            ← Experience the portal
          </Link>
        </p>

        <h1 className="mb-2 text-center font-mono text-xs tracking-[0.2em] text-white/40">
          Cymatics Portal &times; SomaTea
        </h1>
        <p className="mb-10 text-center text-sm text-white/35">Nocturnal Labs</p>

        <div className="space-y-6 text-[0.95rem] leading-relaxed text-white/85">
          <p>
            Cymatics Portal is a gateway back to the oldest truth humanity ever knew: that the
            universe is not built from matter, but from vibration. Across ancient civilizations—from
            the Vedic concept of Nāda Brahma (&ldquo;the world is sound&rdquo;) to the Pythagorean
            belief in the &ldquo;music of the spheres&rdquo;—sound was understood as a living force
            that shapes consciousness and form.
          </p>
          <p>
            Modern cymatics reveals what the ancients intuited: frequency creates geometry, and
            geometry creates experience. This app bridges that lineage into the present moment,
            weaving healing sound frequencies with reactive visual intelligence.
          </p>
          <p>
            Each tone becomes a pattern, each pattern becomes a feeling, and each feeling becomes a
            step toward coherence.
          </p>
          <p>
            Cymatics Portal invites you to witness your inner world made visible, to let vibration
            guide you back into alignment, and to remember that you are not separate from the
            harmony—you are part of the song.
          </p>
        </div>

        <blockquote className="my-10 border-l-2 border-[#ffb84d]/40 py-1 pl-5 text-[0.95rem] italic text-white/75">
          <p>
            &ldquo;If you want to find the secrets of the universe, think in terms of energy,
            frequency and vibration.&rdquo;
          </p>
          <cite className="mt-3 block text-sm font-normal not-italic text-[#55f8ff]/90">
            — Nikola Tesla
          </cite>
        </blockquote>

        <p className="text-[0.95rem] leading-relaxed text-white/80">
          Chladni standing-wave physics simulation, 9 Solfeggio healing frequency presets, real-time
          FFT audio analysis with microphone input, Mandelbrot and Julia fractal visualisations, and
          sacred geometry patterns — all rendered in WebGL at up to 111,111 particles.
        </p>

        <div className="mt-12 flex justify-center">
          <Link
            href="/"
            className="inline-flex rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium tracking-wide text-white transition-colors hover:border-white/25 hover:bg-white/10"
          >
            Experience It Now →
          </Link>
        </div>
      </div>
    </div>
  );
}
