import { Fragment, type ReactNode } from "react";
import {
  normalizeMilestoneDescription,
  type MilestoneRichTextNode,
} from "@/lib/goals/milestone-rich-text";

const lineBreakPattern = /\r\n?|\n/;

function renderText(node: MilestoneRichTextNode, key: string): ReactNode {
  const lines = node.text?.split(lineBreakPattern) ?? [];
  let content: ReactNode =
    lines.length > 1
      ? lines.map((line, index) => (
          <Fragment key={`${key}-line-${index}`}>
            {index > 0 ? <br /> : null}
            {line}
          </Fragment>
        ))
      : node.text;

  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") {
      content = (
        <strong className="text-foreground font-semibold">{content}</strong>
      );
    }
    if (mark.type === "italic") content = <em>{content}</em>;
    if (mark.type === "underline") {
      content = (
        <span className="underline decoration-current/50 underline-offset-2">
          {content}
        </span>
      );
    }
    if (mark.type === "strike") content = <s>{content}</s>;
    if (mark.type === "code") {
      content = (
        <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.88em]">
          {content}
        </code>
      );
    }
  }

  return <Fragment key={key}>{content}</Fragment>;
}

function renderNode(node: MilestoneRichTextNode, key: string): ReactNode {
  if (node.type === "text") return renderText(node, key);
  if (node.type === "hardBreak") return <br key={key} />;

  const content = node.content?.map((child, index) =>
    renderNode(child, `${key}-${index}`),
  );

  if (node.type === "paragraph") return <p key={key}>{content}</p>;
  if (node.type === "heading") {
    const className =
      "text-foreground pt-2 text-base font-semibold tracking-tight first:pt-0";
    return node.attrs?.level === 3 ? (
      <h4 key={key} className={className}>
        {content}
      </h4>
    ) : (
      <h3 key={key} className={className}>
        {content}
      </h3>
    );
  }
  if (node.type === "bulletList") {
    return (
      <ul
        key={key}
        className="text-muted-foreground marker:text-primary/70 list-disc space-y-2 pl-5"
      >
        {content}
      </ul>
    );
  }
  if (node.type === "orderedList") {
    return (
      <ol
        key={key}
        start={node.attrs?.start}
        className="text-muted-foreground marker:text-primary/70 list-decimal space-y-2 pl-5"
      >
        {content}
      </ol>
    );
  }
  if (node.type === "listItem") {
    return (
      <li key={key} className="space-y-2 pl-1">
        {content}
      </li>
    );
  }
  if (node.type === "blockquote") {
    return (
      <blockquote
        key={key}
        className="border-primary/50 text-muted-foreground border-l-2 pl-4 italic"
      >
        {content}
      </blockquote>
    );
  }

  return null;
}

export function MilestoneRichTextReader({
  content,
  emptyFallback = null,
}: {
  content: unknown;
  emptyFallback?: ReactNode;
}) {
  const document = normalizeMilestoneDescription(content);
  if (!document) return emptyFallback;

  return (
    <div className="text-foreground/90 space-y-5 text-[15px] leading-7 [overflow-wrap:anywhere] whitespace-pre-wrap">
      {document.content.map((node, index) => renderNode(node, String(index)))}
    </div>
  );
}
