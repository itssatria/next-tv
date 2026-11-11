import { FixtureRow } from "@/components/FixtureRow";
import { EmptyState } from "@/components/StateBlock";
import { getFixtures } from "@/lib/fixtures";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const feed = await getFixtures();

  const nothingScheduled =
    feed.live.length === 0 && feed.upcoming.length === 0 && feed.finished.length === 0;

  return (
    <>
      <div className="pagehead">
        <h1 className="pagehead__title">Live Events</h1>
        <p className="pagehead__sub">
          {feed.live.length > 0
            ? `${feed.live.length} fixture${feed.live.length === 1 ? "" : "s"} on now`
            : "Nothing on air right now"}
        </p>
      </div>

      {nothingScheduled ? (
        <EmptyState
          title="No fixtures listed"
          body="The fixture feed returned nothing at the moment. The channel guide on the Channels tab is unaffected."
        />
      ) : null}

      {feed.live.length > 0 ? (
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">On now</h2>
            <span className="section__meta">{feed.live.length}</span>
          </div>
          <div className="rows">
            {feed.live.map((fixture) => (
              <FixtureRow key={fixture.id} fixture={fixture} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Upcoming</h2>
          <span className="section__meta">{feed.upcoming.length}</span>
        </div>
        {feed.upcoming.length === 0 ? (
          <EmptyState
            title="No fixtures scheduled"
            body="Nothing is listed for the coming days. Browse the channel guide instead."
          />
        ) : (
          <div className="rows">
            {feed.upcoming.map((fixture) => (
              <FixtureRow key={fixture.id} fixture={fixture} />
            ))}
          </div>
        )}
      </section>

      {feed.finished.length > 0 ? (
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">Finished</h2>
            <span className="section__meta">{feed.finished.length}</span>
          </div>
          <div className="rows">
            {feed.finished.map((fixture) => (
              <FixtureRow key={fixture.id} fixture={fixture} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
