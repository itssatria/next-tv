import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveBrowser } from "@/components/LiveBrowser";
import { getCatalog, getChannels } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function ChannelsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const category = catalog.categories.find((entry) => entry.slug === slug);

  if (!category) notFound();

  const { channels, total } = await getChannels({ category: slug, limit: 120 });

  return (
    <>
      <Link href="/categories" className="backlink">
        All categories
      </Link>

      <div className="pagehead">
        <h1 className="pagehead__title">{category.title}</h1>
        <p className="pagehead__sub">{category.channelCount.toLocaleString()} channels</p>
      </div>

      <LiveBrowser
        categories={catalog.categories}
        initialChannels={channels}
        initialTotal={total}
        initialCategory={slug}
      />
    </>
  );
}