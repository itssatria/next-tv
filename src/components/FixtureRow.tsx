"use client";

import Link from "next/link";
import { formatRelative } from "@/lib/format";
import type { Fixture } from "@/lib/fixtures";
import { Poster } from "./Poster";

/**
 * A fixture row.
 *
 * The row is a link into the channel guide filtered by the team names, which
 * is where a viewer looks for a dedicated channel. If the guide has nothing
 * matching, it simply shows the full list.
 */
export function FixtureRow({ fixture }: { fixture: Fixture }) {
  const search = fixture.teams[0] ?? fixture.competition;

  const status =
    fixture.status === "live" ? (
      <span className="live">
        <span className="live__dot" aria-hidden="true" />
        Live
      </span>
    ) : fixture.status === "finished" ? (
      <span className="live live--ghost">Full time</span>
    ) : (
      <span className="tile__sub">{formatRelative(fixture.startsAt)}</span>
    );

  return (
    <Link
      href={`/channels?q=${encodeURIComponent(search)}`}
      className="row"
      data-focusable
      aria-label={`${fixture.name}, ${fixture.competition}`}
    >
      <span className="row__thumb">
        <Poster title={fixture.sport} tag={fixture.competition} compact />
      </span>

      <span>
        <span className="row__title">{fixture.name}</span>
        <span className="row__meta">
          <span>{fixture.competition}</span>
          <span>{fixture.sport}</span>
        </span>
      </span>

      <span className="row__right">
        {fixture.score ? <span className="row__score">{fixture.score}</span> : null}
        {status}
      </span>
    </Link>
  );
}
