import { NextRequest, NextResponse } from 'next/server';

type SectionResult = { section: string; ok: boolean; ms: number; detail?: string };

const now = () => performance.now();

// Validates an exported diary JSON payload on the server and logs per-section timings.
export async function POST(req: NextRequest) {
  const text = await req.text();
  const sections: SectionResult[] = [];

  const finish = (success: boolean, error?: string, status = 200) => {
    const total = sections.reduce((sum, s) => sum + s.ms, 0);
    const lines = sections
      .map((s) => `  - ${s.section}: ${s.ok ? 'ok' : 'FAIL'} in ${s.ms.toFixed(2)}ms${s.detail ? ` (${s.detail})` : ''}`)
      .join('\n');
    console.log(
      `[OurDiary Import/server] ${text.length} byte(s), success=${success}, total=${total.toFixed(2)}ms\n${lines}`
    );
    return NextResponse.json({ success, error, sections }, { status });
  };

  const check = (section: string, fn: () => string | undefined | void) => {
    const t0 = now();
    const detail = fn() ?? undefined;
    sections.push({ section, ok: true, ms: now() - t0, detail });
  };
  const fail = (section: string, t0: number, error: string) => {
    sections.push({ section, ok: false, ms: now() - t0 });
    return finish(false, error, 400);
  };

  let parsed: any;
  const tParse = now();
  try {
    parsed = JSON.parse(text);
  } catch (err: any) {
    return fail('parse', tParse, err?.message || 'Failed to parse JSON');
  }
  sections.push({ section: 'parse', ok: true, ms: now() - tParse });

  const tRoot = now();
  if (!parsed || typeof parsed !== 'object') {
    return fail('root', tRoot, 'Invalid JSON: root must be an object');
  }
  check('root', () => undefined);

  const tCouple = now();
  if (!parsed.couple || !parsed.couple.name || !parsed.couple.startDate) {
    return fail('couple', tCouple, 'Missing couple information in imported data');
  }
  check('couple', () => undefined);

  const arrays: [string, string][] = [
    ['memories', 'Memories array missing'],
    ['events', 'Events array missing'],
    ['letters', 'Letters array missing'],
    ['bucketList', 'Bucket list array missing'],
  ];
  for (const [key, message] of arrays) {
    const t0 = now();
    if (!Array.isArray(parsed[key])) return fail(key, t0, message);
    check(key, () => `${parsed[key].length} item(s)`);
  }

  return finish(true);
}
