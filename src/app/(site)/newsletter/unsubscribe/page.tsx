import { unsubscribeByToken } from "../../../../../plugins/newsletter/actions";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const params = await searchParams;
  const token  = typeof params.token === "string" ? params.token : "";

  const result = token
    ? await unsubscribeByToken(token)
    : { ok: false, error: "No unsubscribe token provided." };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        {result.ok ? (
          <>
            <h1 className="text-2xl font-semibold" style={{ color: "var(--color-foreground)" }}>
              Unsubscribed
            </h1>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              You&apos;ve been removed from the mailing list. You won&apos;t receive any more emails.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold" style={{ color: "var(--color-foreground)" }}>
              Something went wrong
            </h1>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              {result.error ?? "This unsubscribe link is invalid or has already been used."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
