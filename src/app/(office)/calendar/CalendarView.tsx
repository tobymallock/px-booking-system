"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createLineItem } from "../bookings/actions";

// ── Types ──────────────────────────────────────────────────────────────────────

interface CalEvent {
  id: string;
  title: string;
  start: string;
  color: string;
  extendedProps: {
    bookingId: string;
    clientName: string;
    brandCode: string;
    instructorName: string | null;
    instructorId: string | null;
    description: string;
    startTime: string | null;
    durationMin: number | null;
    priceChf: number;
  };
}

interface BookingOption {
  id: string;
  label: string;
  brandId: string;
}

interface InstructorOption {
  id: string;
  firstName: string;
  lastName: string;
  brandId: string;
  color: string;
}

interface Props {
  events: CalEvent[];
  bookings: BookingOption[];
  instructors: InstructorOption[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(min: number): string {
  if (min >= 360) return "Full day";
  if (min % 60 === 0) return `${min / 60}hr`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}hr ${m}min` : `${m}min`;
}

// ── Panel state ────────────────────────────────────────────────────────────────

type Panel =
  | { type: "add"; date: string }
  | { type: "view"; event: CalEvent }
  | null;

// ── Component ──────────────────────────────────────────────────────────────────

export function CalendarView({ events, bookings, instructors }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filter state — null means "show all"; otherwise a Set of visible instructor IDs
  // We also track whether to show unassigned (TBC) events
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [hideTbc, setHideTbc] = useState(false);

  const [panel, setPanel] = useState<Panel>(null);

  // For the add-lesson panel
  const [addBookingId, setAddBookingId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Filter events
  const visibleEvents = events.filter((e) => {
    const iid = e.extendedProps.instructorId;
    if (!iid) return !hideTbc;
    return !hiddenIds.has(iid);
  });

  // Toggle an instructor's visibility
  function toggleInstructor(id: string) {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Instructors filtered to the selected booking's brand (for the add panel)
  const selectedBooking = bookings.find((b) => b.id === addBookingId);
  const panelInstructors = addBookingId
    ? instructors.filter((i) => i.brandId === selectedBooking?.brandId)
    : instructors;

  // Handlers
  function handleDateClick(arg: DateClickArg) {
    setAddBookingId("");
    setPanel({ type: "add", date: arg.dateStr });
  }

  function handleEventClick(arg: EventClickArg) {
    const raw = arg.event;
    const evt: CalEvent = {
      id: raw.id,
      title: raw.title,
      start: raw.startStr,
      color: (raw.backgroundColor as string) ?? "",
      extendedProps: raw.extendedProps as CalEvent["extendedProps"],
    };
    setPanel({ type: "view", event: evt });
  }

  function handleAddLesson(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await createLineItem(formData);
      setPanel(null);
      router.refresh();
    });
  }

  function closePanel() {
    setPanel(null);
  }

  return (
    <div className="relative">
      {/* ── Instructor filter bar ─────────────────────────────────────────── */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-neutral-500">Show:</span>

        {instructors.map((inst) => {
          const hidden = hiddenIds.has(inst.id);
          return (
            <button
              key={inst.id}
              type="button"
              onClick={() => toggleInstructor(inst.id)}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity"
              style={{
                backgroundColor: hidden ? "#F1F5F9" : inst.color,
                color: hidden ? "#94A3B8" : "#fff",
                border: `1.5px solid ${hidden ? "#E2E8F0" : inst.color}`,
              }}
            >
              {inst.firstName} {inst.lastName[0]}.
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setHideTbc(!hideTbc)}
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors"
          style={{
            backgroundColor: hideTbc ? "#F1F5F9" : "#CBD5E1",
            color: hideTbc ? "#94A3B8" : "#475569",
            borderColor: hideTbc ? "#E2E8F0" : "#CBD5E1",
          }}
        >
          TBC
        </button>
      </div>

      {/* ── Calendar ─────────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
          events={visibleEvents}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="auto"
          eventDisplay="block"
          dayMaxEvents={4}
          fixedWeekCount={false}
        />
      </div>

      {/* ── Side panel ───────────────────────────────────────────────────── */}
      {panel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={closePanel}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 z-50 flex h-full w-96 flex-col bg-white shadow-xl">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-neutral-800">
                {panel.type === "add" ? `Add lesson — ${panel.date}` : "Lesson"}
              </h2>
              <button
                type="button"
                onClick={closePanel}
                className="text-neutral-400 hover:text-neutral-600"
              >
                ✕
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {panel.type === "add" && (
                <form ref={formRef} onSubmit={handleAddLesson} className="space-y-4">
                  <input type="hidden" name="date" value={panel.date} />

                  {/* Booking selector */}
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

                  {/* Time */}
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

                  {/* Duration */}
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

                  {/* Description */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">
                      Description
                    </label>
                    <input
                      name="description"
                      required
                      placeholder="e.g. 3hr private ski lesson"
                      className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">
                      Price CHF
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

                  {/* Instructor (filtered to booking's brand) */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">
                      Instructor
                    </label>
                    <select
                      name="assignedInstructorId"
                      className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                    >
                      <option value="">— Unassigned —</option>
                      {panelInstructors.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.firstName} {i.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                  >
                    {isPending ? "Adding…" : "Add lesson"}
                  </button>
                </form>
              )}

              {panel.type === "view" && (
                <div className="space-y-4">
                  {/* Client & booking */}
                  <div>
                    <p className="text-base font-semibold text-neutral-800">
                      {panel.event.extendedProps.clientName}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {panel.event.extendedProps.brandCode}
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <p className="text-xs font-medium text-neutral-500">Description</p>
                    <p className="text-sm text-neutral-800">
                      {panel.event.extendedProps.description}
                    </p>
                  </div>

                  {/* Date & time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-neutral-500">Date</p>
                      <p className="text-sm text-neutral-800">{panel.event.start}</p>
                    </div>
                    {panel.event.extendedProps.startTime && (
                      <div>
                        <p className="text-xs font-medium text-neutral-500">Time</p>
                        <p className="text-sm text-neutral-800">
                          {formatTime(panel.event.extendedProps.startTime)}
                        </p>
                      </div>
                    )}
                    {panel.event.extendedProps.durationMin && (
                      <div>
                        <p className="text-xs font-medium text-neutral-500">Duration</p>
                        <p className="text-sm text-neutral-800">
                          {formatDuration(panel.event.extendedProps.durationMin)}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-neutral-500">Price</p>
                      <p className="text-sm tabular-nums text-neutral-800">
                        CHF {panel.event.extendedProps.priceChf.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Instructor */}
                  <div>
                    <p className="text-xs font-medium text-neutral-500">Instructor</p>
                    {panel.event.extendedProps.instructorName ? (
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: panel.event.color }}
                        />
                        <p className="text-sm text-neutral-800">
                          {panel.event.extendedProps.instructorName}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-neutral-400">Unassigned</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-2">
                    <Link
                      href={`/bookings/${panel.event.extendedProps.bookingId}/line-items/${panel.event.id}/edit`}
                      className="block w-full rounded border border-neutral-300 px-4 py-2 text-center text-sm text-neutral-600 hover:border-neutral-400"
                      onClick={closePanel}
                    >
                      Edit lesson
                    </Link>
                    <Link
                      href={`/bookings/${panel.event.extendedProps.bookingId}`}
                      className="block w-full rounded border border-neutral-300 px-4 py-2 text-center text-sm text-neutral-600 hover:border-neutral-400"
                      onClick={closePanel}
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
