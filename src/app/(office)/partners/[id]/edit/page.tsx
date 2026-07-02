import { prisma } from "@/lib/prisma";
import { updatePartner } from "../../actions";
import { notFound } from "next/navigation";

export default async function EditPartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const partner = await prisma.partner.findUnique({ where: { id } });

  if (!partner) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Edit partner</h1>
        <p className="text-sm text-neutral-500">{partner.name}</p>
      </div>

      <form action={updatePartner} className="grid max-w-2xl grid-cols-2 gap-3 rounded-lg border border-neutral-200 p-4">
        <input type="hidden" name="id" value={partner.id} />

        <input name="name" defaultValue={partner.name} placeholder="Partner name" required className="col-span-2 rounded border border-neutral-300 px-3 py-2 text-sm" />

        <select name="type" defaultValue={partner.type} required className="rounded border border-neutral-300 px-3 py-2 text-sm">
          <option value="TOUR_OPERATOR">Tour operator</option>
          <option value="HOTEL_CONCIERGE">Hotel concierge</option>
        </select>

        <select name="invoiceTerms" defaultValue={partner.invoiceTerms} required className="rounded border border-neutral-300 px-3 py-2 text-sm">
          <option value="PREPAY">Pre-pay</option>
          <option value="POST_PAY">Post-pay (invoiced after delivery)</option>
        </select>

        <label className="col-span-2 flex items-center gap-2 text-sm text-neutral-600">
          <input type="checkbox" name="dualInvoicing" defaultChecked={partner.dualInvoicing} />
          Dual invoicing (gross to client + net to partner)
        </label>

        <div className="col-span-2 flex gap-3">
          <button type="submit" className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
            Save changes
          </button>
          <a href="/partners" className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-600">
            Cancel
          </a>
        </div>
      </form>

      <p className="max-w-2xl text-xs text-neutral-400">
        Commission rates are edited on the main Partners page.
      </p>
    </div>
  );
}
