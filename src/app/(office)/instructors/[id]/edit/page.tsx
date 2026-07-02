import { prisma } from "@/lib/prisma";
import { updateInstructor } from "../../actions";
import { notFound } from "next/navigation";
import { Discipline } from "@prisma/client";
import { LANGUAGES, DISCIPLINES } from "@/lib/constants";

export default async function EditInstructorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [instructor, brands] = await Promise.all([
    prisma.instructor.findUnique({ where: { id } }),
    prisma.brand.findMany({ orderBy: { code: "asc" } }),
  ]);

  if (!instructor) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Edit instructor</h1>
        <p className="text-sm text-neutral-500">{instructor.firstName} {instructor.lastName}</p>
      </div>

      <form action={updateInstructor} className="grid max-w-2xl grid-cols-2 gap-3 rounded-lg border border-neutral-200 p-4">
        <input type="hidden" name="id" value={instructor.id} />

        <input name="firstName" defaultValue={instructor.firstName} placeholder="First name" required className="rounded border border-neutral-300 px-3 py-2 text-sm" />
        <input name="lastName" defaultValue={instructor.lastName} placeholder="Last name" required className="rounded border border-neutral-300 px-3 py-2 text-sm" />

        <select name="brandId" defaultValue={instructor.brandId} required className="rounded border border-neutral-300 px-3 py-2 text-sm">
          <option value="">Brand…</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
          ))}
        </select>

        <select name="gender" defaultValue={instructor.gender ?? ""} className="rounded border border-neutral-300 px-3 py-2 text-sm">
          <option value="">Gender…</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </select>

        <input name="mobile" defaultValue={instructor.mobile ?? ""} placeholder="Mobile" className="rounded border border-neutral-300 px-3 py-2 text-sm" />
        <input name="email" type="email" defaultValue={instructor.email ?? ""} placeholder="Email" className="rounded border border-neutral-300 px-3 py-2 text-sm" />

        <div className="col-span-2">
          <p className="mb-2 text-xs font-medium text-neutral-600">Languages spoken</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {LANGUAGES.map((l) => (
              <label key={l.code} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="languages"
                  value={l.code}
                  defaultChecked={instructor.languages.includes(l.code)}
                />
                {l.label}
              </label>
            ))}
          </div>
        </div>

        <div className="col-span-2">
          <p className="mb-2 text-xs font-medium text-neutral-600">Disciplines</p>
          <div className="flex flex-wrap gap-4">
            {DISCIPLINES.map((d) => (
              <label key={d.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="disciplines"
                  value={d.value}
                  defaultChecked={instructor.disciplines.includes(d.value as Discipline)}
                />
                {d.label}
              </label>
            ))}
          </div>
        </div>

        <div className="col-span-2 flex gap-6">
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input type="checkbox" name="offPisteCert" defaultChecked={instructor.offPisteCert} />
            Off-piste certified
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input type="checkbox" name="brevet" defaultChecked={instructor.brevet} />
            Brevet
          </label>
        </div>

        <div className="col-span-2 flex gap-3">
          <button type="submit" className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
            Save changes
          </button>
          <a href="/instructors" className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-600">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
