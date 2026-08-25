export const MILESTONE_DESCRIPTION_INPUT_LIMIT = 20_000;

const MILESTONE_DESCRIPTION_STORED_LIMIT = 25_000;
const MILESTONE_DESCRIPTION_TEXT_LIMIT = 20_000;
const MILESTONE_DESCRIPTION_NODE_LIMIT = 300;
const MILESTONE_DESCRIPTION_DEPTH_LIMIT = 8;

const blockNodeTypes = new Set([
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
]);
const inlineNodeTypes = new Set(["text", "hardBreak"]);
const markTypes = new Set(["bold", "italic", "underline", "strike", "code"]);

export type MilestoneRichTextMark = {
  type: "bold" | "italic" | "underline" | "strike" | "code";
};

export type MilestoneRichTextNode = {
  type: string;
  attrs?: { level?: number; start?: number };
  content?: MilestoneRichTextNode[];
  marks?: MilestoneRichTextMark[];
  text?: string;
};

export type MilestoneRichTextDocument = MilestoneRichTextNode & {
  type: "doc";
  content: MilestoneRichTextNode[];
};

type DescriptionInputResult =
  | { success: true; data: MilestoneRichTextDocument | null }
  | { success: false; message: string };

type ValidationStats = {
  nodes: number;
  textLength: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function allowedChildren(parentType: string, childType: string) {
  if (parentType === "doc") {
    return [
      "paragraph",
      "heading",
      "bulletList",
      "orderedList",
      "blockquote",
    ].includes(childType);
  }
  if (parentType === "paragraph" || parentType === "heading") {
    return inlineNodeTypes.has(childType);
  }
  if (parentType === "bulletList" || parentType === "orderedList") {
    return childType === "listItem";
  }
  if (parentType === "listItem") {
    return ["paragraph", "bulletList", "orderedList", "blockquote"].includes(
      childType,
    );
  }
  if (parentType === "blockquote") {
    return ["paragraph", "heading", "bulletList", "orderedList"].includes(
      childType,
    );
  }
  return false;
}

function sanitizeMarks(
  value: unknown,
): MilestoneRichTextMark[] | null | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return null;

  const marks: MilestoneRichTextMark[] = [];
  const seen = new Set<string>();
  for (const mark of value) {
    if (
      !isRecord(mark) ||
      typeof mark.type !== "string" ||
      !markTypes.has(mark.type) ||
      seen.has(mark.type)
    ) {
      return null;
    }
    seen.add(mark.type);
    marks.push({ type: mark.type as MilestoneRichTextMark["type"] });
  }
  return marks.length ? marks : undefined;
}

function sanitizeNode(
  value: unknown,
  parentType: string,
  depth: number,
  stats: ValidationStats,
): MilestoneRichTextNode | undefined {
  if (
    !isRecord(value) ||
    typeof value.type !== "string" ||
    depth > MILESTONE_DESCRIPTION_DEPTH_LIMIT ||
    !allowedChildren(parentType, value.type)
  ) {
    return undefined;
  }

  stats.nodes += 1;
  if (stats.nodes > MILESTONE_DESCRIPTION_NODE_LIMIT) return undefined;

  if (value.type === "text") {
    if (typeof value.text !== "string" || !value.text) return undefined;
    stats.textLength += value.text.length;
    if (stats.textLength > MILESTONE_DESCRIPTION_TEXT_LIMIT) return undefined;
    const marks = sanitizeMarks(value.marks);
    if (marks === null) return undefined;
    return { type: "text", text: value.text, ...(marks ? { marks } : {}) };
  }

  if (value.type === "hardBreak") return { type: "hardBreak" };
  if (
    !blockNodeTypes.has(value.type) ||
    (value.content !== undefined && !Array.isArray(value.content))
  ) {
    return undefined;
  }

  const content: MilestoneRichTextNode[] = [];
  for (const child of value.content ?? []) {
    const sanitized = sanitizeNode(child, value.type, depth + 1, stats);
    if (!sanitized) return undefined;
    content.push(sanitized);
  }

  if (
    (value.type === "bulletList" ||
      value.type === "orderedList" ||
      value.type === "listItem" ||
      value.type === "blockquote") &&
    content.length === 0
  ) {
    return undefined;
  }

  if (value.type === "heading") {
    const level = isRecord(value.attrs) ? value.attrs.level : undefined;
    if (level !== 2 && level !== 3) return undefined;
    return { type: "heading", attrs: { level }, content };
  }

  if (value.type === "orderedList") {
    const start = isRecord(value.attrs) ? value.attrs.start : undefined;
    if (
      start !== undefined &&
      (!Number.isInteger(start) || Number(start) < 1 || Number(start) > 1000)
    ) {
      return undefined;
    }
    return {
      type: "orderedList",
      ...(start === undefined ? {} : { attrs: { start: Number(start) } }),
      content,
    };
  }

  return { type: value.type, content };
}

function sanitizeDocument(
  value: unknown,
): MilestoneRichTextDocument | undefined {
  if (
    !isRecord(value) ||
    value.type !== "doc" ||
    !Array.isArray(value.content)
  ) {
    return undefined;
  }

  const stats = { nodes: 1, textLength: 0 };
  const content: MilestoneRichTextNode[] = [];
  for (const child of value.content) {
    const sanitized = sanitizeNode(child, "doc", 1, stats);
    if (!sanitized) return undefined;
    content.push(sanitized);
  }
  return { type: "doc", content };
}

function hasVisibleContent(document: MilestoneRichTextDocument) {
  const pending = [...document.content];
  while (pending.length) {
    const node = pending.pop();
    if (node?.type === "text" && node.text?.trim()) return true;
    if (node?.content) pending.push(...node.content);
  }
  return false;
}

export function plainTextMilestoneDescription(
  text: string,
): MilestoneRichTextDocument | null {
  const normalized = text.trim();
  if (!normalized || normalized.length > MILESTONE_DESCRIPTION_TEXT_LIMIT) {
    return null;
  }
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: normalized }],
      },
    ],
  };
}

export function normalizeMilestoneDescription(
  value: unknown,
): MilestoneRichTextDocument | null {
  if (typeof value === "string") {
    return plainTextMilestoneDescription(value);
  }
  if (value === null || value === undefined) return null;
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return null;
  }
  if (serialized.length > MILESTONE_DESCRIPTION_STORED_LIMIT) {
    return null;
  }
  const document = sanitizeDocument(value);
  return document && hasVisibleContent(document) ? document : null;
}

export function parseMilestoneDescriptionInput(
  value: FormDataEntryValue | null,
): DescriptionInputResult {
  if (value === null || value === "") return { success: true, data: null };
  if (
    typeof value !== "string" ||
    value.length > MILESTONE_DESCRIPTION_INPUT_LIMIT
  ) {
    return {
      success: false,
      message: "The milestone description is too long.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    // Mutations queued by the previous plain-text editor can still sync safely.
    return { success: true, data: plainTextMilestoneDescription(value) };
  }
  const document = sanitizeDocument(parsed);
  if (!document) {
    return {
      success: false,
      message: "The milestone description has invalid formatting.",
    };
  }
  return {
    success: true,
    data: hasVisibleContent(document) ? document : null,
  };
}
