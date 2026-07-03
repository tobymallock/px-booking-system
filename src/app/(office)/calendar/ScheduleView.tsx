"use client";

import React, { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  moveLineItem,
  createLineItem,
  createLessonsForRange,
} from "../bookings/actions";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Lesson {
  id: string;
  date: string;
  startTime: string | null;
  durationMin: number | null;
  description: string;
  priceChf: number;
  bookingId: string;
  clientName: string;
  clientLastName: string;
  brandCode: string;
  instructorId: string | null;
  instructorColor: string;
}

export interface InstructorRow {
  id: string;
  firstName: string;
  lastName: string;
  brandCode: string;
  brandId: string;
  color: string;
}

interface BookingOption {
  id: string;
  label: string;
  brandId: string;
}

interface Props {
  lessons: Lesson[];
  instructors: InstructorRow[];
  bookings: BookingOption[];
}

// Panel can be "add" (single or multi-day) or "view" (existing lesson)
type Panel =
  | {
      type: "add";
      startDate: string;
      endDate: string;
      instructorId: string | null;
    }
  | { type: "view"; lesson: Lesson }
  | null;

// Cell-drag state (mouse-down drag across empty cells to select a date range)
interface CellDrag {
  instructorId: string | null;
  startDate: string;
  currentDate: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const BRAND_COLORS: Record<string, string> = {
  PV: "#3B82F6",
  PX: "#10B981",
  VV: "#8B5CF6",
};

const DURATIONS = [
  { value: "90", label: "1.5hr" },
  { value: "120", label: "2hr" },
  { value: "150", label: "2.5hr" },
  { value: "180", label: "3hr" },
  { value: "210", label: "3.5hr" },
  { value: "240", label: "4hr" },
  { value: "270", label: "4.5hr" },
  { value: "300", label: "5hr" },
  { value: "360", label: "6hr (full day)" },
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Helpers ────────────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() + diff);
  return mon;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(d.getUTCDate() + n);
  return r;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatColHeader(d: Date) {
  const today = toDateStr(new Date());
  return {
    day: DAY_LABELS[d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1],
    date: d.toLocaleDateString("en-GB", {
      timeZone: "UTC",
      day: "numeric",
      month: "short",
    }),
    isToday: toDateStr(d) === today,
  };
}

function formatDuration(min: number): string {
  if (min >= 360) return "Full day";
  if (min % 60 === 0) return `${min / 60}h`;
  return `${Math.floor(min / 60)}h${min % 60}`;
}

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function sortedRange(a: string, b: string): [string, string] {
  return a <= b ? [a, b] : [b, a];
}

function daysBetween(start: string, end: string): number {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

// ── Lesson block ───────────────────────────────────────────────────────────────

function LessonBlock({
  lesson,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  lesson: Lesson;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseDown={(e) => e.stopPropagation()} // don't start a cell-selection drag
      onClick={onClick}
      className="mb-1 cursor-grab rounded px-2 py-1.5 text-xs text-white shadow-sm select-none active:cursor-grabbing hover:brightness-110 transition-all"
      style={{ backgroundColor: lesson.instructorColor }}
    >
      <div className="font-semibold truncate leading-tight">
        {lesson.clientLastName}
      </div>
      <div className="opacity-80 truncate leading-tight">
        {lesson.startTime ?? ""}
        {lesson.startTime && lesson.durationMin ? " · " : ""}
        {lesson.durationMin ? formatDuration(lesson.durationMin) : ""}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function ScheduleView({ lessons, instructors, bookings }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [visibleBrands, setVisibleBrands] = useState<Set<string>>(
    new Set(["PV", "PX", "VV"])
  );

  // HTML5 drag-to-move: which lesson is being dragged
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // Mouse-drag-to-create: dragging across empty cells
  const [cellDrag, setCellDrag] = useState<CellDrag | null>(null);
  const isDraggingRef = useRef(false);

  const [panel, setPanel] = useState<Panel>(null);
  const [addBookingId, setAddBookingId] = useState("");

  const weekDays = Array.from({ length: 14 }, (_, i) => addDays(weekStart, i));
  const weekDayStrs = weekDays.map(toDateStr);

  const visibleInstructors = instructors.filter((i) =>
    visibleBrands.has(i.brandCode)
  );

  // Build lookups
  const byInstructor: Record<string, Record<string, Lesson[]>> = {};
  const unassignedByDate: Record<string, Lesson[]> = {};
  for (const lesson of lessons) {
    if (!visibleBrands.has(lesson.brandCode)) continue;
    if (lesson.instructorId) {
      (byInstructor[lesson.instructorId] ??= {})[lesson.date] ??= [];
      byInstructor[lesson.instructorId][lesson.date].push(lesson);
    } else {
      (unassignedByDate[lesson.date] ??= []).push(lesson);
    }
  }

  // ── Global mouseup: finish a cell-drag-to-create ─────────────────────────────
  useEffect(() => {
    function onMouseUp() {
      if (!isDraggingRef.current || !cellDrag) {
        isDraggingRef.current = false;
        setCellDrag(null);
        return;
      }
      isDraggingRef.current = false;
      const [start, end] = sortedRange(cellDrag.startDate, cellDrag.currentDate);
      setCellDrag(null);
      setAddBookingId("");
      setPanel({ type: "add", startDate: start, endDate: end, instructorId: cellDrag.instructorId });
    }
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [cellDrag]);

  // ── Cell drag helpers ─────────────────────────────────────────────────────────

  function cellMouseDown(instructorId: string | null, dateStr: string) {
    isDraggingRef.current = true;
    setCellDrag({ instructorId, startDate: dateStr, currentDate: dateStr });
  }

  function cellMouseEnter(instructorId: string | null, dateStr: string) {
    if (!isDraggingRef.current || !cellDrag) return;
    // Only extend within same instructor row
    if (cellDrag.instructorId !== instructorId) return;
    setCellDrag((prev) => (prev ? { ...prev, currentDate: dateStr } : null));
  }

  function isCellInDragRange(instructorId: string | null, dateStr: string): boolean {
    if (!cellDrag || cellDrag.instructorId !== instructorId) return false;
    const [start, end] = sortedRange(cellDrag.startDate, cellDrag.currentDate);
    return dateStr >= start && dateStr <= end;
  }

  // ── HTML5 drag-to-move helpers ───────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, lessonId: string) {
    e.dataTransfer.setData("text/plain", lessonId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(lessonId);
  }

  function handleDragOver(e: React.DragEvent, cellKey: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(cellKey);
  }

  function handleDrop(e: React.DragEvent, instructorId: string | null, date: string) {
    e.preventDefault();
    const lessonId = e.dataTransfer.getData("text/plain");
    setDropTarget(null);
    setDraggingId(null);
    if (!lessonId) return;
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    if (lesson.instructorId === instructorId && lesson.date === date) return;
    startTransition(async () => {
      await moveLineItem(lessonId, instructorId, date);
      router.refresh();
    });
  }

  // ── Panel: add lesson(s) submit ──────────────────────────────────────────────

  function handleAddLessons(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      if (
        formData.get("startDate") === formData.get("endDate") ||
        !formData.get("endDate")
      ) {
        // Single day — use existing action
        await createLineItem(formData);
      } else {
        await createLessonsForRange(formData);
      }
      setPanel(null);
      setAddBookingId("");
      router.refresh();
    });
  }

  // ── Brand toggles ─────────────────────────────────────────────────────────────

  function toggleBrand(code: string) {
    setVisibleBrands((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        if (next.size === 1) return next;
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  // ── Derived panel values ──────────────────────────────────────────────────────

  const selectedBooking = bookings.find((b) => b.id === addBookingId);
  const panelInstructors =
    addBookingId && selectedBooking
      ? instructors.filter((i) => i.brandId === selectedBooking.brandId)
      : instructors;

  const panelDayCount =
    panel?.type === "add"
      ? daysBetween(panel.startDate, panel.endDate)
      : 1;

  const weekLabel = `${weekDays[0].toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  })} – ${weekDays[13].toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3" style={{ userSelect: cellDrag ? "none" : "auto" }}>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDays(w, -14))}
            className="rounded border border-neutral-200 px-2.5 py-1 text-sm hover:bg-neutral-50"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDays(w, 14))}
            className="rounded border border-neutral-200 px-2.5 py-1 text-sm hover:bg-neutral-50"
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(getMonday(new Date()))}
            className="rounded border border-neutral-200 px-3 py-1 text-sm hover:bg-neutral-50"
          >
            Today
          </button>
        </div>
        <span className="text-sm font-medium text-neutral-700">{weekLabel}</span>
        <div className="ml-auto flex items-center gap-2">
          {(["PV", "PX", "VV"] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => toggleBrand(code)}
              className="rounded-full px-3 py-0.5 text-xs font-semibold transition-all"
              style={{
                backgroundColor: visibleBrands.has(code) ? BRAND_COLORS[code] : "#E2E8F0",
                color: visibleBrands.has(code) ? "#fff" : "#94A3B8",
              }}
            >
              {code}
            </button>
          ))}
        </div>
        {isPending && (
          <span className="text-xs text-neutral-400 animate-pulse">Saving…</span>
        )}
      </div>

      {/* Grid */}
      <div className="overflow-auto rounded-lg border border-neutral-200 bg-white">
        <div
          className="grid"
          style={{ gridTemplateColumns: `200px repeat(14, minmax(100px, 1fr))` }}
        >
          {/* Corner */}
          <div className="sticky left-0 top-0 z-30 border-b border-r border-neutral-200 bg-neutral-50 px-3 py-2">
            <span className="text-xs text-neutral-400">
              {visibleInstructors.length} instructors
            </span>
          </div>

          {/* Date headers */}
          {weekDays.map((d) => {
            const { day, date, isToday } = formatColHeader(d);
            return (
              <div
                key={toDateStr(d)}
                className="sticky top-0 z-20 border-b border-r border-neutral-200 bg-neutral-50 px-2 py-2 text-center"
              >
                <div className={`text-xs font-medium ${isToday ? "text-blue-600" : "text-neutral-400"}`}>
                  {day}
                </div>
                <div className={`text-sm font-semibold ${isToday ? "text-blue-600" : "text-neutral-700"}`}>
                  {date}
                </div>
              </div>
            );
          })}

          {/* Unassigned row */}
          <div className="sticky left-0 z-10 flex items-center gap-2 border-b border-r border-neutral-100 bg-white px-3 py-2">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: "#94A3B8" }}
            >
              ?
            </span>
            <div className="text-xs font-medium text-neutral-500">Unassigned</div>
          </div>

          {weekDayStrs.map((dateStr) => {
            const cellKey = `unassigned|${dateStr}`;
            const isDropTarget = dropTarget === cellKey;
            const isInDrag = isCellInDragRange(null, dateStr);
            const cellLessons = unassignedByDate[dateStr] ?? [];
            return (
              <div
                key={dateStr}
                onMouseDown={() => cellMouseDown(null, dateStr)}
                onMouseEnter={() => cellMouseEnter(null, dateStr)}
                onDragOver={(e) => handleDragOver(e, cellKey)}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(e) => handleDrop(e, null, dateStr)}
                className={`border-b border-r border-neutral-100 p-1 transition-colors cursor-crosshair ${
                  isDropTarget
                    ? "bg-slate-100 ring-2 ring-inset ring-slate-300"
                    : isInDrag
                    ? "bg-blue-100"
                    : ""
                }`}
                style={{ minHeight: "56px" }}
              >
                {cellLessons.map((lesson) => (
                  <LessonBlock
                    key={lesson.id}
                    lesson={{ ...lesson, instructorColor: "#94A3B8" }}
                    onDragStart={(e) => handleDragStart(e, lesson.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPanel({ type: "view", lesson });
                    }}
                  />
                ))}
              </div>
            );
          })}

          {/* Instructor rows */}
          {visibleInstructors.map((inst) => (
            <React.Fragment key={inst.id}>
              {/* Sidebar cell */}
              <div
                className="sticky left-0 z-10 flex items-center gap-2 border-b border-r border-neutral-100 bg-white px-3 py-2"
                style={{
                  borderLeft: `3px solid ${BRAND_COLORS[inst.brandCode] ?? "#CBD5E1"}`,
                }}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: inst.color }}
                >
                  {initials(inst.firstName, inst.lastName)}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-neutral-800">
                    {inst.firstName} {inst.lastName}
                  </div>
                  <div className="text-xs text-neutral-400">{inst.brandCode}</div>
                </div>
              </div>

              {/* Day cells */}
              {weekDayStrs.map((dateStr) => {
                const cellKey = `${inst.id}|${dateStr}`;
                const isDropTarget = dropTarget === cellKey;
                const isInDrag = isCellInDragRange(inst.id, dateStr);
                const isDraggingLesson = !!draggingId;
                const cellLessons = byInstructor[inst.id]?.[dateStr] ?? [];
                return (
                  <div
                    key={dateStr}
                    onMouseDown={() => {
                      if (!isDraggingLesson) cellMouseDown(inst.id, dateStr);
                    }}
                    onMouseEnter={() => cellMouseEnter(inst.id, dateStr)}
                    onDragOver={(e) => handleDragOver(e, cellKey)}
                    onDragLeave={() => setDropTarget(null)}
                    onDrop={(e) => handleDrop(e, inst.id, dateStr)}
                    className={`border-b border-r border-neutral-100 p-1 transition-colors cursor-crosshair ${
                      isDropTarget
                        ? "bg-blue-50 ring-2 ring-inset ring-blue-300"
                        : isInDrag
                        ? "bg-blue-100"
                        : ""
                    }`}
                    style={{ minHeight: "56px" }}
                  >
                    {cellLessons.map((lesson) => (
                      <LessonBlock
                        key={lesson.id}
                        lesson={lesson}
                        onDragStart={(e) => handleDragStart(e, lesson.id)}
                        onDragEnd={() => setDraggingId(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPanel({ type: "view", lesson });
                        }}
                      />
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Side panel */}
      {panel && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setPanel(null)}
          />
          <div className="fixed right-0 top-0 z-50 flex h-full w-96 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-800">
                  {panel.type === "add" ? "Add lesson" : "Lesson"}
                </h2>
                {panel.type === "add" && (
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {panel.startDate === panel.endDate
                      ? panel.startDate
                      : `${panel.startDate} → ${panel.endDate} · ${panelDayCount} days`}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPanel(null)}
                className="rounded p-1 text-neutral-400 hover:text-neutral-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* ── Add lesson(s) ── */}
              {panel.type === "add" && (
                <form onSubmit={handleAddLessons} className="space-y-4">
                  <input type="hidden" name="date" value={panel.startDate} />
                  <input type="hidden" name="startDate" value={panel.startDate} />
                  <input type="hidden" name="endDate" value={panel.endDate} />

                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">
                      Booking
                    </label>
                    <select
                      name="bookingId"
                      required
                      value={addBookingId}
                      onChange={(e) => setAddBookingId(e.target.value)}
                      className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                    >
                      <option value="">Select booking…</option>
                      {bookings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">
                      Start time
                    </label>
                    <input
                      type="time"
                      name="startTime"
                      defaultValue="09:00"
                      className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">
                      Duration
                    </label>
                    <select
                      name="durationMin"
                      className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      {DURATIONS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">
                      Description
                    </label>
                    <input
                      name="description"
                      required
                      placeholder="e.g. Private ski lesson"
                      className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">
                      Price CHF{panelDayCount > 1 ? " (per day)" : ""}
                    </label>
                    <input
                      type="number"
                      name="priceChf"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      required
                      className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">
                      Instructor
                    </label>
                    <select
                      name="assignedInstructorId"
                      defaultValue={panel.instructorId ?? ""}
                      className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                    >
                      <option value="">— Unassigned —</option>
                      {panelInstructors.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.firstName} {i.lastName} ({i.brandCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                  >
                    {isPending
                      ? "Adding…"
                      : panelDayCount > 1
                      ? `Add ${panelDayCount} lessons`
                      : "Add lesson"}
                  </button>
                </form>
              )}

              {/* ── View lesson ── */}
              {panel.type === "view" && (
                <div className="space-y-4">
                  <div>
                    <p className="text-base font-semibold text-neutral-800">
                      {panel.lesson.clientName}
                    </p>
                    <p className="text-xs text-neutral-500">{panel.lesson.brandCode}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-neutral-400">Description</p>
                    <p className="text-sm text-neutral-800">{panel.lesson.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-neutral-400">Date</p>
                      <p className="text-sm text-neutral-800">{panel.lesson.date}</p>
                    </div>
                    {panel.lesson.startTime && (
                      <div>
                        <p className="text-xs font-medium text-neutral-400">Time</p>
                        <p className="text-sm text-neutral-800">{panel.lesson.startTime}</p>
                      </div>
                    )}
                    {panel.lesson.durationMin && (
                      <div>
                        <p className="text-xs font-medium text-neutral-400">Duration</p>
                        <p className="text-sm text-neutral-800">
                          {formatDuration(panel.lesson.durationMin)}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-neutral-400">Price</p>
                      <p className="text-sm tabular-nums text-neutral-800">
                        CHF {panel.lesson.priceChf.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-neutral-400">Instructor</p>
                    {panel.lesson.instructorId ? (
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: panel.lesson.instructorColor }}
                        />
                        <p className="text-sm text-neutral-800">
                          {(() => {
                            const i = instructors.find(
                              (x) => x.id === panel.lesson.instructorId
                            );
                            return i ? `${i.firstName} ${i.lastName}` : "Unknown";
                          })()}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-neutral-400">Unassigned</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <Link
                      href={`/bookings/${panel.lesson.bookingId}/line-items/${panel.lesson.id}/edit`}
                      className="block w-full rounded border border-neutral-300 px-4 py-2 text-center text-sm text-neutral-600 hover:border-neutral-400"
                      onClick={() => setPanel(null)}
                    >
                      Edit lesson
                    </Link>
                    <Link
                      href={`/bookings/${panel.lesson.bookingId}`}
                      className="block w-full rounded border border-neutral-300 px-4 py-2 text-center text-sm text-neutral-600 hover:border-neutral-400"
                      onClick={() => setPanel(null)}
                    >
                      View booking →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
