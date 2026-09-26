# Multimodal Capture — Phase 18 release contract

**Status:** Implemented and deployed 2026-09-26. Signed-in browser acceptance remains open.

## Supported entry and review

- Typed text and copied email use the existing Capture 2.0 batch proposal flow.
- PNG, JPEG, and WebP photos/screenshots; PDF and UTF-8 TXT documents; and MP3, M4A, MP4, WAV, and WebM voice notes can be selected in Capture. Mobile file selection can offer the camera or recorder supplied by the device.
- The authenticated extraction endpoint validates a 4 MB cap, extension and file signature (or strict UTF-8 for TXT), then uses OpenAI vision/document reading or `gpt-transcribe`. TXT is read locally. The cap leaves room under Vercel's [4.5 MB function request limit](https://vercel.com/docs/functions/limitations). Unreadable or incomplete extraction returns an error and leaves manual entry available.
- Extracted text is editable before proposal generation. The existing 1,000-character batch limit and five-action limit still apply. Each proposal shows its source phrase, file/method, line in corrected text, confidence, warnings, and exact source snippets for grounded fields. File fingerprints warn when the same owner previews the same file again during the preview retention window.
- Media-derived amounts and dates require an explicit source-review checkbox before confirmation. The existing owner-scoped, one-time preview claim and deterministic domain actions remain the only write path. No extraction result saves a domain record on its own.

## Data handling

Original files are processed in memory for the extraction request. ATLAS does not store them in Supabase Storage, the application database, or the public filesystem. The browser can remove the selected source and extracted text before preview. Once previewed, corrected text fragments and bounded provenance metadata are held in the existing owner-scoped `capture_batch_previews` records, expire after 30 minutes, and are pruned by the Phase 17 schedule. Confirmed domain records follow their existing retention and deletion rules. A SHA-256 file fingerprint is held only in those temporary previews.

Vision/PDF and transcription inputs go to OpenAI only after the user requests extraction; corrected text goes to the selected Capture model only after the user requests a preview. The vision/PDF request sets `store: false`; transcription uses the Audio Transcriptions API. OpenAI project data-sharing settings and provider retention remain external to ATLAS. The UI discloses provider sharing before either action. Source content is always treated as untrusted data and cannot supply record IDs or authorize writes.

## Validation and production release

- Focused media, route, batch action, and workspace tests pass, including auth denial, signature validation, transient extraction, audio/PDF request shape, incomplete extraction, corrected text, duplicate warning, and explicit review.
- Full application suite: 544 passed, 29 skipped across 110 files in main-branch CI on 2026-09-26. Lint passed.
- Synthetic live provider checks returned HTTP 200 for a generated receipt image, spoken voice note, and one-page PDF. Image and PDF text preserved `PHP 800.00` and `2026-09-26`; the voice transcript misheard “Meralco” as “Merlco,” confirming the need for user correction before preview. No private user media was used.
- Production build, typecheck, lint, and the full test suite pass after restoring the locked dependencies. The production dependency audit reports no vulnerabilities. Repository formatting check still reports pre-existing failures; changed Phase 18 source and test files pass their targeted formatting check.
- File scanning decision: this release accepts only the listed signatures and sizes, processes the bytes in memory, never stores or executes originals, and sends supported media only to the extraction provider. Antivirus scanning is deferred until a future design retains files or adds server-side parsing. Keep the supported-format allowlist and request cap in place.
- [Release PR #3](https://github.com/icodeninjaX/project-atlas/pull/3) passed its quality and Vercel preview checks. Main-branch CI passed after merge at `5f676d3c631a47a733f5b12a7a2400565525f118`; Vercel production deployment `dpl_8V2DJTJN7GTbEsUzwCQLCEUNRkvo` is ready. The live health endpoint returned 200, and unauthenticated `POST /api/capture/extract` returned 401 with the expected sign-in message. The extraction route had no runtime error cluster in the 30-minute window checked at release.
- Broader OCR/transcription accuracy and adversarial evaluation, a signed-in desktop/320px browser flow, and duplicate detection beyond 30 minutes remain unverified. The GitHub E2E job was skipped because its disposable-account secrets are not configured. Do not infer a full authenticated media flow from the unauthenticated production check.

The API patterns follow OpenAI's [image input](https://developers.openai.com/api/docs/guides/images-vision), [file input](https://developers.openai.com/api/docs/guides/file-inputs), and [file transcription](https://developers.openai.com/api/docs/guides/speech-to-text) guides.
