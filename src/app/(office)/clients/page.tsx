import { prisma } from "@/lib/prisma";
import { createClientRecord, deleteClient } from "./actions";
import Link from "next/link";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { lastName: "asc" },
    take: 200,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Clients</h1>
        <p className="text-sm text-neutral-500">{clients.length} on file (showing latest 200)</p>
      </div>

      <form action={createClientRecord} className="grid max-w-2xl grid-cols-2 gap-3 rounded-lg border border-neutral-200 p-4">
        <h2 className="col-span-2 text-sm font-medium">Add client</h2>
        <input name="firstName" placeholder="First name" required className="rounded border border-neutral-300 px-3 py-2 text-sm" />
        <input name="lastName" placeholder="Last name" required className="rounded border border-neutral-300 px-3 py-2 text-sm" />
        <input name="email" type="email" placeholder="Email" className="rounded border border-neutral-300 px-3 py-2 text-sm" />
        <input name="phone" placeholder="Phone" className="rounded border border-neutral-300 px-3 py-2 text-sm" />
        <textarea name="notes" placeholder="Notes" className="col-span-2 rounded border border-neutral-300 px-3 py-2 text-sm" />
        <button type="submit" className="col-span-2 rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white">
          Add client
        </button>
      </form>

      <table className="w-full max-w-3xl text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Email</th>
            <th className="py-2 pr-4">Phone</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id} className="border-b border-neutral-100">
              <td className="py-2 pr-4">{c.firstName} {c.lastName}</td>
              <td className="py-2 pr-4">{c.email ?? "—"}</td>
              <td className="py-2 pr-4">{c.phone ?? "—"}</td>
              <td className="py-2">
                <div className="flex items-center gap-3">
                  <Link href={`/clients/${c.id}/edit`} className="text-neutral-500 underline">
                    Edit
                  </Link>
                  <form action={deleteClient}>
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="text-red-400 underline"
                      onClick={(e) => {
                        if (!confirm(`Delete ${c.firstName} ${c.lastName}? This cannot be undone.`)) {
                          e.preventDefault();
                        }
                      }}
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
