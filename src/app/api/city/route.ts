import { getCityFeed, REVALIDATE_SECONDS } from "@/lib/city/source";

export const revalidate = 900;

/**
 * GET /api/city
 * The city feed: Contributable's index, reduced to the fields the city draws.
 * Cached at the edge for fifteen minutes, so the city is never far behind.
 */
export async function GET() {
  const feed = await getCityFeed();
  if (!feed) {
    return Response.json(
      { error: "Contributable's index is not available right now." },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
  return Response.json(feed, {
    headers: {
      "cache-control": `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=86400`,
      "access-control-allow-origin": "*",
    },
  });
}
