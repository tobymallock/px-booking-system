import { prisma } from "@/lib/prisma";
import { createBooking } from "../actions";
import Link from "next/link";

export default async function NewBookingPage() {
  const [clients, brands, partners] = await Promise.all([
    prisma.client.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.brand.findMany({ orderBy: { code: "asc" } }),
    prisma.partner.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">New booking</h1>
      </div>

      <form
        action={createBooking}
        className="grid max-w-2xl grid-cols-2 gap-3 rounded-lg border border-neutral-200 p-4"
      >
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Client
          </label>
          <select
            name="clientId"
            required
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
            placeholder="Any notes…"
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="col-span-2 flex gap-3">
          <button
            type="submit"
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Create booking
          </button>
          <Link
            href="/bookings"
            className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-600 hover:border-neutral-400"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
