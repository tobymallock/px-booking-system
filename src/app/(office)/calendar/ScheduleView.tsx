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

type ViewMode = "2week" | "month";

type Panel =
  | { type: "add"; startDate: string; endDate: string; instructorId: string | null }
  | { type: "view"; lesson: Lesson }
  | null;

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

// Visible time range: 08:00 – 19:00 (11 hours = 660 minutes)
const DAY_START_MIN = 8 * 60;
const DAY_END_MIN = 19 * 60;
const DAY_TOTAL_MIN = DAY_END_MIN - DAY_START_MIN; // 660

// Pixel height of each instructor/day cell
const CELL_H = 160;

// Horizontal guide lines (as % from top of cell)
const GUIDES: { pct: number; strong: boolean; label: string }[] = [
  { pct: ((10 * 60 - DAY_START_MIN) / DAY_TOTAL_MIN) * 100, strong: false, label: "10am" },
  { pct: ((12 * 60 - DAY_START_MIN) / DAY_TOTAL_MIN) * 100, strong: true,  label: "noon" },
  { pct: ((14 * 60 - DAY_START_MIN) / DAY_TOTAL_MIN) * 100, strong: false, label: "2pm"  },
  { pct: ((16 * 60 - DAY_START_MIN) / DAY_TOTAL_MIN) * 100, strong: false, label: "4pm"  },
];

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

function getViewDays(anchor: Date, mode: ViewMode): Date[] {
  if (mode === "2week") {
    return Array.from({ length: 14 }, (_, i) => addDays(anchor, i));
  }
  // Month: every day of anchor's UTC calendar month
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth();
  const first = new Date(Date.UTC(y, m, 1));
  const last  = new Date(Date.UTC(y, m + 1, 0));
  const days: Date[] = [];
  const cur = new Date(first);
  while (cur <= last) { days.push(new Date(cur)); cur.setUTCDate(cur.getUTCDate() + 1); }
  return days;
}

