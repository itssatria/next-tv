import { NextResponse } from "next/server";
import { getAppConfig } from "@/lib/catalog";

export const dynamic = "force-dynamic";

/**
 * Update check. The APK compares the bundled version with the latest version
 * published by its remote config and shows "New Update Available" when they
 * differ.
 */
export async function GET() {
  const config = await getAppConfig();
  const updateAvailable = config.latestVersion !== config.appVersion;

  return NextResponse.json(
    {
      currentVersion: config.appVersion,
      latestVersion: config.latestVersion,
      updateAvailable,
      updateUrl: config.updateUrl,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
