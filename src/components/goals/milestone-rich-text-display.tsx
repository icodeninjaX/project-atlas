import { Fragment, type ReactNode } from "react";
import {
  normalizeMilestoneDescription,
  type MilestoneRichTextNode,
} from "@/lib/goals/milestone-rich-text";

function renderText(node: MilestoneRichTextNode, key: string): ReactNode {
  let content: ReactNode = node.text;
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") content = <strong>{content}</strong>;
    if (mark.type === "italic") content = <em>{content}</em>;
    if (mark.type === "underline") content = <u>{content}</u>;
    if (mark.type === "strike") content = <s>{content}</s>;
    if (mark.type === "code") {
      content = (
        <code className="bg-muted rounded px-1 font-mono text-[0.9em]">
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
    return (
      <p key={key} className="font-semibold text-slate-800 dark:text-slate-100">
        {content}
      </p>
    );
  }
  if (node.type === "bulletList") {
    return (
      <ul key={key} className="list-disc pl-5">
        {content}
      </ul>
    );
  }
  if (node.type === "orderedList") {
    return (
      <ol key={key} start={node.attrs?.start} className="list-decimal pl-5">
        {content}
      </ol>
    );
  }
  if (node.type === "listItem") return <li key={key}>{content}</li>;
  if (node.type === "blockquote") {
    return (
      <blockquote key={key} className="border-primary/50 border-l-2 pl-3">
        {content}
      </blockquote>
    );
  }
  return null;
}

export function MilestoneRichTextDisplay({ content }: { content: unknown }) {
  const document = normalizeMilestoneDescription(content);
  if (!document) return null;

  return (
    <div className="text-muted-foreground mt-1 space-y-1.5 text-[11px] leading-5 [overflow-wrap:anywhere]">
      {document.content.map((node, index) => renderNode(node, String(index)))}
    </div>
  );
}
