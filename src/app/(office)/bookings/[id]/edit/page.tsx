import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateBooking } from "../../actions";

export default async function EditBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [booking, clients, brands, partners] = await Promise.all([
    prisma.booking.findUnique({
      where: { id },
      include: { client: true },
    }),
    prisma.client.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.brand.findMany({ orderBy: { code: "asc" } }),
    prisma.partner.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!booking) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Edit booking</h1>
        <p className="text-sm text-neutral-500">
          {booking.client.firstName} {booking.client.lastName}
        </p>
      </div>

      <form
        action={updateBooking}
        className="grid max-w-2xl grid-cols-2 gap-3 rounded-lg border border-neutral-200 p-4"
      >
        <input type="hidden" name="id" value={id} />

        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Client
          </label>
          <select
            name="clientId"
            required
            defaultValue={booking.clientId}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Select client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.lastName}, {c.firstName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Brand
          </label>
          <select
            name="brandId"
            required
            defaultValue={booking.brandId}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Select brand…</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Source
          </label>
          <select
            name="source"
            required
            defaultValue={booking.source}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="DIRECT">Direct</option>
            <option value="TOUR_OPERATOR">Tour operator</option>
            <option value="HOTEL_CONCIERGE">Hotel concierge</option>
          </select>
        </div>

        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Partner <span className="font-normal text-neutral-400">(if applicable)</span>
          </label>
          <select
            name="partnerId"
            defaultValue={booking.partnerId ?? ""}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">— None —</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Meeting point
          </label>
          <input
            name="meetingPoint"
            defaultValue={booking.meetingPoint ?? ""}
            placeholder="e.g. Médran gondola base"
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Notes
          </label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={booking.notes ?? ""}
            placeholder="Any notes…"
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="col-span-2 flex gap-3">
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
