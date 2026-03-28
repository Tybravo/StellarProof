"use client";

import React, { useEffect, useCallback } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/** Valid manifest key: letters, numbers, underscore, hyphen (no spaces or special chars). */
const KEY_PATTERN = /^[a-zA-Z0-9_-]*$/;

export interface KeyValueEntry {
  key: string;
  value: string;
}

export interface KeyValueBuilderFormValues {
  entries: KeyValueEntry[];
}

export interface KeyValueBuilderProps {
  /** Initial key-value pairs (e.g. from use-case template: field names as keys, empty values). */
  defaultEntries?: KeyValueEntry[];
  /** Called whenever the key-value set changes (for live preview). */
  onChange?: (data: Record<string, string>) => void;
  /** Optional aria-label for the list. */
  "aria-label"?: string;
  /** Enable drag-to-reorder. */
  reorderable?: boolean;
}

function buildRecord(entries: KeyValueEntry[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { key, value } of entries) {
    const k = key.trim();
    if (k) out[k] = value ?? "";
  }
  return out;
}

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex gap-2 items-start ${isDragging ? "opacity-60 z-10" : ""}`}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="mt-2.5 p-1 rounded text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function PlainRow({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2 items-start">{children}</div>;
}

export default function KeyValueBuilder({
  defaultEntries = [{ key: "", value: "" }],
  onChange,
  "aria-label": ariaLabel = "Manifest key-value pairs",
  reorderable = true,
}: KeyValueBuilderProps) {
  const {
    control,
    formState: { errors },
  } = useForm<KeyValueBuilderFormValues>({
    defaultValues: {
      entries:
        defaultEntries.length > 0
          ? defaultEntries.map((e) => ({ key: e.key, value: e.value ?? "" }))
          : [{ key: "", value: "" }],
    },
    mode: "onChange",
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "entries",
  });

  const watchedEntries = useWatch({ control, name: "entries", defaultValue: [] });

  const emitChange = useCallback(() => {
    if (!onChange || !watchedEntries) return;
    onChange(buildRecord(watchedEntries));
  }, [onChange, watchedEntries]);

  useEffect(() => {
    emitChange();
  }, [emitChange]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = fields.findIndex((_, i) => `entry-${i}` === active.id);
        const newIndex = fields.findIndex((_, i) => `entry-${i}` === over.id);
        if (oldIndex !== -1 && newIndex !== -1) move(oldIndex, newIndex);
      }
    },
    [fields, move]
  );

  const addRow = useCallback(() => {
    append({ key: "", value: "" });
  }, [append]);

  const keyValidation = useCallback((key: string) => {
    const trimmed = key.trim();
    if (!trimmed) return "Key is required.";
    if (!KEY_PATTERN.test(trimmed))
      return "Use only letters, numbers, underscores, and hyphens.";
    return true;
  }, []);

  const rowFields = (RowWrapper: React.ComponentType<{ id?: string; children: React.ReactNode }>) => (
    <>
      {fields.map((field, index) => (
        <RowWrapper key={field.id} id={reorderable ? `entry-${index}` : undefined}>
          <div className="flex gap-2 items-start">
            <div className="flex-1 min-w-0 grid grid-cols-[1fr_1fr] gap-2">
              <div className="min-w-0">
                <input
                  {...control.register(`entries.${index}.key`, {
                    validate: keyValidation,
                  })}
                  placeholder="Key"
                  aria-label={`Key for row ${index + 1}`}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition invalid:border-amber-500 dark:invalid:border-amber-500"
                />
                {errors?.entries?.[index]?.key?.message && (
                  <p
                    role="alert"
                    className="mt-1 text-xs text-amber-600 dark:text-amber-400"
                  >
                    {errors.entries[index]?.key?.message}
                  </p>
                )}
              </div>
              <div className="min-w-0">
                <input
                  {...control.register(`entries.${index}.value`)}
                  placeholder="Value"
                  aria-label={`Value for row ${index + 1}`}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={`Remove row ${index + 1}`}
              className="mt-2 p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </RowWrapper>
      ))}
    </>
  );

  const rowContent = reorderable ? (
    rowFields(({ id, children }) => <SortableRow id={id!}>{children}</SortableRow>)
  ) : (
    rowFields(({ children }) => <PlainRow>{children}</PlainRow>)
  );

  const listContent = reorderable ? (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={fields.map((_, i) => `entry-${i}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3" role="list" aria-label={ariaLabel}>
          {rowContent}
        </div>
      </SortableContext>
    </DndContext>
  ) : (
    <div className="space-y-3" role="list" aria-label={ariaLabel}>
      {rowContent}
    </div>
  );

  return (
    <div className="space-y-3">
      {listContent}
      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-2 text-sm font-medium text-primary dark:text-primary-light hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-darkblue rounded"
      >
        <Plus className="h-4 w-4 shrink-0" />
        Add Row
      </button>
    </div>
  );
}
