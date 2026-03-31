import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { existsSync, readFileSync } from "fs";
import path from "path";

function readSetupCredentials(): { email: string; password: string } | null {
  try {
    const filePath = path.join(process.cwd(), "setup-credentials.json");
    if (!existsSync(filePath)) return null;
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.email === "string" && typeof parsed.password === "string") {
      return { email: parsed.email, password: parsed.password };
    }
    return null;
  } catch {
    return null;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error;
  const setupCreds = readSetupCredentials();

  async function handleCredentials(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/admin",
      });
    } catch (error) {
      if (error instanceof AuthError) {
        // Map NextAuth error types to human-friendly messages.
        // Never expose internal error.message — it contains docs URLs and internals.
        let msg: string;
        switch (error.type) {
          case "CredentialsSignin":
            // Check if the cause was a rate-limit throw from authorize()
            msg = (error.cause as { err?: Error } | undefined)?.err?.message?.startsWith("Too many")
              ? ((error.cause as { err?: Error }).err!.message)
              : "Incorrect email or password. Please try again.";
            break;
          case "AccessDenied":
            msg = "Your account does not have access. Contact an administrator.";
            break;
          case "OAuthAccountNotLinked":
            msg = "This email is already associated with a different sign-in method.";
            break;
          default:
            msg = "Sign in failed. Please try again.";
        }
        redirect(`/admin/login?error=${encodeURIComponent(msg)}`);
      }
      throw error;
    }
  }

  async function signInWithGitHub() {
    "use server";
    await signIn("github", { redirectTo: "/admin" });
  }

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/admin" });
  }

  const hasGitHub = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
  const hasGoogle = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const hasOAuth = hasGitHub || hasGoogle;

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">

        {/* Setup credentials banner — shown only on first run, gone after first login */}
        {setupCreds && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 space-y-3">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-800">Your setup credentials</p>
                <p className="text-xs text-amber-700 mt-0.5">Use these to sign in. This banner disappears after your first login.</p>
              </div>
            </div>
            <div className="bg-white border border-amber-200 rounded-lg px-4 py-3 space-y-2 font-mono text-sm">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 text-xs w-16 shrink-0">Email</span>
                <span className="text-zinc-900 font-medium select-all">{setupCreds.email}</span>
              </div>
              <div className="border-t border-amber-100" />
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 text-xs w-16 shrink-0">Password</span>
                <span className="text-zinc-900 font-medium select-all">{setupCreds.password}</span>
              </div>
            </div>
            <p className="text-xs text-amber-600">Change your password after signing in via Profile settings.</p>
          </div>
        )}

        <div className="bg-white border rounded-xl shadow-sm p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Pugmill</h1>
            <p className="text-sm text-zinc-500 mt-1">Sign in to your admin dashboard</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {decodeURIComponent(error)}
            </div>
          )}

          {/* OAuth providers */}
          {hasOAuth && (
            <div className="space-y-2">
              {hasGitHub && (
                <form action={signInWithGitHub}>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-3 border rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    Continue with GitHub
                  </button>
                </form>
              )}
              {hasGoogle && (
                <form action={signInWithGoogle}>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-3 border rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Divider — only shown when OAuth is available */}
          {hasOAuth && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200" />
              </div>
              <div className="relative flex justify-center text-xs text-zinc-400">
                <span className="bg-white px-2">or sign in with email</span>
              </div>
            </div>
          )}

          {/* Credentials form */}
          <form action={handleCredentials} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue={setupCreds?.email ?? ""}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[var(--ds-blue-1000)] text-white py-2 rounded-full text-sm font-medium hover:bg-[var(--ds-blue-900)] transition"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
