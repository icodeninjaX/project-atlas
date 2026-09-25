# Landing experience

The public landing page (`src/app/(landing)/page.tsx`) is a scroll-driven 3D
story built around the ATLAS System Core mark. The mark's five pieces stand for
Money, Tasks, Goals, Career and Reflection; the open center stands for the
intelligence layer.

## Chapters

| Chapter                | Scene                                                         |
| ---------------------- | ------------------------------------------------------------- |
| `hero`                 | Assembled core, slowly turning                                |
| `fracture`             | Core explodes into a labelled ring of five domains            |
| `money` … `reflection` | One piece comes forward beside its copy and UI panel          |
| `intelligence`         | Pieces orbit the glowing center; particle streams flow inward |
| `dayline`              | Pieces align on a route line as the example Sunday Dayline    |
| `trust`                | Core reassembles                                              |
| `home`, `cta`          | Scene fades out for the Manila image and the Seedance film    |

`scene-states.ts` holds the per-chapter states and the blend math (unit tested).
`system-core-engine.ts` is plain three.js: it extrudes the traced outlines in
`system-core-outlines.ts`, blends the two states around the current scroll
position, and damps toward them each frame. `landing-stage.tsx` lazy-loads the
engine on the client and falls back to a still render without WebGL.
`landing-motion.tsx` adds Lenis smooth scrolling, reveal-on-view and the
chapter rail. All motion is reduced or disabled under
`prefers-reduced-motion`.

To retrace the outlines after a logo change, label the connected components of
`public/brand/atlas-system-core.png`, trace each outer boundary, simplify it,
and normalise around the combined centroid so the outermost point sits on the
unit circle.

## Media

Generated with Higgsfield on 2026-09-25:

- `public/landing/system-core-glass.webp` and `src/app/opengraph-image.jpg` —
  GPT Image 2.5 (Sunburst) glass render of the System Core, using the mark as
  a reference image.
- `public/landing/manila-blue-hour.webp` — GPT Image 2.5 (Sunburst).
- `public/landing/system-core-film.{mp4,webm}` and its poster — Seedance 2.5,
  8 s loop from the glass render, transcoded to H.264 and VP9 for browser
  support.

The UI panels use fictional example records.
