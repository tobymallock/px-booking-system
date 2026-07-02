import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateLineItem } from "../../../../actions";

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

function dateToIso(date: Date): string {
  return date.toISOString().split("T")[0];
}

function timeToHHMM(date: Date): string {
  const h = date.getUTCHours().toString().padStart(2, "0");
  const m = date.getUTCMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export default async function EditLineItemPage({
  params,
}: {
  params: Promise<{ id: string; liid: string }>;
}) {
  const { id, liid } = await params;

  const lineItem = await prisma.bookingLineItem.findUnique({
    where: { id: liid },
    include: { booking: { select: { brandId: true } } },
  });

  if (!lineItem || lineItem.bookingId !== id) notFound();

  const instructors = await prisma.instructor.findMany({
    where: { brandId: lineItem.booking.brandId, isActive: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Edit lesson</h1>
      </div>

      <form
        action={updateLineItem}
        className="grid max-w-2xl grid-cols-3 gap-3 rounded-lg border border-neutral-200 p-4"
      >
        <input type="hidden" name="id" value={liid} />
        <input type="hidden" name="bookingId" value={id} />

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Date
          </label>
          <input
            type="date"
            name="date"
            required
            defaultValue={dateToIso(lineItem.date)}
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
            defaultValue={lineItem.startTime ? timeToHHMM(lineItem.startTime) : ""}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Duration
          </label>
          <select
            name="durationMin"
            defaultValue={lineItem.durationMin?.toString() ?? ""}
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
            defaultValue={lineItem.description}
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
            defaultValue={Number(lineItem.priceChf).toFixed(2)}
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
            defaultValue={lineItem.assignedInstructorId ?? ""}
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

        <div className="col-span-3 flex gap-3">
          <button
            type="submit"
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Save changes
          </button>
          <a
            href={`/bookings/${id}`}
            className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-600 hover:border-neutral-400"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
