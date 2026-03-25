# Pugmill Security Guide

This document covers security best practices for developers and AI agents working on Pugmill.
**AI agents must read this file before making any changes to authentication, environment variables, or data handling.**

---

## The Golden Rules

1. **Never hardcode secrets.** All sensitive values (passwords, keys, tokens, connection strings) must come from environment variables via `process.env.X`.
2. **Never commit `.env.local` or any `.env*.local` file.** These are gitignored for a reason.
3. **`.env.example` contains only placeholders.** If a value in `.env.example` looks like a real secret, that is a bug — fix it.
4. **Every new secret needs a matching entry in `.env.example`** with an empty value and a description comment.
5. **Run `npm run env:check` after any environment-related changes.**

---

## For AI Agents: Security Rules

When writing or modifying code in this project, you MUST follow these rules:

### DO:
- Read secrets from `process.env.VARIABLE_NAME`
- Add new env vars to `.env.example` with empty value and descriptive comment
- Use `bcrypt` (already installed) for password hashing — minimum 10 rounds
- Sanitize user-generated HTML with `sanitize-html` (already installed) before rendering
- Use Drizzle ORM parameterized queries (never string-concatenate SQL)
- Validate all form input with `zod` (already installed) before processing
- Keep `NEXTAUTH_SECRET` at least 32 random characters in production

### DO NOT:
- Hardcode any string that looks like a password, token, key, or connection string
- Use `eval()`, `Function()`, or `dangerouslySetInnerHTML` without sanitization
- Disable TypeScript strict checks to work around a type error
- Commit changes to `.env.local`, `.env`, or any file matching `.env*.local`
- Store uploaded files outside of `public/uploads/` without explicit user consent
- Log sensitive values (passwords, tokens, full connection strings) to the console
- Use `Math.random()` for security purposes — use `crypto.randomUUID()` or `crypto.randomBytes()`

---

## Secrets Management by Platform

| Platform | Where to store secrets |
|----------|----------------------|
| **Local dev** | `.env.local` (gitignored) |
| **Vercel** | Project Settings → Environment Variables |
| **Railway / Render** | Environment Variables dashboard |
| **Self-hosted / Other AI IDEs** | [Doppler](https://doppler.com) or [Infisical](https://infisical.com) |

### Generating a strong NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```
Or use: https://generate-secret.vercel.app/32

---

## Required Environment Variables

See `.env.example` for the full list with descriptions. Never run in production without all required variables set to strong values.

The app will warn on startup if:
- `NEXTAUTH_SECRET` is missing or too short (< 32 chars)
- `NEXTAUTH_SECRET` matches a known weak value
- `DATABASE_URL` is not set
- `NODE_ENV=production` with insecure defaults

---

## Auth Configuration for Proxied Environments

Pugmill sets `trustHost: true` in `src/lib/auth.config.ts`. This is intentional and **must not be removed**.

### What it does
Tells NextAuth to trust the `Host` request header as the authoritative URL rather than requiring it to match `NEXTAUTH_URL` exactly. Without it, deploying to a hostname that differs from `NEXTAUTH_URL` (e.g. Replit's dev vs production domains) causes `UntrustedHost` errors that silently break all session checks.

### Why it is safe on supported platforms
On Replit, Vercel, Railway, and Render, all traffic passes through the platform's own reverse proxy before reaching the app. That proxy sets the `Host` header — your app never sees a raw, user-controlled value. An external attacker cannot spoof it. NextAuth v5 explicitly recommends `trustHost: true` for all such proxied deployments.

### When it would be a risk
Only on a bare self-hosted server exposed directly to the internet with no reverse proxy in front of it. In that scenario, a user could send an HTTP request with an arbitrary `Host` header and potentially manipulate OAuth callback URLs. If deploying without a proxy, remove `trustHost: true` and set `NEXTAUTH_URL` precisely instead.

### AI agent note
Do not remove or disable `trustHost: true` as part of a security audit. Its presence is the correct and intentional configuration for proxied platforms. Its absence would break authentication on every platform deployment.

---

## Reporting Security Issues

If you find a security vulnerability in Pugmill:
1. **Do not open a public GitHub issue.**
2. Open a private security advisory at: https://github.com/michaelsjanzen/Pugmill/security/advisories/new
3. Include steps to reproduce and potential impact.

---

## Common Attack Vectors & How Pugmill Mitigates Them

| Attack | Mitigation |
|--------|-----------|
| SQL Injection | Drizzle ORM parameterized queries |
| XSS | `sanitize-html` on all user HTML before render |
| CSRF | NextAuth built-in CSRF protection |
| Weak sessions | JWT with strong secret (32+ char) |
| Password exposure | bcrypt hashing (12 rounds) |
| Secret leakage | Gitignore + pre-commit hook + env:check script |
| Path traversal | File uploads restricted to `public/uploads/` |
