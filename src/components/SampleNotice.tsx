// PUBLIC REPO ONLY. Do not copy into japan-trip-tools (see CLAUDE.md).
// The demo ships a sample itinerary, so say so on every screen and wherever a hotel is shown.
export const sampleNoticeEnabled = (base: string = import.meta.env.BASE_URL): boolean => base === '/japan-trip-tools-public/';

export const SAMPLE_NOTICE = 'SAMPLE ITINERARY · HOTELS ARE PLACEHOLDERS';

// Slim bar pinned to the top of every screen.
export function SampleBanner() {
  if (!sampleNoticeEnabled()) return null;
  return <div class="sample-banner" role="note" data-testid="sample-banner">{SAMPLE_NOTICE}</div>;
}

// Inline line for hotel lists and the full-screen taxi card.
export function SampleHotelNote({ card }: { card?: boolean }) {
  if (!sampleNoticeEnabled()) return null;
  return <p class={card ? 'sample-note on-card' : 'sample-note'} data-testid="sample-hotel-note">{SAMPLE_NOTICE}</p>;
}
