import { prisma } from "@/lib/prisma";
import { createPartner, setCommissionRate } from "./actions";

export default async function PartnersPage() {
  const [partners, brands] = await Promise.all([
    prisma.partner.findMany({
      include: { commissionRates: { include: { brand: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.brand.findMany({ orderBy: { code: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Partners</h1>
        <p className="text-sm text-neutral-500">Tour operators and hotel concierge accounts</p>
      </div>

      <form action={createPartner} className="grid max-w-2xl grid-cols-2 gap-3 rounded-lg border border-neutral-200 p-4">
        <h2 className="col-span-2 text-sm font-medium">Add partner</h2>
        <input name="name" placeholder="Partner name" required className="col-span-2 rounded border border-neutral-300 px-3 py-2 text-sm" />
        <select name="type" required className="rounded border border-neutral-300 px-3 py-2 text-sm">
          <option value="TOUR_OPERATOR">Tour operator</option>
          <option value="HOTEL_CONCIERGE">Hotel concierge</option>
        </select>
        <select name="invoiceTerms" required className="rounded border border-neutral-300 px-3 py-2 text-sm">
          <option value="PREPAY">Pre-pay</option>
          <option value="POST_PAY">Post-pay (invoiced after delivery)</option>
        </select>
        <label className="col-span-2 flex items-center gap-2 text-sm text-neutral-600">
          <input type="checkbox" name="dualInvoicing" />
          Dual invoicing (gross to client + net to partner)
        </label>
        <button type="submit" className="col-span-2 rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white">
          Add partner
        </button>
      </form>

      <div className="space-y-6">
        {partners.map((p) => (
          <div key={p.id} className="max-w-3xl rounded-lg border border-neutral-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{p.name}</h3>
                <p className="text-xs text-neutral-500">
                  {p.type === "TOUR_OPERATOR" ? "Tour operator" : "Hotel concierge"} ·{" "}
                  {p.invoiceTerms === "POST_PAY" ? "Post-pay" : "Pre-pay"}
                  {p.dualInvoicing ? " · Dual invoicing" : ""}
                </p>
              </div>
            </div>

            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-1">Brand</th>
                  <th className="py-1">Commission %</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((b) => {
                  const existing = p.commissionRates.find((cr) => cr.brandId === b.id);
                  return (
                    <tr key={b.id} className="border-t border-neutral-100">
                      <td className="py-1">{b.code}</td>
                      <td className="py-1">
                        <form action={setCommissionRate} className="flex items-center gap-2">
                          <input type="hidden" name="partnerId" value={p.id} />
                          <input type="hidden" name="brandId" value={b.id} />
                          <input
                            name="ratePct"
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            defaultValue={existing ? Number(existing.ratePct) : undefined}
                            placeholder="0.00"
                            className="w-24 rounded border border-neutral-300 px-2 py-1 text-sm"
                          />
                          <button type="submit" className="text-xs text-neutral-500 underline">
                            Save
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {p.hotelCommissionNotes && (
              <p className="mt-2 text-xs text-neutral-500">Notes: {p.hotelCommissionNotes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
