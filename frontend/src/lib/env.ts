export function readPublicEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function requirePublicEnv(name: string): string {
  const value = readPublicEnv(name);
  if (!value) {
    throw new Error(
      `Missing required frontend environment variable: ${name}. Add it to frontend/.env.local before starting the app.`,
    );
  }

  return value;
}
