const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

/**
 * Fail fast at startup when required configuration is missing.
 *
 * Called from `instrumentation.ts`, which Next.js runs once when a server
 * instance boots. Without this, a misconfigured deployment would start with
 * the auth proxy silently disabled.
 */
export function assertEnv() {
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        "Add them to .env.local (see .env.example) and restart the server.",
    );
  }
}
