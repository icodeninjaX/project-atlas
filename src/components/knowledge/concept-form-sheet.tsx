"use client";

import { Lightbulb, MessageSquareQuote, NotebookPen } from "lucide-react";
import { useActionState, useId } from "react";
import { toast } from "sonner";
import {
  FormSection,
  fieldLabelClass,
  fieldTextareaClass,
} from "@/components/career/application-fields";
import { RelatedGoalField } from "@/components/graph/related-goal-field";
import { MoneySheet } from "@/components/money/money-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createKnowledgeConceptAction,
  updateKnowledgeConceptAction,
  type KnowledgeActionState,
} from "@/lib/knowledge/actions";
import type { KnowledgeConcept } from "@/lib/knowledge/view";

const initialState: KnowledgeActionState = { success: false, message: "" };

function ConceptForm({
  concept,
  categories,
  onCancel,
  onSaved,
}: {
  concept?: KnowledgeConcept;
  categories: string[];
  onCancel: () => void;
  onSaved: (conceptId: string | null) => void;
}) {
  const categoryListId = useId();
  const editing = Boolean(concept);
  const [, action, pending] = useActionState(
    async (previous: KnowledgeActionState, formData: FormData) => {
      const result = await (editing
        ? updateKnowledgeConceptAction(previous, formData)
        : createKnowledgeConceptAction(previous, formData));
      if (result.success) {
        toast.success(result.message);
        onSaved(result.conceptId ?? concept?.id ?? null);
      } else toast.error(result.message);
      return result;
    },
    initialState,
  );

  return (
    <form action={action} className="min-w-0">
      {concept ? (
        <input type="hidden" name="conceptId" value={concept.id} />
      ) : null}
      <div className="space-y-4">
        <FormSection
          icon={Lightbulb}
          title="The concept"
          description="A short name you will recognize, and where it belongs."
        >
          <label className={`${fieldLabelClass} sm:col-span-2`}>
            Concept title
            <Input
              name="title"
              required
              maxLength={160}
              defaultValue={concept?.title}
              autoFocus={!editing}
              placeholder="e.g. Compound interest"
              className="mt-1.5"
            />
          </label>
          <label className={fieldLabelClass}>
            Category
            <Input
              name="category"
              required
              maxLength={80}
              list={categoryListId}
              autoComplete="off"
              defaultValue={concept?.category}
              placeholder="Finance, technology…"
              className="mt-1.5"
            />
            <datalist id={categoryListId}>
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </label>
          <label className={fieldLabelClass}>
            Tags
            <Input
              name="tags"
              defaultValue={concept?.tags.join(", ")}
              autoComplete="off"
              placeholder="Separated by commas"
              className="mt-1.5"
            />
          </label>
          {editing ? null : <RelatedGoalField className="sm:col-span-2" />}
        </FormSection>

        <FormSection
          icon={NotebookPen}
          title="What to remember"
          description="Hidden while you recall, then shown so you can check yourself."
        >
          <label className={`${fieldLabelClass} sm:col-span-2`}>
            Learning notes
            <textarea
              name="notes"
              required
              maxLength={10000}
              rows={6}
              defaultValue={concept?.notes}
              placeholder="The explanation you want to remember"
              className={fieldTextareaClass}
            />
          </label>
          <label className={`${fieldLabelClass} sm:col-span-2`}>
            Example
            <textarea
              name="example"
              maxLength={2000}
              rows={2}
              defaultValue={concept?.example ?? ""}
              placeholder="A concrete case that makes it click"
              className={`${fieldTextareaClass} min-h-20`}
            />
          </label>
        </FormSection>

        <FormSection
          icon={MessageSquareQuote}
          title="In your own words"
          description="Optional. Shown beside the notes when you check your recall."
        >
          <label className={`${fieldLabelClass} sm:col-span-2`}>
            Personal explanation
            <textarea
              name="personalExplanation"
              maxLength={2000}
              rows={3}
              defaultValue={concept?.personal_explanation ?? ""}
              placeholder="How would you explain this to a friend?"
              className={`${fieldTextareaClass} min-h-24`}
            />
          </label>
        </FormSection>
      </div>
      <div className="border-border bg-background/90 sticky -bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-10 -mx-5 mt-5 -mb-[calc(1.5rem+env(safe-area-inset-bottom))] flex justify-end gap-2 border-t px-5 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] backdrop-blur-xl sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:px-6 sm:pb-6">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" pending={pending} pendingLabel="Saving…">
          {editing ? "Save changes" : "Save concept"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Adds a concept, or with `concept` edits it, in a bottom sheet on phones
 * and a side panel from `sm` up. The form closes the sheet once it saves.
 */
export function ConceptFormSheet({
  open,
  onOpenChange,
  concept,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  concept?: KnowledgeConcept | null;
  categories: string[];
  onSaved?: (conceptId: string | null) => void;
}) {
  const close = () => onOpenChange(false);
  return (
    <MoneySheet
      open={open}
      onOpenChange={onOpenChange}
      eyebrow={concept ? "Knowledge / Edit" : "Knowledge / New concept"}
      title={concept ? `Edit ${concept.title}` : "Add a concept"}
      description={
        concept
          ? "Changes keep the concept's review schedule and history."
          : "Write it once. ATLAS asks you to recall it and spaces each review."
      }
      closeLabel={concept ? "Close concept editor" : "Close new concept form"}
    >
      {open ? (
        <ConceptForm
          key={concept?.id ?? "new"}
          concept={concept ?? undefined}
          categories={categories}
          onCancel={close}
          onSaved={(conceptId) => {
            close();
            onSaved?.(conceptId);
          }}
        />
      ) : null}
    </MoneySheet>
  );
}
