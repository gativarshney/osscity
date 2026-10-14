import type { Metadata } from "next";
import Link from "next/link";
import { ListTable } from "@/components/ui/ListTable";
import { getCityFeed } from "@/lib/city/source";
import { compactDate } from "@/lib/format";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "List view",
  description:
    "Every project in OSS City as a sortable table: activity, first reply time, outside pull requests merged and free first issues.",
  alternates: { canonical: "/list" },
};

export default async function ListPage() {
  const feed = await getCityFeed();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] text-ink-3">
            <Link href="/" className="hover:text-ink">
              OSS City
            </Link>{" "}
            / List view
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">Every building, as a list</h1>
          <p className="mt-2 max-w-2xl text-[14.5px] text-ink-2">
            The same data as the city, sortable. Reply figures rest on at least five outside pull requests;
            otherwise they read &quot;Not enough data&quot;.{" "}
            {feed ? `Data from Contributable, updated ${compactDate(feed.generatedAt)}.` : ""}
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full border border-hair-strong px-4 py-2 text-[13.5px] text-ink-2 hover:text-ink"
        >
          Back to the city
        </Link>
      </header>
      {feed ? (
        <ListTable repos={feed.repos} />
      ) : (
        <p className="mt-10 text-ink-2" role="status">
          Preparing the city. Contributable&apos;s index is not available right now.
        </p>
      )}
    </main>
  );
}
