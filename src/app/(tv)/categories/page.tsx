import Link from "next/link";
import { Poster } from "@/components/Poster";
import { EmptyState } from "@/components/StateBlock";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const catalog = await getCatalog();
  const categories = catalog.categories;

  return (
    <>
      <div className="pagehead">
        <h1 className="pagehead__title">Categories</h1>
        <p className="pagehead__sub">
          {categories.length} categories across {catalog.totalChannels.toLocaleString()} channels
        </p>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          title="No categories"
          body="The channel directory came back empty. Import a playlist from the Playlists screen to add your own channels."
        />
      ) : (
        <div className="grid">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/categories/${category.slug}`}
              className="tile"
              data-focusable
              aria-label={`${category.title}, ${category.channelCount} channels`}
            >
              <Poster title={category.title} tag="Category" />
              <div className="tile__sub">
                {category.channelCount.toLocaleString()} channel
                {category.channelCount === 1 ? "" : "s"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
