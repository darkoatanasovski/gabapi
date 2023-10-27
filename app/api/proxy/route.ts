import { HttpsProxyAgent } from "https-proxy-agent";
import { NextRequest, NextResponse } from "next/server";
import { fetch, CookieJar } from "node-fetch-cookies";

export async function GET(request: NextRequest) {
  const withProxy = request.nextUrl.searchParams.get("proxy");
  const proxyAgent = new HttpsProxyAgent(process.env.PROXY_URL || "", {
    keepAlive: true,
  });
  const cookies = new CookieJar("");
  const out = await fetch(cookies, "https://api.ipify.org?format=json", {
    agent: withProxy ? proxyAgent : undefined,
  });
  const output = await out.json();
  console.log(output, "output");
  return NextResponse.json(output, { status: 200 });
}
