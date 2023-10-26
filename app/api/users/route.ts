import { fetch, CookieJar } from "node-fetch-cookies";
import * as cheerio from "cheerio";
import randomUserAgent from "random-useragent";
import { HttpsProxyAgent } from "https-proxy-agent";
import * as users from "@/assets/users.json";
import { NextRequest, NextResponse } from "next/server";
import { BASE_URL } from "@/utils/constants";
import { encodeFormData, random, sleep } from "@/utils/helper";
import { instance } from "@/utils/supabase";

export async function GET(request: NextRequest) {
  try {
    const proxyAgent = new HttpsProxyAgent("http://163.172.214.121:17060/");
    const { data } = await instance
      .from("users")
      .select("id, username, email, token, skipped")
      .is("token", null)
      .is("skipped", false)
      .limit(1);
    const user = data?.[0];

    const cookies = new CookieJar("");
    const cfTurnstileResponse = request.nextUrl.searchParams.get(
      "cf-turnstile-response"
    );
    if (!cfTurnstileResponse) {
      throw Error("field cf-turnstile-response is missing.");
    }
    const resp = await fetch(cookies, `${BASE_URL}/auth/sign_up`);
    const $ = cheerio.load(await resp.text());
    const csrf = $("meta[name=csrf-token]").attr("content");
    if (!csrf) {
      throw Error("csrf token is missing.");
    }

    await sleep(6000);
    const password = "4d57ca3a-49ca-4f02-9c89-8c32d7a33354";
    const postdata = {
      authenticity_token: csrf,
      "user[account_attributes][username]": user?.username,
      "user[email]": user?.email,
      "user[password]": password,
      "user[password_confirmation]": password,
      "cf-turnstile-response": cfTurnstileResponse,
      "user[agreement]": "1",
      button: "",
    };

    const output = await fetch(cookies, `${BASE_URL}/auth`, {
      method: "POST",
      redirect: "follow",
      body: encodeFormData(postdata),
      headers: {
        Referer: `${BASE_URL}/auth/sign_up`,
        "User-agent": randomUserAgent.getRandom(),
        "Content-type": "application/x-www-form-urlencoded",
      },
      agent: proxyAgent,
    });
    const body = await output.text();
    const token = body.match(/(?<=access_token\":\").*?(?=\")/gs);
    const now = new Date().toISOString();

    if (!token) {
      console.log(body, "body");
      await instance
        .from("users")
        .update({ skipped: true, updated_at: now })
        .eq("id", user?.id);
      throw Error("failed to register");
    }

    await instance
      .from("users")
      .update({ token: token[0], updated_at: now })
      .eq("id", user?.id);

    user!.token = token[0];
    return NextResponse.json(
      { status: output.status, user },
      { status: output.status }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 422 });
  }
}

export async function POST(request: NextRequest) {
  const mailproviders = [
    "@gmail.com",
    "@yahoo.com",
    "@hotmail.com",
    "@live.com",
  ];
  for (let i = 0; i < 3; i++) {
    for (let i = 0; i < users.length; i++) {
      const user = {
        username: users[i].toLocaleLowerCase() + random(9999, 99999),
        email:
          users[i].toLocaleLowerCase() +
          random(9999, 99999) +
          mailproviders[random(0, mailproviders.length - 1)],
      };
      await instance.from("users").insert(user);
      console.log(`new user: ${JSON.stringify(user)}`);
      await sleep(1000);
    }
  }
}
