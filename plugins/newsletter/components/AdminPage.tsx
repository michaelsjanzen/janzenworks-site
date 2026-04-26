import { getAllSubscribers, getRecentSends, getRecentPublishedPosts } from "../db";
import { getConfig } from "../../../src/lib/config";
import { DeleteSubscriberButton } from "./SubscriberActions";
import ManualSendForm from "./ManualSendForm";

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(d));
}

export default async function AdminPage(
  _props: { searchParams: Record<string, string | string[] | undefined> }
) {
  const [subscribers, sends, recentPosts, config] = await Promise.all([
    getAllSubscribers(),
    getRecentSends(20),
    getRecentPublishedPosts(30),
    getConfig(),
  ]);

  const active       = subscribers.filter((s) => !s.unsubscribedAt);
  const unsubscribed = subscribers.filter((s) =>  s.unsubscribedAt);

  // Email provider status
  const emailProvider  = config.email?.provider;
  const fromAddress    = config.email?.fromAddress;
  const emailReady     = !!emailProvider && !!fromAddress;
  const defaultReplyTo = config.email?.toAddress ?? "";

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Newsletter</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Manage subscribers and send campaigns.
        </p>
      </div>

      {/* Email provider status */}
      {emailReady ? (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>
            <strong className="font-medium capitalize">{emailProvider}</strong> connected — emails will
            send from <span className="font-mono">{fromAddress}</span>.
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <span>
            No email provider configured. Newsletter sends will fail.{" "}
            <a href="/admin/settings/email" className="underline font-medium">
              Configure in Settings → Email
            </a>
            .
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Active subscribers", value: active.length },
          { label: "Unsubscribed",       value: unsubscribed.length },
          { label: "Campaigns sent",     value: sends.length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-zinc-200 rounded-lg p-4">
            <p className="text-2xl font-bold text-zinc-900">{value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Manual send */}
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-700">Send newsletter</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Choose a post, edit the subject, and send to all active subscribers.
          </p>
        </div>
        <ManualSendForm
          posts={recentPosts}
          defaultReplyTo={defaultReplyTo}
          subscriberCount={active.length}
        />
      </div>

      {/* Subscriber list */}
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-700">
            Subscribers <span className="text-zinc-400 font-normal">({active.length} active)</span>
          </h3>
        </div>
        {active.length === 0 ? (
          <p className="px-6 py-10 text-sm text-zinc-400 text-center">No subscribers yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Email</th>
                <th className="px-6 py-3 text-left font-medium hidden sm:table-cell">Name</th>
                <th className="px-6 py-3 text-left font-medium">Subscribed</th>
                <th className="px-6 py-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {active.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-3 text-zinc-800">{s.email}</td>
                  <td className="px-6 py-3 text-zinc-500 hidden sm:table-cell">{s.name ?? "—"}</td>
                  <td className="px-6 py-3 text-zinc-500">{formatDate(s.subscribedAt)}</td>
                  <td className="px-6 py-3 text-right">
                    <DeleteSubscriberButton id={s.id} email={s.email} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Send history */}
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-700">Send history</h3>
        </div>
        {sends.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-400 text-center">No emails sent yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Subject</th>
                <th className="px-6 py-3 text-left font-medium hidden sm:table-cell">Sent</th>
                <th className="px-6 py-3 text-left font-medium">Recipients</th>
                <th className="px-6 py-3 text-left font-medium hidden md:table-cell">Delivered</th>
                <th className="px-6 py-3 text-left font-medium hidden md:table-cell">Failed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sends.map((send) => (
                <tr key={send.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-3 text-zinc-800 max-w-[200px] truncate">{send.subject}</td>
                  <td className="px-6 py-3 text-zinc-500 hidden sm:table-cell">{formatDate(send.sentAt)}</td>
                  <td className="px-6 py-3 text-zinc-500">{send.recipientCount}</td>
                  <td className="px-6 py-3 text-emerald-600 hidden md:table-cell">{send.successCount}</td>
                  <td className="px-6 py-3 hidden md:table-cell">
                    {send.failCount > 0 ? (
                      <span className="text-red-500">{send.failCount}</span>
                    ) : (
                      <span className="text-zinc-300">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Unsubscribed (collapsed) */}
      {unsubscribed.length > 0 && (
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden opacity-50">
          <div className="px-6 py-4">
            <h3 className="text-sm font-semibold text-zinc-500">
              Unsubscribed <span className="font-normal">({unsubscribed.length})</span>
            </h3>
          </div>
        </div>
      )}
    </div>
  );
}
