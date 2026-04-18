import { getAllEndpoints, getRecentDeliveries } from "../db";
import EndpointForm from "./EndpointForm";
import { ToggleButton, DeleteButton } from "./EndpointActions";

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d));
}

function parseEvents(raw: string): string {
  try {
    const arr: string[] = JSON.parse(raw);
    if (arr.includes("*")) return "All events";
    return arr.join(", ");
  } catch {
    return raw;
  }
}

export default async function AdminPage(
  _props: { searchParams: Record<string, string | string[] | undefined> }
) {
  const [endpoints, deliveries] = await Promise.all([
    getAllEndpoints(),
    getRecentDeliveries(30),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Outbound Webhooks</h1>
          <p className="text-sm text-zinc-500 mt-1">
            POST a signed JSON payload to external URLs when CMS events occur.
            Use this to connect Zapier, Make, Slack, or any custom integration.
          </p>
        </div>
        <EndpointForm />
      </div>

      {/* Endpoint list */}
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-700">
            Endpoints <span className="text-zinc-400 font-normal">({endpoints.length})</span>
          </h3>
        </div>
        {endpoints.length === 0 ? (
          <p className="px-6 py-10 text-sm text-zinc-400 text-center">
            No endpoints yet. Add one above to start receiving webhook events.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Name</th>
                <th className="px-6 py-3 text-left font-medium hidden sm:table-cell">URL</th>
                <th className="px-6 py-3 text-left font-medium hidden md:table-cell">Events</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {endpoints.map((ep) => (
                <tr key={ep.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-3 font-medium text-zinc-800">{ep.name}</td>
                  <td className="px-6 py-3 hidden sm:table-cell">
                    <span className="text-xs font-mono text-zinc-500 truncate block max-w-[200px]">
                      {ep.url}
                    </span>
                  </td>
                  <td className="px-6 py-3 hidden md:table-cell text-zinc-500 text-xs">
                    {parseEvents(ep.events)}
                  </td>
                  <td className="px-6 py-3">
                    <ToggleButton id={ep.id} active={ep.active} />
                  </td>
                  <td className="px-6 py-3 text-right">
                    <DeleteButton id={ep.id} name={ep.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delivery log */}
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-700">Recent deliveries</h3>
        </div>
        {deliveries.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-400 text-center">No deliveries yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Event</th>
                <th className="px-6 py-3 text-left font-medium hidden sm:table-cell">Endpoint</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-left font-medium hidden md:table-cell">Response</th>
                <th className="px-6 py-3 text-left font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {deliveries.map((d) => {
                const ep = endpoints.find((e) => e.id === d.endpointId);
                return (
                  <tr key={d.id} className="hover:bg-zinc-50">
                    <td className="px-6 py-2.5">
                      <code className="text-xs bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-600">
                        {d.event}
                      </code>
                    </td>
                    <td className="px-6 py-2.5 text-zinc-500 text-xs hidden sm:table-cell">
                      {ep?.name ?? `#${d.endpointId}`}
                    </td>
                    <td className="px-6 py-2.5">
                      <span className={`text-xs font-medium ${
                        d.status === "success" ? "text-emerald-600" : "text-red-500"
                      }`}>
                        {d.status}
                      </span>
                      {d.error && (
                        <p className="text-xs text-zinc-400 truncate max-w-[180px]" title={d.error}>
                          {d.error}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-2.5 text-zinc-500 text-xs hidden md:table-cell">
                      {d.responseCode ?? "—"}
                    </td>
                    <td className="px-6 py-2.5 text-zinc-400 text-xs">
                      {formatDate(d.deliveredAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Payload format reference */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 space-y-2">
        <h3 className="text-sm font-semibold text-zinc-700">Payload format</h3>
        <pre className="text-xs text-zinc-600 overflow-x-auto">{`POST https://your-endpoint.com/hook
Content-Type: application/json
X-Pugmill-Signature: sha256=<hmac-sha256-hex>   // only when secret is set
X-Pugmill-Event: post:after-publish

{
  "event": "post:after-publish",
  "timestamp": "2026-04-03T12:00:00.000Z",
  "data": { ... }
}`}</pre>
      </div>
    </div>
  );
}
