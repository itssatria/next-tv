import { LiveBrowser } from "@/components/LiveBrowser";
import { getCatalog, getChannels } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.q;
  const query = Array.isArray(raw) ? raw[0] : raw;
  const rawCategory = params.category;
  const category = Array.isArray(rawCategory) ? rawCategory[0] : rawCategory;

  const [catalog, { channels, total }] = await Promise.all([
    getCatalog(),
    getChannels({
      category: category || undefined,
      query: query || undefined,
      limit: 120,
    }),
  ]);

  return (
    <>
      <div className="pagehead">
        <h1 className="pagehead__title">Channels</h1>
        <p className="pagehead__sub">
          {query && query.length >= 2
            ? `${total} channel${total === 1 ? "" : "s"} matching "${query}"`
            : `${catalog.totalChannels.toLocaleString()} live channels`}
        </p>
      </div>

      <LiveBrowser
        categories={catalog.categories}
        initialChannels={channels}
        initialTotal={total}
        initialCategory={category || undefined}
        initialQuery={query || undefined}
      />
    </>
  );
}
