import { request } from "http";
import { HttpsProxyAgent } from "https-proxy-agent";
import { NextRequest, NextResponse } from "next/server";
import { fetch, CookieJar } from "node-fetch-cookies";

export async function GET(request: NextRequest) {
  const withProxy = request.nextUrl.searchParams.get("proxy");
  const proxyAgent = new HttpsProxyAgent("http://173.208.211.82:17051", {
    keepAlive: true,
  });
  const cookies = new CookieJar("");
  const out = await fetch(cookies, "https://api.ipify.org?format=json", {
    agent: withProxy ? proxyAgent : undefined,
    headers: {
      "Proxy-Connections": "keep-alive",
    },
  });

  const output = await out.json();
  console.log(output, "output");
  return NextResponse.json({ output }, { status: 200 });
}