function formatColHeader(d: Date, compact: boolean) {
  const today = toDateStr(new Date());
  const dow = d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1;
  return {
    day:  compact ? DAY_LABELS[dow][0] : DAY_LABELS[dow],
    date: compact
      ? String(d.getUTCDate())
      : d.toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short" }),
    isToday: toDateStr(d) === today,
    isWeekend: dow >= 5,
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

// Convert "HH:MM" → minutes from midnight
function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Top offset as % of CELL_H
function lessonTopPct(startTime: string | null): number {
  if (!startTime) return 0;
  const mins = timeToMin(startTime);
  return Math.max(0, Math.min(94, ((mins - DAY_START_MIN) / DAY_TOTAL_MIN) * 100));
}

// Height as % of CELL_H — minimum 5% so even short lessons are visible
function lessonHeightPct(durationMin: number | null, startTime: string | null): number {
  const dur = durationMin ?? (startTime ? 120 : 45);
  return Math.max(5, Math.min(100, (dur / DAY_TOTAL_MIN) * 100));
}

// ── Lesson block (absolutely positioned within its day cell) ───────────────────

function LessonBlock({
  lesson, topPct, heightPct, compact,
  onDragStart, onDragEnd, onClick,
}: {
  lesson: Lesson;
  topPct: number;
  heightPct: number;
  compact?: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: (e: React.MouseEvent) => void;
}) {
  const heightPx = (heightPct / 100) * CELL_H;
  const showTime = heightPx >= 30 && !compact && lesson.startTime;
  const showDuration = heightPx >= 42 && !compact && lesson.durationMin;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onClick}
      style={{
        position: "absolute",
        top: `${topPct}%`,
        height: `${heightPct}%`,
        left: "2px",
        right: "2px",
        backgroundColor: lesson.instructorColor,
        zIndex: 2,
        minHeight: "12px",
      }}
      className="cursor-grab rounded overflow-hidden px-1.5 py-0.5 text-white shadow-sm select-none active:cursor-grabbing hover:brightness-110 transition-all"
    >
      <div className="font-semibold truncate text-xs leading-tight">
        {compact ? lesson.clientLastName.charAt(0) : lesson.clientLastName}
      </div>
      {(showTime || showDuration) && (
        <div className="opacity-85 truncate text-[10px] leading-tight mt-px">
          {showTime ? lesson.startTime : ""}
          {showTime && showDuration ? " · " : ""}
          {showDuration ? formatDuration(lesson.durationMin!) : ""}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ScheduleView({ lessons, instructors, bookings }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [anchor, setAnchor] = useState<Date>(() => getMonday(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>("2week");
  const [visibleBrands, setVisibleBrands] = useState<Set<string>>(
    new Set(["PV", "PX", "VV"])
  );

  // HTML5 drag-to-move
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // Mouse-drag-to-create (horizontal date range selection)
  const [cellDrag, setCellDrag] = useState<CellDrag | null>(null);
  const isDraggingRef = useRef(false);

  const [panel, setPanel] = useState<Panel>(null);
  const [addBookingId, setAddBookingId] = useState("");

  const isCompact = viewMode === "month";
  const viewDays = getViewDays(anchor, viewMode);
  const viewDayStrs = viewDays.map(toDateStr);
  const colCount = viewDays.length;

  const visibleInstructors = instructors.filter((i) =>
    visibleBrands.has(i.brandCode)
  );

  // Build date-keyed lesson lookups
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

  // ── Global mouseup: finalise cell-drag-to-create ──────────────────────────────
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

  // ── Cell-drag helpers ─────────────────────────────────────────────────────────

  function cellMouseDown(instructorId: string | null, dateStr: string) {
    isDraggingRef.current = true;
    setCellDrag({ instructorId, startDate: dateStr, currentDate: dateStr });
  }

  function cellMouseEnter(instructorId: string | null, dateStr: string) {
    if (!isDraggingRef.current || !cellDrag) return;
    if (cellDrag.instructorId !== instructorId) return; // lock to same row
    setCellDrag((prev) => (prev ? { ...prev, currentDate: dateStr } : null));
  }

  function isCellInDragRange(instructorId: string | null, dateStr: string): boolean {
    if (!cellDrag || cellDrag.instructorId !== instructorId) return false;
    const [start, end] = sortedRange(cellDrag.startDate, cellDrag.currentDate);
    return dateStr >= start && dateStr <= end;
  }

  // ── HTML5 drag-to-move helpers ────────────────────────────────────────────────

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

  // ── Add lesson(s) form ────────────────────────────────────────────────────────

  function handleAddLessons(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      if (formData.get("startDate") === formData.get("endDate") || !formData.get("endDate")) {
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
      if (next.has(code)) { if (next.size === 1) return next; next.delete(code); }
      else next.add(code);
      return next;
    });
  }

  // ── Navigation ────────────────────────────────────────────────────────────────

  function navPrev() {
    if (viewMode === "2week") {
      setAnchor((a) => addDays(a, -14));
    } else {
      setAnchor((a) => new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() - 1, 1)));
    }
  }

  function navNext() {
    if (viewMode === "2week") {
      setAnchor((a) => addDays(a, 14));
    } else {
      setAnchor((a) => new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + 1, 1)));
    }
  }

  function navToday() {
    setAnchor(getMonday(new Date()));
  }

  // ── Derived values ────────────────────────────────────────────────────────────

  const periodLabel = viewMode === "month"
    ? anchor.toLocaleDateString("en-GB", { timeZone: "UTC", month: "long", year: "numeric" })
    : `${viewDays[0].toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short" })} – ${viewDays[viewDays.length - 1].toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" })}`;

  const selectedBooking = bookings.find((b) => b.id === addBookingId);
  const panelInstructors = addBookingId && selectedBooking
    ? instructors.filter((i) => i.brandId === selectedBooking.brandId)
    : instructors;

  const panelDayCount = panel?.type === "add" ? daysBetween(panel.startDate, panel.endDate) : 1;

  const COL_MIN = isCompact ? 36 : 64;
  const gridCols = `180px repeat(${colCount}, minmax(${COL_MIN}px, 1fr))`;

  // ── Render a single timed day-cell ────────────────────────────────────────────

  function renderCell(
    instructorId: string | null,
    dateStr: string,
    cellLessons: Lesson[],
    isWeekend: boolean
  ) {
    const cellKey = `${instructorId ?? "unassigned"}|${dateStr}`;
    const isDropTarget = dropTarget === cellKey;
    const isInDrag = isCellInDragRange(instructorId, dateStr);

    return (
      <div
        key={dateStr}
        onMouseDown={() => { if (!draggingId) cellMouseDown(instructorId, dateStr); }}
        onMouseEnter={() => cellMouseEnter(instructorId, dateStr)}
        onDragOver={(e) => handleDragOver(e, cellKey)}
        onDragLeave={() => setDropTarget(null)}
        onDrop={(e) => handleDrop(e, instructorId, dateStr)}
        className={`border-b border-r border-neutral-100 cursor-crosshair transition-colors ${
          isWeekend ? "bg-neutral-50/60" : ""
        } ${isDropTarget ? "ring-2 ring-inset ring-blue-300 bg-blue-50" : ""}`}
        style={{ position: "relative", height: `${CELL_H}px` }}
      >
        {/* Time guide lines */}
        {GUIDES.map((g) => (
          <div
            key={g.label}
            style={{
              position: "absolute",
              top: `${g.pct}%`,
              left: 0, right: 0,
              borderTop: g.strong ? "1px solid #E2E8F0" : "1px dashed #F1F5F9",
              zIndex: 0,
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Drag-range selection overlay */}
        {isInDrag && (
          <div
            style={{
              position: "absolute", inset: 0,
              background: "rgba(59,130,246,0.12)",
              zIndex: 3, pointerEvents: "none",
            }}
          />
        )}

        {/* Lesson blocks */}
        {cellLessons.map((lesson) => (
          <LessonBlock
            key={lesson.id}
            lesson={lesson}
            topPct={lessonTopPct(lesson.startTime)}
            heightPct={lessonHeightPct(lesson.durationMin, lesson.startTime)}
            compact={isCompact}
            onDragStart={(e) => handleDragStart(e, lesson.id)}
            onDragEnd={() => setDraggingId(null)}
            onClick={(e) => { e.stopPropagation(); setPanel({ type: "view", lesson }); }}
          />
        ))}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3" style={{ userSelect: cellDrag ? "none" : "auto" }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            type="button" onClick={navPrev}
            className="rounded border border-neutral-200 px-2.5 py-1 text-sm hover:bg-neutral-50"
          >‹</button>
          <button
            type="button" onClick={navNext}
            className="rounded border border-neutral-200 px-2.5 py-1 text-sm hover:bg-neutral-50"
          >›</button>
          <button
            type="button" onClick={navToday}
            className="rounded border border-neutral-200 px-3 py-1 text-sm hover:bg-neutral-50"
          >Today</button>
        </div>

        <span className="text-sm font-medium text-neutral-700">{periodLabel}</span>

        {/* View toggle */}
        <div className="flex items-center overflow-hidden rounded border border-neutral-200 text-xs">
          {(["2week", "month"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 transition-colors ${
                viewMode === mode
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {mode === "2week" ? "2 Weeks" : "Month"}
            </button>
          ))}
        </div>

        {/* Brand filters */}
        <div className="ml-auto flex items-center gap-2">
          {(["PV", "PX", "VV"] as const).map((code) => (
            <button
              key={code} type="button" onClick={() => toggleBrand(code)}
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

        {isPending && <span className="text-xs text-neutral-400 animate-pulse">Saving…</span>}
      </div>

      {/* Schedule grid */}
      <div className="overflow-auto rounded-lg border border-neutral-200 bg-white">
        <div className="grid" style={{ gridTemplateColumns: gridCols }}>

          {/* ── Header row ── */}
          <div className="sticky left-0 top-0 z-30 border-b border-r border-neutral-200 bg-neutral-50 px-3 py-2">
            <span className="text-xs text-neutral-400">{visibleInstructors.length} instructors</span>
          </div>
          {viewDays.map((d) => {
            const { day, date, isToday, isWeekend } = formatColHeader(d, isCompact);
            return (
              <div
                key={toDateStr(d)}
                className={`sticky top-0 z-20 border-b border-r border-neutral-200 px-1 py-1.5 text-center ${
                  isWeekend ? "bg-neutral-100" : "bg-neutral-50"
                }`}
              >
                <div className={`text-[10px] font-medium ${isToday ? "text-blue-600" : "text-neutral-400"}`}>{day}</div>
                <div className={`text-xs font-semibold ${isToday ? "text-blue-600" : "text-neutral-700"}`}>{date}</div>
              </div>
            );
          })}

          {/* ── Unassigned row ── */}
          <div
            className="sticky left-0 z-10 flex items-start gap-2 border-b border-r border-neutral-100 bg-white px-3 py-2"
            style={{ height: `${CELL_H}px` }}
          >
            <span
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: "#94A3B8" }}
            >?</span>
            <div className="mt-1 text-xs font-medium text-neutral-500">Unassigned</div>
          </div>
          {viewDays.map((d) => {
            const dateStr = toDateStr(d);
            const { isWeekend } = formatColHeader(d, isCompact);
            return renderCell(null, dateStr, unassignedByDate[dateStr] ?? [], isWeekend);
          })}

          {/* ── Instructor rows ── */}
          {visibleInstructors.map((inst) => (
            <React.Fragment key={inst.id}>
              <div
                className="sticky left-0 z-10 flex items-start gap-2 border-b border-r border-neutral-100 bg-white px-3 py-2"
                style={{
                  height: `${CELL_H}px`,
                  borderLeft: `3px solid ${BRAND_COLORS[inst.brandCode] ?? "#CBD5E1"}`,
                }}
              >
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: inst.color }}
                >
                  {initials(inst.firstName, inst.lastName)}
                </span>
                <div className="mt-1 min-w-0">
                  <div className="truncate text-xs font-medium text-neutral-800">
                    {inst.firstName} {inst.lastName}
                  </div>
                  <div className="text-xs text-neutral-400">{inst.brandCode}</div>
                </div>
              </div>
              {viewDays.map((d) => {
                const dateStr = toDateStr(d);
                const { isWeekend } = formatColHeader(d, isCompact);
                return renderCell(inst.id, dateStr, byInstructor[inst.id]?.[dateStr] ?? [], isWeekend);
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Side panel ── */}
      {panel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setPanel(null)} />
          <div className="fixed right-0 top-0 z-50 flex h-full w-96 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-800">
                  {panel.type === "add" ? "Add lesson" : "Lesson"}
                </h2>
                {panel.type === "add" && (
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {panel.startDate === panel.endDate
                      ? panel.startDate
                      : `${panel.startDate} → ${panel.endDate} · ${panelDayCount} days`}
                  </p>
                )}
              </div>
              <button
                type="button" onClick={() => setPanel(null)}
                className="rounded p-1 text-neutral-400 hover:text-neutral-600"
              >✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Add lesson form */}
              {panel.type === "add" && (
                <form onSubmit={handleAddLessons} className="space-y-4">
                  <input type="hidden" name="date"      value={panel.startDate} />
                  <input type="hidden" name="startDate" value={panel.startDate} />
                  <input type="hidden" name="endDate"   value={panel.endDate} />

                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">Booking</label>
                    <select
                      name="bookingId" required
                      value={addBookingId} onChange={(e) => setAddBookingId(e.target.value)}
                      className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                    >
                      <option value="">Select booking…</option>
                      {bookings.map((b) => (
                        <option key={b.id} value={b.id}>{b.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">Start time</label>
                    <input
                      type="time" name="startTime" defaultValue="09:00"
                      className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">Duration</label>
                    <select
                      name="durationMin"
                      className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      {DURATIONS.map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">Description</label>
                    <input
                      name="description" required
                      placeholder="e.g. Private ski lesson"
                      className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">
                      Price CHF{panelDayCount > 1 ? " (per day)" : ""}
                    </label>
                    <input
                      type="number" name="priceChf" min="0" step="0.01"
                      placeholder="0.00" required
                      className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">Instructor</label>
                    <select
                      name="assignedInstructorId"
                      defaultValue={panel.instructorId ?? ""}
                      className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                    >
                      <option value="">— Unassigned —</option>
                      {panelInstructors.map((i) => (
                        <option key={i.id} value={i.id}>{i.firstName} {i.lastName} ({i.brandCode})</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit" disabled={isPending}
                    className="w-full rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                  >
                    {isPending ? "Adding…" : panelDayCount > 1 ? `Add ${panelDayCount} lessons` : "Add lesson"}
                  </button>
                </form>
              )}

              {/* View lesson */}
              {panel.type === "view" && (
                <div className="space-y-4">
                  <div>
                    <p className="text-base font-semibold text-neutral-800">{panel.lesson.clientName}</p>
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
                        <p className="text-sm text-neutral-800">{formatDuration(panel.lesson.durationMin)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-neutral-400">Price</p>
                      <p className="text-sm tabular-nums text-neutral-800">CHF {panel.lesson.priceChf.toFixed(2)}</p>
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
                            const i = instructors.find((x) => x.id === panel.lesson.instructorId);
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
