"use client";

import React, { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { moveLineItem } from "../bookings/actions";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Lesson {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string | null; // HH:MM
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

interface Props {
  lessons: Lesson[];
  instructors: InstructorRow[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const BRAND_COLORS: Record<string, string> = {
  PV: "#3B82F6",
  PX: "#10B981",
  VV: "#8B5CF6",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Date helpers ───────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const day = d.getUTCDay(); // 0=Sun,1=Mon…6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() + diff);
  return mon;
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setUTCDate(d.getUTCDate() + n);
  return result;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatColHeader(d: Date): { day: string; date: string; isToday: boolean } {
  const today = toDateStr(new Date());
  return {
    day: DAYS[d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1],
    date: d.toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short" }),
    isToday: toDateStr(d) === today,
  };
}

function formatDuration(min: number): string {
  if (min >= 360) return "Full day";
  if (min % 60 === 0) return `${min / 60}h`;
  return `${Math.floor(min / 60)}h${min % 60}`;
}

// ── Initials ───────────────────────────────────────────────────────────────────

function initials(first: string, last: string): string {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

// ── Lesson block ───────────────────────────────────────────────────────────────

function LessonBlock({
  lesson,
  isDragging,
  onDragStart,
  onClick,
}: {
  lesson: Lesson;
  isDragging: boolean;
  onDragStart: () => void;
  onClick: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onClick={onClick}
      className="mb-1 cursor-grab rounded px-2 py-1 text-xs text-white shadow-sm select-none active:cursor-grabbing"
      style={{
        backgroundColor: lesson.instructorColor,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div className="font-medium truncate">
        {lesson.startTime ? `${lesson.startTime} · ` : ""}
        {lesson.clientLastName}
      </div>
      <div className="truncate opacity-80">
        {lesson.durationMin ? formatDuration(lesson.durationMin) : lesson.description}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ScheduleView({ lessons, instructors }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Week navigation (client-side — all data loaded upfront)
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));

  // Brand filters
  const [visibleBrands, setVisibleBrands] = useState<Set<string>>(
    new Set(["PV", "PX", "VV"])
  );

  // Drag state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null); // "instructorId|date" or "unassigned|date"

  // Side panel
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Week days
  const weekDays = Array.from({ length: 14 }, (_, i) => addDays(weekStart, i));
  const weekDayStrs = weekDays.map(toDateStr);

  // Filter instructors by brand
  const visibleInstructors = instructors.filter((i) =>
    visibleBrands.has(i.brandCode)
  );

  // Build lookup: [instructorId][date] → lessons[]
  const byInstructor: Record<string, Record<string, Lesson[]>> = {};
  const unassignedByDate: Record<string, Lesson[]> = {};

  for (const lesson of lessons) {
    // Only include lessons for visible brands (booking brand)
    if (!visibleBrands.has(lesson.brandCode)) continue;

    if (lesson.instructorId) {
      if (!byInstructor[lesson.instructorId])
        byInstructor[lesson.instructorId] = {};
      if (!byInstructor[lesson.instructorId][lesson.date])
        byInstructor[lesson.instructorId][lesson.date] = [];
      byInstructor[lesson.instructorId][lesson.date].push(lesson);
    } else {
      if (!unassignedByDate[lesson.date]) unassignedByDate[lesson.date] = [];
      unassignedByDate[lesson.date].push(lesson);
    }
  }

  // Drop handler
  const handleDrop = useCallback(
    (instructorId: string | null, date: string) => {
      if (!draggedId) return;
      const lesson = lessons.find((l) => l.id === draggedId);
      if (!lesson) return;
      if (lesson.instructorId === instructorId && lesson.date === date) {
        setDraggedId(null);
        setDropTarget(null);
        return;
      }
      startTransition(async () => {
        await moveLineItem(draggedId, instructorId, date);
        router.refresh();
      });
      setDraggedId(null);
      setDropTarget(null);
    },
    [draggedId, lessons, router, startTransition]
  );

  function toggleBrand(code: string) {
    setVisibleBrands((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        if (next.size === 1) return next; // keep at least one
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  function goToToday() {
    setWeekStart(getMonday(new Date()));
  }

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

  return (
    <div className="flex flex-col gap-3">
      {/* ── Controls bar ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Week navigation */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDays(w, -14))}
            className="rounded border border-neutral-200 px-2.5 py-1 text-sm text-neutral-600 hover:bg-neutral-50"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDays(w, 14))}
            className="rounded border border-neutral-200 px-2.5 py-1 text-sm text-neutral-600 hover:bg-neutral-50"
          >
            ›
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="rounded border border-neutral-200 px-3 py-1 text-sm text-neutral-600 hover:bg-neutral-50"
          >
            Today
          </button>
        </div>

        <span className="text-sm font-medium text-neutral-700">{weekLabel}</span>

        <div className="ml-auto flex items-center gap-2">
          {/* Brand toggles */}
          {(["PV", "PX", "VV"] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => toggleBrand(code)}
              className="rounded-full px-3 py-0.5 text-xs font-semibold transition-opacity"
              style={{
                backgroundColor: visibleBrands.has(code)
                  ? BRAND_COLORS[code]
                  : "#E2E8F0",
                color: visibleBrands.has(code) ? "#fff" : "#94A3B8",
              }}
            >
              {code}
            </button>
          ))}
        </div>

        {isPending && (
          <span className="text-xs text-neutral-400">Saving…</span>
        )}
      </div>

      {/* ── Schedule grid ─────────────────────────────────────────── */}
      <div className="overflow-auto rounded-lg border border-neutral-200 bg-white">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `200px repeat(14, minmax(110px, 1fr))`,
            minWidth: "200px",
          }}
        >
          {/* ── Header row ── */}
          {/* Corner cell */}
          <div className="sticky left-0 top-0 z-30 border-b border-r border-neutral-200 bg-neutral-50 px-3 py-2">
            <span className="text-xs font-medium text-neutral-400">
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
                <div
                  className={`text-xs font-medium ${isToday ? "text-blue-600" : "text-neutral-400"}`}
                >
                  {day}
                </div>
                <div
                  className={`text-sm font-semibold ${isToday ? "text-blue-600" : "text-neutral-700"}`}
                >
                  {date}
                </div>
              </div>
            );
          })}

          {/* ── Unassigned row ── */}
          <div className="sticky left-0 z-10 flex items-center gap-2 border-b border-r border-neutral-100 bg-white px-3 py-2">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: "#94A3B8" }}
            >
              ?
            </span>
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-neutral-700">
                Unassigned
              </div>
            </div>
          </div>

          {weekDayStrs.map((dateStr) => {
            const cellKey = `unassigned|${dateStr}`;
            const isOver = dropTarget === cellKey;
            const cellLessons = unassignedByDate[dateStr] ?? [];
            return (
              <div
                key={dateStr}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropTarget(cellKey);
                }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(null, dateStr);
                }}
                className={`border-b border-r border-neutral-100 p-1 transition-colors ${
                  isOver ? "bg-slate-100" : ""
                }`}
                style={{ minHeight: "52px" }}
              >
                {cellLessons.map((lesson) => (
                  <LessonBlock
                    key={lesson.id}
                    lesson={lesson}
                    isDragging={draggedId === lesson.id}
                    onDragStart={() => setDraggedId(lesson.id)}
                    onClick={() => setSelectedLesson(lesson)}
                  />
                ))}
              </div>
            );
          })}

          {/* ── Instructor rows ── */}
          {visibleInstructors.map((inst) => (
            <React.Fragment key={inst.id}>
              {/* Instructor name cell */}
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
                const isOver = dropTarget === cellKey;
                const cellLessons =
                  byInstructor[inst.id]?.[dateStr] ?? [];
                return (
                  <div
                    key={dateStr}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDropTarget(cellKey);
                    }}
                    onDragLeave={() => setDropTarget(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop(inst.id, dateStr);
                    }}
                    className={`border-b border-r border-neutral-100 p-1 transition-colors ${
                      isOver ? "bg-blue-50" : ""
                    }`}
                    style={{ minHeight: "52px" }}
                  >
                    {cellLessons.map((lesson) => (
                      <LessonBlock
                        key={lesson.id}
                        lesson={lesson}
                        isDragging={draggedId === lesson.id}
                        onDragStart={() => setDraggedId(lesson.id)}
                        onClick={() => setSelectedLesson(lesson)}
                      />
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Lesson detail panel ───────────────────────────────────── */}
      {selectedLesson && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setSelectedLesson(null)}
          />
          <div className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-neutral-800">Lesson</h2>
              <button
                type="button"
                onClick={() => setSelectedLesson(null)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Client */}
              <div>
                <p className="text-base font-semibold text-neutral-800">
                  {selectedLesson.clientName}
                </p>
                <p className="text-xs text-neutral-500">{selectedLesson.brandCode}</p>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-medium text-neutral-400">Description</p>
                <p className="text-sm text-neutral-800">{selectedLesson.description}</p>
              </div>

              {/* Date / time / duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-neutral-400">Date</p>
                  <p className="text-sm text-neutral-800">{selectedLesson.date}</p>
                </div>
                {selectedLesson.startTime && (
                  <div>
                    <p className="text-xs font-medium text-neutral-400">Time</p>
                    <p className="text-sm text-neutral-800">{selectedLesson.startTime}</p>
                  </div>
                )}
                {selectedLesson.durationMin && (
                  <div>
                    <p className="text-xs font-medium text-neutral-400">Duration</p>
                    <p className="text-sm text-neutral-800">
                      {formatDuration(selectedLesson.durationMin)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-neutral-400">Price</p>
                  <p className="text-sm tabular-nums text-neutral-800">
                    CHF {selectedLesson.priceChf.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Instructor */}
              <div>
                <p className="text-xs font-medium text-neutral-400">Instructor</p>
                {selectedLesson.instructorId ? (
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: selectedLesson.instructorColor }}
                    />
                    <p className="text-sm text-neutral-800">
                      {instructors.find(
                        (i) => i.id === selectedLesson.instructorId
                      )
                        ? `${instructors.find((i) => i.id === selectedLesson.instructorId)!.firstName} ${instructors.find((i) => i.id === selectedLesson.instructorId)!.lastName}`
                        : "Unknown"}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-400">Unassigned</p>
                )}
              </div>

              {/* Links */}
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href={`/bookings/${selectedLesson.bookingId}/line-items/${selectedLesson.id}/edit`}
                  className="block w-full rounded border border-neutral-300 px-4 py-2 text-center text-sm text-neutral-600 hover:border-neutral-400"
                  onClick={() => setSelectedLesson(null)}
                >
                  Edit lesson
                </Link>
                <Link
                  href={`/bookings/${selectedLesson.bookingId}`}
                  className="block w-full rounded border border-neutral-300 px-4 py-2 text-center text-sm text-neutral-600 hover:border-neutral-400"
                  onClick={() => setSelectedLesson(null)}
                >
                  View booking →
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
