export async function GET() {
  const version = process.env.SITE_VERSION ?? process.env.VERSION ?? "unknown";
  return Response.json({ version, checkedAt: new Date().toISOString() });
}