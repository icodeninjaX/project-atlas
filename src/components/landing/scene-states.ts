// Scroll choreography for the landing page's System Core scene.
//
// Each chapter of the page (a `[data-chapter]` section) maps to one scene state.
// While a chapter is pinned the scene holds that state; between chapters the
// engine blends the two neighbouring states.

export const LANDING_CHAPTERS = [
  "hero",
  "fracture",
  "money",
  "tasks",
  "goals",
  "career",
  "reflection",
  "intelligence",
  "dayline",
  "trust",
  "home",
  "cta",
] as const;

export type LandingChapter = (typeof LANDING_CHAPTERS)[number];

/** Piece order follows the domains clockwise from the top of the mark. */
export const CORE_DOMAINS = [
  "Money",
  "Tasks",
  "Goals",
  "Career",
  "Reflection",
] as const;

/** Stops on the example Sunday route, one per domain, in domain order. */
export const ROUTE_STOPS = [
  { time: "07:30", title: "Pay Maya Credit", note: "₱1,250.00 · due Tue" },
  { time: "09:00", title: "Deep work", note: "Client landing page" },
  { time: "12:30", title: "Milestone", note: "Portfolio v2 case study" },
  { time: "16:00", title: "Follow up", note: "Canva · Product Designer" },
  { time: "20:00", title: "Weekly review", note: "Mon–Sun reflection" },
] as const;

export type PieceLayout =
  "assembled" | "exploded" | "focus" | "orbit" | "route";

export type SceneState = {
  layout: PieceLayout;
  /** Domain index brought forward in the `focus` layout. */
  focus: number;
  /** Horizontal side (-1 left, 1 right) that the subject occupies. */
  side: -1 | 0 | 1;
  /** Core glow strength, 0–1. */
  glow: number;
  /** Particle streams flowing into the open center, 0–1. */
  streams: number;
  /** Orbit rings, 0–1. */
  rings: number;
  /** Dayline route line drawn through the pieces, 0–1. */
  route: number;
  /** Floating domain name labels, 0–1. */
  domainLabels: number;
  /** Floating route stop labels, 0–1. */
  routeLabels: number;
  /** Overall scene visibility, 0–1. */
  visibility: number;
  /** Assembled/exploded scale multiplier. */
  scale: number;
};

const base: SceneState = {
  layout: "assembled",
  focus: 0,
  side: 1,
  glow: 0.55,
  streams: 0,
  rings: 0,
  route: 0,
  domainLabels: 0,
  routeLabels: 0,
  visibility: 1,
  scale: 1,
};

function focusOn(focus: number, side: -1 | 1): SceneState {
  return { ...base, layout: "focus", focus, side, glow: 0.15 };
}

export const SCENE_STATES: Record<LandingChapter, SceneState> = {
  hero: { ...base },
  fracture: {
    ...base,
    layout: "exploded",
    side: 0,
    glow: 0.25,
    rings: 0.55,
    domainLabels: 1,
  },
  money: focusOn(0, 1),
  tasks: focusOn(1, -1),
  goals: focusOn(2, 1),
  career: focusOn(3, -1),
  reflection: focusOn(4, 1),
  intelligence: {
    ...base,
    layout: "orbit",
    side: 1,
    glow: 1,
    streams: 1,
    rings: 1,
  },
  dayline: {
    ...base,
    layout: "route",
    side: 0,
    glow: 0.1,
    route: 1,
    routeLabels: 1,
  },
  trust: { ...base, side: 1, glow: 0.9, scale: 0.92 },
  home: { ...base, side: 1, glow: 0.5, scale: 0.8, visibility: 0.35 },
  cta: { ...base, side: 0, glow: 0.4, scale: 0.8, visibility: 0 },
};

/**
 * Converts a raw 0–1 position between two chapter anchors into a blend
 * weight. The first and last fifth of the gap hold the neighbouring states so
 * that each chapter reads as a still frame while its copy is on screen.
 */
export function chapterBlend(progress: number, hold = 0.2): number {
  const clamped = Math.min(1, Math.max(0, progress));
  const t = Math.min(1, Math.max(0, (clamped - hold) / (1 - hold * 2)));
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export type ChapterAnchor = { chapter: LandingChapter; scrollY: number };

/** Finds the two chapter states surrounding a scroll position. */
export function resolveChapterBlend(
  anchors: ReadonlyArray<ChapterAnchor>,
  scrollY: number,
): { from: LandingChapter; to: LandingChapter; weight: number } {
  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  if (!first || !last) return { from: "hero", to: "hero", weight: 0 };
  if (scrollY <= first.scrollY) {
    return { from: first.chapter, to: first.chapter, weight: 0 };
  }
  for (let index = 0; index < anchors.length - 1; index += 1) {
    const current = anchors[index]!;
    const next = anchors[index + 1]!;
    if (scrollY < next.scrollY) {
      const span = Math.max(1, next.scrollY - current.scrollY);
      return {
        from: current.chapter,
        to: next.chapter,
        weight: chapterBlend((scrollY - current.scrollY) / span),
      };
    }
  }
  return { from: last.chapter, to: last.chapter, weight: 0 };
}
