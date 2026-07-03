import { prisma } from "@/lib/prisma";
import { CalendarView } from "./CalendarView";

// 15-colour palette for instructors (deterministic by index)
const PALETTE = [
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#84CC16", // lime
  "#F97316", // orange
  "#6366F1", // indigo
  "#14B8A6", // teal
  "#D946EF", // fuchsia
  "#64748B", // slate
  "#DC2626", // red-600
  "#7C3AED", // violet-600
];

const UNASSIGNED_COLOR = "#CBD5E1"; // slate-300

export default async function CalendarPage() {
  const [lineItems, bookings, instructors] = await Promise.all([
    prisma.bookingLineItem.findMany({
      include: {
        booking: {
          include: { client: true, brand: true },
        },
        assignedInstructor: true,
      },
      orderBy: { date: "asc" },
    }),
    prisma.booking.findMany({
      include: { client: true, brand: true },
      orderBy: [{ createdAt: "desc" }],
      where: { status: { not: "CANCELLED" } },
    }),
    prisma.instructor.findMany({
      where: { isActive: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  // Assign stable colors to instructors by index
  const instructorColors: Record<string, string> = {};
  instructors.forEach((inst, i) => {
    instructorColors[inst.id] = PALETTE[i % PALETTE.length];
  });

  const events = lineItems.map((li) => {
    const clientLast = li.booking.client.lastName;
    const instrFirst = li.assignedInstructor?.firstName ?? "TBC";
    const color = li.assignedInstructorId
      ? (instructorColors[li.assignedInstructorId] ?? UNASSIGNED_COLOR)
      : UNASSIGNED_COLOR;

    // Build ISO date string (date is stored as UTC midnight)
    const dateStr = li.date.toISOString().split("T")[0];

    return {
      id: li.id,
      title: `${clientLast} · ${instrFirst}`,
      start: dateStr,
      color,
      extendedProps: {
        bookingId: li.bookingId,
        clientName: `${li.booking.client.firstName} ${li.booking.client.lastName}`,
        brandCode: li.booking.brand.code,
        instructorName: li.assignedInstructor
          ? `${li.assignedInstructor.firstName} ${li.assignedInstructor.lastName}`
          : null,
        instructorId: li.assignedInstructorId ?? null,
        description: li.description,
        startTime: li.startTime ? li.startTime.toISOString() : null,
        durationMin: li.durationMin ?? null,
        priceChf: Number(li.priceChf),
      },
    };
  });

  const bookingOptions = bookings.map((b) => ({
    id: b.id,
    label: `${b.client.lastName}, ${b.client.firstName} (${b.brand.code})`,
    brandId: b.brandId,
  }));

  const instructorOptions = instructors.map((inst, i) => ({
    id: inst.id,
    firstName: inst.firstName,
    lastName: inst.lastName,
    brandId: inst.brandId,
    color: PALETTE[i % PALETTE.length],
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Calendar</h1>
      </div>
      <CalendarView
        events={events}
        bookings={bookingOptions}
        instructors={instructorOptions}
      />
    </div>
  );
}
