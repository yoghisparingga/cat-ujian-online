import Link from "next/link";

export function TopBar({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg">
          {title}
        </Link>
        <div className="flex items-center gap-3">{right}</div>
      </div>
    </header>
  );
}
