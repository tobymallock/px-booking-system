import { prisma } from "@/lib/prisma";
import { ScheduleView } from "./ScheduleView";

// 20-colour palette — deterministic by instructor sort order
const PALETTE = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
  "#14B8A6", "#D946EF", "#0EA5E9", "#A855F7", "#F43F5E",
  "#22C55E", "#EAB308", "#64748B", "#7C3AED", "#DC2626",
];

export default async function CalendarPage() {
  const [lineItems, instructors] = await Promise.all([
    prisma.bookingLineItem.findMany({
      include: {
        booking: {
          include: { client: true, brand: true },
        },
        assignedInstructor: true,
      },
      orderBy: { date: "asc" },
    }),
    prisma.instructor.findMany({
      where: { isActive: true },
      include: { brand: true },
      orderBy: [{ brand: { code: "asc" } }, { lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  // Assign stable colours by sorted order
  const instructorColors: Record<string, string> = {};
  instructors.forEach((inst, i) => {
    instructorColors[inst.id] = PALETTE[i % PALETTE.length];
  });

  const lessons = lineItems.map((li) => ({
    id: li.id,
    date: li.date.toISOString().split("T")[0],
    startTime: li.startTime
      ? `${li.startTime.getUTCHours().toString().padStart(2, "0")}:${li.startTime.getUTCMinutes().toString().padStart(2, "0")}`
      : null,
    durationMin: li.durationMin ?? null,
    description: li.description,
    priceChf: Number(li.priceChf),
    bookingId: li.bookingId,
    clientName: `${li.booking.client.firstName} ${li.booking.client.lastName}`,
    clientLastName: li.booking.client.lastName,
    brandCode: li.booking.brand.code,
    instructorId: li.assignedInstructorId ?? null,
    instructorColor: li.assignedInstructorId
      ? (instructorColors[li.assignedInstructorId] ?? "#94A3B8")
      : "#94A3B8",
  }));

  const instructorRows = instructors.map((inst, i) => ({
    id: inst.id,
    firstName: inst.firstName,
    lastName: inst.lastName,
    brandCode: inst.brand.code,
    brandId: inst.brandId,
    color: PALETTE[i % PALETTE.length],
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Schedule</h1>
      <ScheduleView lessons={lessons} instructors={instructorRows} />
    </div>
  );
}
