import { prisma } from "@/lib/prisma";
import { createInstructor, setInstructorActive, deleteInstructor } from "./actions";
import { DeleteButton } from "@/components/DeleteButton";
import { LANGUAGES, DISCIPLINES } from "@/lib/constants";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

type SortDir = "asc" | "desc";

function buildOrderBy(sort: string, dir: SortDir): Prisma.InstructorOrderByWithRelationInput[] {
  switch (sort) {
    case "firstName":
      return [{ firstName: dir }, { lastName: "asc" }];
    case "brand":
      return [{ brand: { code: dir } }, { lastName: "asc" }];
    case "gender":
      return [{ gender: dir }, { lastName: "asc" }];
    case "offPisteCert":
      return [{ offPisteCert: dir }, { lastName: "asc" }];
    case "brevet":
      return [{ brevet: dir }, { lastName: "asc" }];
    case "isActive":
      return [{ isActive: dir }, { lastName: "asc" }];
    default: // "lastName"
      return [{ lastName: dir }, { firstName: "asc" }];
  }
}

function SortHeader({
  label,
  column,
  sort,
  dir,
  className = "",
}: {
  label: string;
  column: string;
  sort: string;
  dir: SortDir;
  className?: string;
}) {
  const active = sort === column;
  const nextDir = active && dir === "asc" ? "desc" : "asc";
  return (
    <a
      href={`?sort=${column}&dir=${nextDir}`}
      className={`inline-flex items-center gap-1 whitespace-nowrap hover:text-neutral-900 ${active ? "text-neutral-900" : ""} ${className}`}
    >
      {label}
      <span className="text-[10px]">
        {active ? (dir === "asc" ? "▲" : "▼") : <span className="opacity-30">▲</span>}
      </span>
    </a>
  );
}

export default async function InstructorsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const { sort = "lastName", dir: rawDir = "asc" } = await searchParams;
  const dir: SortDir = rawDir === "desc" ? "desc" : "asc";

  const [instructors, brands] = await Promise.all([
    prisma.instructor.findMany({
      include: { brand: true },
      orderBy: buildOrderBy(sort, dir),
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
        <input name="email" type="email" placeholder="Email" className="rounded border border-neutral-300 px-3 py-2 text-sm" />

        <div className="col-span-2">
          <p className="mb-2 text-xs font-medium text-neutral-600">Languages spoken</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {LANGUAGES.map((l) => (
              <label key={l.code} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="languages" value={l.code} />
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
              <th className="py-2 pr-4 font-medium">
                <SortHeader label="Name" column="lastName" sort={sort} dir={dir} />
              </th>
              <th className="py-2 pr-4 font-medium">
                <SortHeader label="Brand" column="brand" sort={sort} dir={dir} />
              </th>
              <th className="py-2 pr-4 font-medium">
                <SortHeader label="Gender" column="gender" sort={sort} dir={dir} />
              </th>
              <th className="py-2 pr-4 font-medium">Disciplines</th>
              <th className="py-2 pr-4 font-medium">Languages</th>
              <th className="py-2 pr-4 font-medium">
                <SortHeader label="Off-piste" column="offPisteCert" sort={sort} dir={dir} />
              </th>
              <th className="py-2 pr-4 font-medium">
                <SortHeader label="Brevet" column="brevet" sort={sort} dir={dir} />
              </th>
              <th className="py-2 pr-4 font-medium">
                <SortHeader label="Status" column="isActive" sort={sort} dir={dir} />
              </th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {instructors.map((i) => (
              <tr key={i.id} className="border-b border-neutral-100">
                <td className="py-2 pr-4 font-medium">{i.firstName} {i.lastName}</td>
                <td className="py-2 pr-4">{i.brand.code}</td>
                <td className="py-2 pr-4">{i.gender === "MALE" ? "M" : i.gender === "FEMALE" ? "F" : "—"}</td>
                <td className="py-2 pr-4">{i.disciplines.length > 0 ? i.disciplines.map((d) => d === "CROSS_COUNTRY" ? "XC" : d.charAt(0) + d.slice(1).toLowerCase()).join(", ") : "—"}</td>
                <td className="py-2 pr-4">{i.languages.length > 0 ? i.languages.join(", ") : "—"}</td>
                <td className="py-2 pr-4">{i.offPisteCert ? "✓" : "—"}</td>
                <td className="py-2 pr-4">{i.brevet ? "✓" : "—"}</td>
                <td className="py-2 pr-4">{i.isActive ? "Active" : "Inactive"}</td>
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <Link href={`/instructors/${i.id}/edit`} className="text-neutral-500 underline">Edit</Link>
                    <form action={async () => { "use server"; await setInstructorActive(i.id, !i.isActive); }}>
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
