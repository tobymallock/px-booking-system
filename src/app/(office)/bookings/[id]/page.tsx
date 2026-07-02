import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DeleteButton } from "@/components/DeleteButton";
import { BookingStatus, BookingSource } from "@prisma/client";
import {
  setBookingStatus,
  createLineItem,
  deleteLineItem,
  deleteBooking,
} from "../actions";

const STATUS_BADGE: Record<BookingStatus, string> = {
  TENTATIVE: "bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-200",
  CONFIRMED: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  COMPLETED: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200",
  CANCELLED: "bg-red-50 text-red-500 ring-1 ring-inset ring-red-200",
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  TENTATIVE: "Tentative",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const SOURCE_LABEL: Record<BookingSource, string> = {
  DIRECT: "Direct",
  TOUR_OPERATOR: "Tour operator",
  HOTEL_CONCIERGE: "Hotel concierge",
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

// What statuses can we transition to from the current one?
const NEXT_STATUSES: Record<BookingStatus, BookingStatus[]> = {
  TENTATIVE: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "TENTATIVE", "CANCELLED"],
  COMPLETED: ["CONFIRMED"],
  CANCELLED: ["TENTATIVE"],
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
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

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      client: true,
      brand: true,
      partner: true,
      lineItems: {
        include: { assignedInstructor: true },
        orderBy: { date: "asc" },
      },
    },
  });

  if (!booking) notFound();

  const instructors = await prisma.instructor.findMany({
    where: { brandId: booking.brandId, isActive: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const total = booking.lineItems.reduce(
    (sum, li) => sum + Number(li.priceChf),
    0
  );

  const nextStatuses = NEXT_STATUSES[booking.status];

  return (
    <div className="max-w-4xl space-y-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">
              {booking.client.firstName} {booking.client.lastName}
            </h1>
            <span
              className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[booking.status]}`}
            >
              {STATUS_LABEL[booking.status]}
            </span>
          </div>
          <p className="text-sm text-neutral-500">
            {booking.brand.name} · {SOURCE_LABEL[booking.source]}
            {booking.partner && ` · ${booking.partner.name}`}
          </p>
          {booking.meetingPoint && (
            <p className="text-sm text-neutral-500">
              <span className="font-medium text-neutral-700">Meeting:</span>{" "}
              {booking.meetingPoint}
            </p>
          )}
          {booking.notes && (
            <p className="text-sm text-neutral-500">
              <span className="font-medium text-neutral-700">Notes:</span>{" "}
              {booking.notes}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/bookings/${id}/edit`}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:border-neutral-400"
          >
            Edit
          </Link>
          <DeleteButton
            action={deleteBooking}
            id={id}
            confirmMessage={`Delete this booking for ${booking.client.firstName} ${booking.client.lastName}? All ${booking.lineItems.length} lesson(s) will be removed. This cannot be undone.`}
            className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-500 hover:border-red-400"
          />
        </div>
      </div>

      {/* ── Status transitions ── */}
      {nextStatuses.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-neutral-400">Move to:</span>
          {nextStatuses.map((s) => (
            <form
              key={s}
              action={async () => {
                "use server";
                await setBookingStatus(id, s);
              }}
            >
              <button
                type="submit"
                className="rounded border border-neutral-300 px-3 py-1 text-xs text-neutral-600 hover:border-neutral-400 hover:bg-neutral-50"
              >
                {STATUS_LABEL[s]}
              </button>
            </form>
          ))}
        </div>
      )}

      {/* ── Lessons ── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-700">Lessons</h2>

        {booking.lineItems.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                <th className="pb-2 pr-4 font-medium">Date</th>
                <th className="pb-2 pr-4 font-medium">Time</th>
                <th className="pb-2 pr-4 font-medium">Duration</th>
                <th className="pb-2 pr-4 font-medium">Description</th>
                <th className="pb-2 pr-4 font-medium">Instructor</th>
                <th className="pb-2 pr-4 font-medium text-right">CHF</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {booking.lineItems.map((li) => (
                <tr key={li.id} className="border-b border-neutral-100">
                  <td className="py-2.5 pr-4">{formatDate(li.date)}</td>
                  <td className="py-2.5 pr-4">
                    {li.startTime ? formatTime(li.startTime) : "—"}
                  </td>
                  <td className="py-2.5 pr-4">
                    {li.durationMin ? formatDuration(li.durationMin) : "—"}
                  </td>
                  <td className="py-2.5 pr-4">{li.description}</td>
                  <td className="py-2.5 pr-4">
                    {li.assignedInstructor ? (
                      `${li.assignedInstructor.firstName} ${li.assignedInstructor.lastName}`
                    ) : (
                      <span className="text-neutral-400">Unassigned</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {Number(li.priceChf).toFixed(2)}
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/bookings/${id}/line-items/${li.id}/edit`}
                        className="text-xs text-neutral-500 underline"
                      >
                        Edit
                      </Link>
                      <form action={deleteLineItem}>
                        <input type="hidden" name="id" value={li.id} />
                        <button
                          type="submit"
                          className="text-xs text-red-400 underline"
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td
                  colSpan={5}
                  className="pb-1 pt-3 pr-4 text-right text-xs font-medium text-neutral-500"
                >
                  Total
                </td>
                <td className="pb-1 pt-3 pr-4 text-right text-sm font-semibold tabular-nums">
                  {total.toFixed(2)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        ) : (
          <p className="text-sm text-neutral-400">No lessons added yet.</p>
        )}

        {/* ── Add lesson form ── */}
        <div className="rounded-lg border border-neutral-200">
          <p className="border-b border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-700">
            Add lesson
          </p>
          <form
            action={createLineItem}
            className="grid grid-cols-3 gap-3 p-4"
          >
            <input type="hidden" name="bookingId" value={id} />

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Date
              </label>
              <input
                type="date"
                name="date"
                required
                defaultValue={todayIso()}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
              />
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

            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Description
              </label>
              <input
                name="description"
                placeholder="e.g. 3hr private ski lesson"
                required
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>

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

            <div className="col-span-3">
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Instructor
              </label>
              <select
                name="assignedInstructorId"
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">— Unassigned —</option>
                {instructors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.firstName} {i.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-3">
              <button
                type="submit"
                className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
              >
                Add lesson
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Back link ── */}
      <div>
        <Link href="/bookings" className="text-sm text-neutral-500 underline">
          ← All bookings
        </Link>
      </div>
    </div>
  );
}
