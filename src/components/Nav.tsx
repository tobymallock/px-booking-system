import Link from "next/link";

const links = [
  { href: "/instructors", label: "Instructors" },
  { href: "/clients", label: "Clients" },
  { href: "/partners", label: "Partners" },
];

export function Nav() {
  return (
    <nav className="flex items-center gap-6 border-b border-neutral-200 px-6 py-4">
      <span className="font-semibold">PX Group</span>
      <div className="flex gap-4 text-sm">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="text-neutral-600 hover:text-neutral-900">
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
