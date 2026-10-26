import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Bell,
  Image as ImageIcon,
  KeyRound,
  Lock,
  Server,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Privacy — OurDiary 🔒',
  description:
    'How OurDiary looks after your photos, letters and messages: encrypted on your device before upload, a key of your own, and a plain account of what we can and cannot see.',
};

const HERO_PHOTO =
  'https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=1200&auto=format&fit=crop&q=80';

const UPLOAD_STEPS = [
  {
    title: 'You pick a photo',
    body: 'It stays on your phone or laptop. Nothing has been sent anywhere yet.',
  },
  {
    title: 'Your device compresses it',
    body: 'Re-encoding the image strips the EXIF block a camera writes, so the coordinates of where you were standing do not travel with the picture.',
  },
  {
    title: 'Your device encrypts it',
    body: 'Still on your machine, the file is sealed with your couple’s own key using AES-GCM. From this point on, it is scrambled bytes.',
  },
  {
    title: 'Only then does it leave',
    body: 'What gets uploaded is the scrambled version. Storage holds a file nobody can look at by opening it.',
  },
  {
    title: 'It opens again in your browser',
    body: 'When one of you views the memory, your browser fetches the key and decrypts the photo locally — the picture is only ever reassembled on a device that belongs to you.',
  },
];

const PROMISES = [
  {
    icon: KeyRound,
    title: 'A key of your own',
    body: 'Every couple gets one random 256-bit key, generated for you and used for nothing and nobody else. Your photos are not sitting behind the same lock as everyone else’s.',
  },
  {
    icon: Server,
    title: 'The key is wrapped, not filed away',
    body: 'Your key is itself encrypted with a master key that lives only in the running server’s environment — never in the database. A stolen database dump or a leaked backup is noise on its own.',
  },
  {
    icon: Lock,
    title: 'Encryption that notices tampering',
    body: 'AES-GCM authenticates as well as encrypts. If a stored file is altered by so much as a byte, it refuses to open rather than quietly handing back something wrong.',
  },
  {
    icon: ImageIcon,
    title: 'Your location stays yours',
    body: 'Phones tag photos with exact GPS coordinates. Because every image is re-compressed before it is encrypted, that tag is gone before the file ever moves.',
  },
  {
    icon: ShieldCheck,
    title: 'No other couple can reach your space',
    body: 'Row-level security means the database itself refuses to hand your rows to anyone outside your space. It is not a check in app code that a bug could skip — the rule lives one layer below the app.',
  },
  {
    icon: Lock,
    title: 'Passwords are hashed, never stored',
    body: 'Your password is turned into a hash that cannot be turned back. We could not read it to you if you asked — and neither could anyone who got hold of the database.',
  },
  {
    icon: Trash2,
    title: 'Deleting means deleting',
    body: 'Every table that belongs to your space is tied to it with a database cascade. Close the space and the memories, letters, messages, notifications and your encryption key go with it.',
  },
  {
    icon: Bell,
    title: 'No ads, no data sales, no trackers',
    body: 'There is no advertising here, nothing about you is sold or shared, and no third-party analytics scripts follow you around the app.',
  },
];

