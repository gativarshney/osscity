import { CityApp } from "@/components/CityApp";
import { getCityFeed } from "@/lib/city/source";
import { cityStats } from "@/lib/city/stats";

export const revalidate = 900;

export default async function Home() {
  const feed = await getCityFeed();
  const stats = feed ? cityStats(feed) : null;
  return (
    <main className="flex-1">
      <CityApp stats={stats} generatedAt={feed?.generatedAt ?? null} />
    </main>
  );
}
