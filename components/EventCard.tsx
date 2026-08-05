"use client";

import { ChevronDown, ChevronUp, MapPin, Pencil, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState, useTransition } from "react";
import { EventEditor, type EventDraft } from "@/components/EventEditor";
import type { ItineraryEvent } from "@/lib/data";

export type ItineraryPatch = {
  title?: string;
  time?: string | null;
  description?: string | null;
  location?: string | null;
  theme?: string;
  date?: string;
};

/** Everything an edit-mode Timeline needs to mutate the itinerary. Handlers
 *  dispatch the optimistic update and await the server action — call them
 *  inside a transition. */
export type ItineraryEditApi = {
  editorFor: string | number | null; // an event id, `new:<date>`, or nothing
  openEditor: (key: string | number) => void;
  closeEditor: () => void;
  add: (draft: EventDraft) => Promise<void>;
  update: (id: number, patch: ItineraryPatch) => Promise<void>;
  remove: (id: number) => Promise<void>;
  move: (id: number, direction: "up" | "down") => Promise<void>;
};

/** One itinerary card. In edit mode it grows a control strip (reorder, edit,
 *  two-tap delete) and can swap its content for the editor form in place. */
export function EventCard({
  event,
  index,
  isFirst,
  isLast,
  edit,
}: {
  event: ItineraryEvent;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  edit?: ItineraryEditApi;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  // an optimistic add renders with a temp negative id until revalidation
  // delivers the real row — no DB row exists yet, so its controls must wait
  const isTemp = event.id < 0;
  const editorOpen = edit?.editorFor === event.id;

  // hand focus back to the pencil when the editor closes (Escape/Cancel/Save)
  const pencilRef = useRef<HTMLButtonElement>(null);
  const editorWasOpen = useRef(false);
  useEffect(() => {
    if (editorWasOpen.current && !editorOpen) pencilRef.current?.focus();
    editorWasOpen.current = !!editorOpen;
  }, [editorOpen]);

  const save = (draft: EventDraft) => {
    if (!edit) return;
    const patch: ItineraryPatch = {};
    // clamp exactly like the server actions so the optimistic card never
    // shows text the revalidated row will have truncated
    const title = draft.title.trim().slice(0, 200);
    if (title && title !== event.title) patch.title = title;
    const time = draft.time.trim().slice(0, 40) || null;
    if (time !== event.time) patch.time = time;
    const description = draft.description.trim().slice(0, 400) || null;
    if (description !== event.description) patch.description = description;
    const location = draft.location.trim().slice(0, 200) || null;
    if (location !== event.location) patch.location = location;
    if (draft.theme !== event.theme) patch.theme = draft.theme;
    if (draft.date !== event.date) patch.date = draft.date;
    edit.closeEditor();
    if (Object.keys(patch).length === 0) return;
    startTransition(() => edit.update(event.id, patch));
  };

  const del = () => {
    if (!edit) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setConfirmDelete(false);
    startTransition(() => edit.remove(event.id));
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      whileInView={{
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 160, damping: 22, delay: index * 0.08 },
      }}
      exit={{ opacity: 0, x: -20 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className={`rounded-2xl border p-4 md:p-5 ${
        event.theme === "vegas" ? "card-vegas" : "card-desert"
      } ${pending ? "opacity-60" : ""}`}
    >
      {edit && editorOpen ? (
        <EventEditor
          initial={event}
          date={event.date}
          saveLabel="Save"
          pending={pending}
          onSave={save}
          onCancel={edit.closeEditor}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {event.time && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider ${
                  event.theme === "vegas"
                    ? "bg-mark-pink/20 text-glow-pink"
                    : "bg-mark-orange/20 text-glow-sunset"
                }`}
              >
                {event.time}
              </span>
            )}
            <h3 className="font-medium md:text-lg">{event.title}</h3>
          </div>
          {event.description && (
            <p className="mt-1.5 text-sm text-ink-secondary">{event.description}</p>
          )}
          {event.location && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              {event.location}
            </p>
          )}
          {edit && !isTemp && (
            <div className="mt-3 flex items-center gap-1 border-t border-borderc pt-2">
              <button
                disabled={pending || isFirst}
                onClick={() => startTransition(() => edit.move(event.id, "up"))}
                className="rounded p-1.5 text-ink-muted transition-colors hover:text-ink disabled:opacity-30"
                aria-label={`Move ${event.title} up`}
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                disabled={pending || isLast}
                onClick={() => startTransition(() => edit.move(event.id, "down"))}
                className="rounded p-1.5 text-ink-muted transition-colors hover:text-ink disabled:opacity-30"
                aria-label={`Move ${event.title} down`}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <span className="flex-1" />
              <button
                ref={pencilRef}
                disabled={pending}
                onClick={() => edit.openEditor(event.id)}
                className="rounded p-1.5 text-ink-muted transition-colors hover:text-ink"
                aria-label={`Edit ${event.title}`}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={del}
                aria-live="polite"
                className={`flex items-center rounded p-1.5 text-xs transition-colors ${
                  confirmDelete
                    ? "font-semibold text-mark-pink"
                    : "text-ink-muted/50 hover:text-mark-pink"
                }`}
                title={confirmDelete ? "Tap again to delete" : "Delete event"}
                aria-label={`Delete ${event.title}`}
              >
                {confirmDelete ? "Delete?" : <X className="h-4 w-4" />}
              </button>
            </div>
          )}
        </>
      )}
    </motion.article>
  );
}
