import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteBooking } from "./actions";
import { BookingStatus, BookingSource } from "@prisma/client";

const STATUS_BADGE: Record<BookingStatus, string> = {
  TENTATIVE: "bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-200",
  CONFIRMED: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  COMPLETED: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200",
  CANCELLED: "bg-red-50 text-red-500 ring-1 ring-inset ring-red-200",
};

const SOURCE_LABEL: Record<BookingSource, string> = {
  DIRECT: "Direct",
  TOUR_OPERATOR: "Tour op",
  HOTEL_CONCIERGE: "Hotel",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  });
}

export default async function BookingsPage() {
  const bookings = await prisma.booking.findMany({
    include: {
      client: true,
      brand: true,
      partner: { select: { name: true } },
      lineItems: {
        select: { date: true, priceChf: true },
        orderBy: { date: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Bookings</h1>
          <p className="text-sm text-neutral-500">{bookings.length} on file</p>
        </div>
        <Link
          href="/bookings/new"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          New booking
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2 pr-4 font-medium">Client</th>
              <th className="py-2 pr-4 font-medium">Brand</th>
              <th className="py-2 pr-4 font-medium">Source</th>
              <th className="py-2 pr-4 font-medium">Lessons</th>
              <th className="py-2 pr-4 font-medium">Dates</th>
              <th className="py-2 pr-4 font-medium">Total CHF</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-neutral-400">
                  No bookings yet —{" "}
                  <Link href="/bookings/new" className="underline hover:text-neutral-600">
                    create the first one
                  </Link>
                </td>
              </tr>
            )}
            {bookings.map((b) => {
              const dates = b.lineItems.map((li) => li.date);
              const firstDate = dates[0] ?? null;
              const lastDate = dates.length > 1 ? dates[dates.length - 1] : null;
              const total = b.lineItems.reduce(
                (sum, li) => sum + Number(li.priceChf),
                0
              );
              return (
                <tr key={b.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="py-2.5 pr-4 font-medium">
                    <Link href={`/bookings/${b.id}`} className="hover:underline">
                      {b.client.firstName} {b.client.lastName}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4">{b.brand.code}</td>
                  <td className="py-2.5 pr-4">
                    {SOURCE_LABEL[b.source]}
                    {b.partner && (
                      <span className="text-neutral-400"> · {b.partner.name}</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums">{b.lineItems.length}</td>
                  <td className="py-2.5 pr-4 text-neutral-500">
                    {firstDate
                      ? lastDate
                        ? `${formatDate(firstDate)} – ${formatDate(lastDate)}`
                        : formatDate(firstDate)
                      : "—"}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums">
                    {total > 0 ? `${total.toFixed(2)}` : "—"}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[b.status]}`}
                    >
                      {b.status.charAt(0) + b.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/bookings/${b.id}`}
                        className="text-neutral-500 underline"
                      >
                        View
                      </Link>
                      <DeleteButton
                        action={deleteBooking}
                        id={b.id}
                        confirmMessage={`Delete booking for ${b.client.firstName} ${b.client.lastName}? This cannot be undone.`}
                        className="text-red-400 underline"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
