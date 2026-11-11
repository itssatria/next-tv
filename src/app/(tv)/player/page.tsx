import { PlayerClient } from "@/components/PlayerClient";

export const dynamic = "force-dynamic";

export default async function PlayerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const pick = (value: string | string[] | undefined): string | null => {
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
  };

  return (
    <PlayerClient
      slug={pick(params.slug)}
      directUrl={pick(params.url)}
      directName={pick(params.name)}
    />
  );
}
