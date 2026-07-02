import { prisma } from "@/lib/prisma";
import { createInstructor, setInstructorActive, deleteInstructor } from "./actions";
import { DeleteButton } from "@/components/DeleteButton";
import Link from "next/link";

const DISCIPLINE_LABELS: Record<string, string> = {
  SKI: "Ski",
  SNOWBOARD: "Snowboard",
  TELEMARK: "Telemark",
  CROSS_COUNTRY: "XC",
};

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
            <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
          ))}
        </select>

        <select name="gender" className="rounded border border-neutral-300 px-3 py-2 text-sm">
          <option value="">Gender…</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </select>

        <input name="mobile" placeholder="Mobile" className="rounded border border-neutral-300 px-3 py-2 text-sm" />
        <input name="language" placeholder="Language(s) e.g. English, French" className="rounded border border-neutral-300 px-3 py-2 text-sm" />

        <input name="email" type="email" placeholder="Email" className="col-span-2 rounded border border-neutral-300 px-3 py-2 text-sm" />

        <div className="col-span-2">
          <p className="mb-2 text-xs font-medium text-neutral-600">Disciplines</p>
          <div className="flex flex-wrap gap-4">
            {[
              { value: "SKI", label: "Ski" },
              { value: "SNOWBOARD", label: "Snowboard" },
              { value: "TELEMARK", label: "Telemark" },
              { value: "CROSS_COUNTRY", label: "Cross Country" },
            ].map((d) => (
              <label key={d.value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="disciplines" value={d.value} />
                {d.label}
              </label>
            ))}
          </div>
        </div>

        <div className="col-span-2 flex gap-6">
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input type="checkbox" name="offPisteCert" />
            Off-piste certified
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input type="checkbox" name="brevet" />
            Brevet
          </label>
        </div>

        <button type="submit" className="col-span-2 rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white">
          Add instructor
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full max-w-5xl text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Brand</th>
              <th className="py-2 pr-4">Gender</th>
              <th className="py-2 pr-4">Disciplines</th>
              <th className="py-2 pr-4">Language</th>
              <th className="py-2 pr-4">Off-piste</th>
              <th className="py-2 pr-4">Brevet</th>
              <th className="py-2 pr-4">Mobile</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {instructors.map((i) => (
              <tr key={i.id} className="border-b border-neutral-100">
                <td className="py-2 pr-4 font-medium">{i.firstName} {i.lastName}</td>
                <td className="py-2 pr-4">{i.brand.code}</td>
                <td className="py-2 pr-4">{i.gender === "MALE" ? "M" : i.gender === "FEMALE" ? "F" : "—"}</td>
                <td className="py-2 pr-4">
                  {i.disciplines.length > 0
                    ? i.disciplines.map((d) => DISCIPLINE_LABELS[d] ?? d).join(", ")
                    : "—"}
                </td>
                <td className="py-2 pr-4">{i.language ?? "—"}</td>
                <td className="py-2 pr-4">{i.offPisteCert ? "✓" : "—"}</td>
                <td className="py-2 pr-4">{i.brevet ? "✓" : "—"}</td>
                <td className="py-2 pr-4">{i.mobile ?? "—"}</td>
                <td className="py-2 pr-4">{i.isActive ? "Active" : "Inactive"}</td>
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <Link href={`/instructors/${i.id}/edit`} className="text-neutral-500 underline">
                      Edit
                    </Link>
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
                    <DeleteButton
                      action={deleteInstructor}
                      id={i.id}
                      confirmMessage={`Delete ${i.firstName} ${i.lastName}? This cannot be undone.`}
                      className="text-red-400 underline"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
