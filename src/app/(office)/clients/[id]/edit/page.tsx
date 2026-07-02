import { prisma } from "@/lib/prisma";
import { updateClient } from "../../actions";
import { notFound } from "next/navigation";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id } });

  if (!client) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Edit client</h1>
        <p className="text-sm text-neutral-500">{client.firstName} {client.lastName}</p>
      </div>

      <form action={updateClient} className="grid max-w-2xl grid-cols-2 gap-3 rounded-lg border border-neutral-200 p-4">
        <input type="hidden" name="id" value={client.id} />

        <input name="firstName" defaultValue={client.firstName} placeholder="First name" required className="rounded border border-neutral-300 px-3 py-2 text-sm" />
        <input name="lastName" defaultValue={client.lastName} placeholder="Last name" required className="rounded border border-neutral-300 px-3 py-2 text-sm" />
        <input name="email" type="email" defaultValue={client.email ?? ""} placeholder="Email" className="rounded border border-neutral-300 px-3 py-2 text-sm" />
        <input name="phone" defaultValue={client.phone ?? ""} placeholder="Phone" className="rounded border border-neutral-300 px-3 py-2 text-sm" />
        <textarea name="notes" defaultValue={client.notes ?? ""} placeholder="Notes" className="col-span-2 rounded border border-neutral-300 px-3 py-2 text-sm" />

        <div className="col-span-2 flex gap-3">
          <button type="submit" className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
            Save changes
          </button>
          <a href="/clients" className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-600">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
