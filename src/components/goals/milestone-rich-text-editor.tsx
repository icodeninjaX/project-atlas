"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code2,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { useRef, useState } from "react";
import {
  normalizeMilestoneDescription,
  type MilestoneRichTextDocument,
} from "@/lib/goals/milestone-rich-text";
import { cn } from "@/lib/utils";

const extensions = [
  StarterKit.configure({
    codeBlock: false,
    heading: { levels: [2, 3] },
    horizontalRule: false,
    link: false,
  }),
];

const emptyDocument: MilestoneRichTextDocument = {
  type: "doc",
  content: [{ type: "paragraph", content: [] }],
};

type ToolbarButtonProps = {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
};

function ToolbarButton({
  active,
  disabled = false,
  label,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "hover:bg-muted focus-visible:ring-ring inline-grid size-10 shrink-0 place-items-center rounded-lg text-slate-600 transition-colors outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-35 dark:text-slate-300",
        active && "bg-primary/15 text-primary hover:bg-primary/20",
      )}
    >
      {children}
    </button>
  );
}

export function MilestoneRichTextEditor({
  id,
  name = "description",
  initialContent,
  describedBy,
}: {
  id: string;
  name?: string;
  initialContent?: unknown;
  describedBy?: string;
}) {
  const [initialDocument] = useState(
    () => normalizeMilestoneDescription(initialContent) ?? emptyDocument,
  );
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const [initialSerialized] = useState(() => JSON.stringify(initialDocument));
  const editor = useEditor(
    {
      extensions,
      content: initialDocument,
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      editorProps: {
        attributes: {
          id,
          role: "textbox",
          "aria-label": "Description or learning notes",
          "aria-multiline": "true",
          ...(describedBy ? { "aria-describedby": describedBy } : {}),
          class:
            "min-h-40 px-3 py-3 text-sm leading-6 outline-none sm:min-h-44 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:pl-3 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_p+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-6",
        },
      },
      onUpdate: ({ editor: currentEditor }) => {
        if (descriptionInputRef.current) {
          descriptionInputRef.current.value = JSON.stringify(
            currentEditor.getJSON(),
          );
        }
      },
    },
    [],
  );
  const toolbar = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      bold: currentEditor?.isActive("bold") ?? false,
      italic: currentEditor?.isActive("italic") ?? false,
      underline: currentEditor?.isActive("underline") ?? false,
      strike: currentEditor?.isActive("strike") ?? false,
      code: currentEditor?.isActive("code") ?? false,
      heading: currentEditor?.isActive("heading", { level: 2 }) ?? false,
      bulletList: currentEditor?.isActive("bulletList") ?? false,
      orderedList: currentEditor?.isActive("orderedList") ?? false,
      blockquote: currentEditor?.isActive("blockquote") ?? false,
      canUndo: currentEditor?.can().chain().undo().run() ?? false,
      canRedo: currentEditor?.can().chain().redo().run() ?? false,
    }),
  });

  return (
    <>
      <input
        ref={descriptionInputRef}
        type="hidden"
        name={name}
        defaultValue={initialSerialized}
      />
      <div className="border-border bg-background mt-1 overflow-hidden rounded-xl border">
        <div
          role="toolbar"
          aria-label="Description formatting"
          className="border-border bg-muted/40 flex flex-wrap items-center gap-0.5 border-b p-1"
        >
          <ToolbarButton
            label="Bold"
            active={toolbar?.bold}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={toolbar?.italic}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Underline"
            active={toolbar?.underline}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          >
            <Underline className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Strikethrough"
            active={toolbar?.strike}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Inline code"
            active={toolbar?.code}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleCode().run()}
          >
            <Code2 className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <span className="bg-border mx-0.5 h-6 w-px" aria-hidden="true" />
          <ToolbarButton
            label="Heading"
            active={toolbar?.heading}
            disabled={!editor}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Bulleted list"
            active={toolbar?.bulletList}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            active={toolbar?.orderedList}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Quote"
            active={toolbar?.blockquote}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <span className="bg-border mx-0.5 h-6 w-px" aria-hidden="true" />
          <ToolbarButton
            label="Undo"
            disabled={!editor || !toolbar?.canUndo}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Redo"
            disabled={!editor || !toolbar?.canRedo}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 className="size-4" aria-hidden="true" />
          </ToolbarButton>
        </div>
        <EditorContent editor={editor} />
      </div>
    </>
  );
}
