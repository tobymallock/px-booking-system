import { prisma } from "@/lib/prisma";
import { createInstructor, setInstructorActive } from "./actions";

export default async function InstructorsPage() {
  const [instructors, brands] = await Promise.all([
    prisma.instructor.findMany({
      include: { brand: true },
      orderBy: [{ brand: { code: "asc" } }, { lastName: "asc" }],
    }),
    prisma.brand.findMany({ orderBy: { code: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Instructors</h1>
        <p className="text-sm text-neutral-500">{instructors.length} on file</p>
      </div>

      <form action={createInstructor} className="grid max-w-2xl grid-cols-2 gap-3 rounded-lg border border-neutral-200 p-4">
        <h2 className="col-span-2 text-sm font-medium">Add instructor</h2>
        <input name="firstName" placeholder="First name" required className="rounded border border-neutral-300 px-3 py-2 text-sm" />
        <input name="lastName" placeholder="Last name" required className="rounded border border-neutral-300 px-3 py-2 text-sm" />
        <select name="brandId" required className="rounded border border-neutral-300 px-3 py-2 text-sm">
          <option value="">Brand…</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>
        <input name="mobile" placeholder="Mobile" className="rounded border border-neutral-300 px-3 py-2 text-sm" />
        <input name="email" type="email" placeholder="Email" className="col-span-2 rounded border border-neutral-300 px-3 py-2 text-sm" />
        <button type="submit" className="col-span-2 rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white">
          Add instructor
        </button>
      </form>

      <table className="w-full max-w-3xl text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2">Name</th>
            <th className="py-2">Brand</th>
            <th className="py-2">Mobile</th>
            <th className="py-2">Status</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {instructors.map((i) => (
            <tr key={i.id} className="border-b border-neutral-100">
              <td className="py-2">
                {i.firstName} {i.lastName}
              </td>
              <td className="py-2">{i.brand.code}</td>
              <td className="py-2">{i.mobile ?? "—"}</td>
              <td className="py-2">{i.isActive ? "Active" : "Inactive"}</td>
              <td className="py-2">
                <form
                  action={async () => {
                    "use server";
                    await setInstructorActive(i.id, !i.isActive);
                  }}
                >
                  <button type="submit" className="text-neutral-500 underline">
                    {i.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
