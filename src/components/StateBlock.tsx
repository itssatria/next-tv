import { IconRefresh } from "./Icons";

/**
 * The three states every data view needs: loading, empty, error.
 * Rendering only the happy path is what makes an app feel broken the first
 * time a request fails.
 */
export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className="state__title">{label}</span>
      <span className="state__body">Fetching the latest listing.</span>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="state">
      <span className="state__title">{title}</span>
      <span className="state__body">{body}</span>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Server connection error",
  body = "The listing could not be loaded. Check the connection and try again.",
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state" role="alert">
      <span className="state__title">{title}</span>
      <span className="state__body">{body}</span>
      {onRetry ? (
        <button type="button" className="btn btn--sm" onClick={onRetry}>
          <IconRefresh size={16} />
          Retry
        </button>
      ) : null}
    </div>
  );
}