export default function PrivacyPage() {
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-300">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[1.25rem] bg-hero border border-line shadow-card">
          <div className="grid lg:grid-cols-[1.15fr_1fr] gap-8 p-6 sm:p-10 items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                Privacy
              </p>
              <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink mt-2 leading-tight">
                This is your diary.
                <br />
                We built it like one.
              </h1>
              <p className="text-sm sm:text-base text-ink-muted mt-4 max-w-xl leading-relaxed">
                Years of photographs, half-finished letters and two in the morning messages end up
                in here. That deserves more than a privacy policy nobody reads, so here is the
                actual engineering — in plain words, with nothing dressed up.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/80 border border-line text-[11px] font-semibold text-ink">
                  <Lock className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  Encrypted before upload
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/80 border border-line text-[11px] font-semibold text-ink">
                  <KeyRound className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  Your own key
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/80 border border-line text-[11px] font-semibold text-ink">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  No ads, ever
                </span>
              </div>
            </div>

            <div className="relative">
              <img
                src={HERO_PHOTO}
                alt=""
                aria-hidden="true"
                className="w-full h-56 sm:h-72 object-cover rounded-[1.25rem] border border-line shadow-card"
              />
              <div className="absolute -bottom-4 -left-4 hidden sm:flex items-center gap-2 px-4 py-3 rounded-2xl bg-surface border border-line shadow-card">
                <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
                <span className="text-xs font-semibold text-ink">Two people. One locked room.</span>
              </div>
            </div>
          </div>
        </section>

        {/* The upload journey */}
        <section aria-labelledby="journey" className="space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              What actually happens
            </p>
            <h2 id="journey" className="font-display text-2xl sm:text-3xl font-semibold text-ink mt-1">
              The life of one photo
            </h2>
            <p className="text-sm text-ink-muted mt-2 max-w-2xl leading-relaxed">
              From the moment you choose it to the moment your partner sees it, here is every place
              it goes.
            </p>
          </div>

          <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {UPLOAD_STEPS.map((step, index) => (
              <li
                key={step.title}
                className="rounded-[1.25rem] bg-surface border border-line shadow-card p-5 sm:p-6"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-hero border border-line font-display text-base font-semibold text-ink tabular-nums"
                >
                  {index + 1}
                </span>
                <h3 className="font-display text-lg font-semibold text-ink mt-3">{step.title}</h3>
                <p className="text-sm text-ink-muted mt-1.5 leading-relaxed">{step.body}</p>
              </li>
            ))}
            <li className="rounded-[1.25rem] bg-hero border border-line shadow-card p-5 sm:p-6 flex flex-col justify-center">
              <Lock className="w-6 h-6 text-primary" aria-hidden="true" />
              <p className="text-sm text-ink mt-3 leading-relaxed">
                The short version: the file is already unreadable before it crosses the network, and
                it stays that way the whole time it is stored. Videos skip step two — a browser
                cannot usefully shrink them — but they are sealed with the same key, on your device,
                before they move.
              </p>
            </li>
          </ol>
        </section>

        {/* The promises */}
        <section aria-labelledby="promises" className="space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              How it holds up
            </p>
            <h2 id="promises" className="font-display text-2xl sm:text-3xl font-semibold text-ink mt-1">
              Eight things we can promise you
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {PROMISES.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="rounded-[1.25rem] bg-surface border border-line shadow-card p-5 sm:p-6"
              >
                <div className="w-10 h-10 rounded-2xl bg-hero border border-line flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink mt-3">{title}</h3>
                <p className="text-sm text-ink-muted mt-1.5 leading-relaxed">{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Notification previews */}
        <section
          aria-labelledby="previews"
          className="rounded-[1.25rem] bg-surface border border-line shadow-card p-6 sm:p-10"
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 shrink-0 rounded-2xl bg-hero border border-line flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" aria-hidden="true" />
            </div>
            <div className="space-y-4">
              <div>
                <h2 id="previews" className="font-display text-2xl sm:text-3xl font-semibold text-ink">
                  The one choice we hand to you
                </h2>
                <p className="text-sm text-ink-muted mt-2 leading-relaxed max-w-2xl">
                  A notification cannot quote a message the server cannot read. So rather than
                  weaken anything, we made it a switch you own.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-hero border border-line p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Off — the default
                  </p>
                  <p className="text-sm text-ink mt-2 leading-relaxed">
                    Your lock screen says{' '}
                    <span className="font-semibold">“You have a new message”</span> and nothing else.
                    Whoever glances at your phone learns only that your person was thinking of you.
                  </p>
                </div>
                <div className="rounded-2xl bg-surface border border-line p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    On — if you want it
                  </p>
                  <p className="text-sm text-ink mt-2 leading-relaxed">
                    The sending device writes a short snippet of its own message as it sends, so the
                    notification can show the first line.
                  </p>
                </div>
              </div>

              <p className="text-sm text-ink-muted leading-relaxed max-w-2xl">
                Changing the setting never rewrites anything you have already sent. Each message
                keeps the promise it was sent under: turn previews on today and yesterday’s messages
                stay silent, turn them off and the snippets stop at that moment.
              </p>

              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-on-primary font-semibold text-xs shadow-cta transition-colors"
              >
                <Bell className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Choose this in Settings</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Honest limits */}
        <section
          aria-labelledby="straight"
          className="rounded-[1.25rem] bg-hero border border-line shadow-card p-6 sm:p-10"
        >
          <h2 id="straight" className="font-display text-2xl sm:text-3xl font-semibold text-ink">
            Being straight with you
          </h2>
          <div className="grid sm:grid-cols-3 gap-5 mt-5">
            <p className="text-sm text-ink leading-relaxed">
              Encrypting your media protects it from the things that actually go wrong: a stolen
              backup, a leaked bucket, a misconfigured server. That is a real and worthwhile
              guarantee, and it is the one we are making.
            </p>
            <p className="text-sm text-ink leading-relaxed">
              It is not the same as saying nobody here could ever decrypt a photo. The server holds
              the master key, so technically it could. We would rather tell you that than write a
              sentence that sounds better and is not true.
            </p>
            <p className="text-sm text-ink leading-relaxed">
              Your private notes and letters are the pieces we are making unreadable even to us, and
              we will never go looking through your space — the only time anyone would open anything
              is if you ask us for help and want us to.
            </p>
          </div>
        </section>

        {/* Closing note */}
        <section className="rounded-[1.25rem] bg-surface border border-line shadow-card p-6 sm:p-10 text-center">
          <ShieldCheck className="w-7 h-7 text-primary mx-auto" aria-hidden="true" />
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink mt-3">
            Write like nobody is reading
          </h2>
          <p className="text-sm text-ink-muted mt-3 max-w-2xl mx-auto leading-relaxed">
            Every decision on this page was made so the two of you can be unguarded in here — the
            silly photo, the apology you took three drafts to write, the thing you would only say at
            one in the morning. That is what this is for. We will keep it that way, and we will keep
            telling you the truth about how.
          </p>
          <p className="text-xs text-ink-muted mt-5">
            Something here unclear, or a question we have not answered?{' '}
            <Link href="/settings" className="font-semibold text-primary hover:underline">
              Your settings
            </Link>{' '}
            are where every one of these choices lives.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
