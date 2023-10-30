import { fetch, CookieJar } from "node-fetch-cookies";
import * as cheerio from "cheerio";
import randomUserAgent from "random-useragent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { NextRequest, NextResponse } from "next/server";
import { BASE_URL } from "@/utils/constants";
import {
  encodeFormData,
  formatUsername,
  generateRandomUser,
  getRandomAvatar,
  random,
  sleep,
} from "@/utils/helper";
import { instance } from "@/utils/supabase";
import FormData from "form-data";
import * as notes from "@/assets/notes.json";

export async function POST(request: NextRequest) {
  try {
    const userAgent = randomUserAgent.getRandom();
    const proxyAgent = new HttpsProxyAgent(process.env.PROXY_URL || "");

    const user = generateRandomUser();
    const cookies = new CookieJar("");
    const { captcha } = await request.json();

    if (!captcha) {
      throw Error("field captcha is missing.");
    }
    const resp = await fetch(cookies, `${BASE_URL}/auth/sign_up`, {
      headers: {
        "User-Agent": userAgent,
      },
      agent: proxyAgent,
    });
    const $ = cheerio.load(await resp.text());
    const csrf = $("meta[name=csrf-token]").attr("content");
    if (!csrf) {
      throw Error("csrf token is missing.");
    }

    await sleep(5000);
    const password = "4d57ca3a-49ca-4f02-9c89-8c32d7a33354";
    const postdata = {
      authenticity_token: csrf,
      "user[account_attributes][username]": user.username,
      "user[email]": user.email,
      "user[password]": password,
      "user[password_confirmation]": password,
      "cf-turnstile-response": captcha,
      "user[agreement]": "1",
      button: "",
    };

    const output = await fetch(cookies, `${BASE_URL}/auth`, {
      method: "POST",
      redirect: "follow",
      body: encodeFormData(postdata),
      headers: {
        Referer: `${BASE_URL}/auth/sign_up`,
        "User-Agent": userAgent,
        "Content-type": "application/x-www-form-urlencoded",
      },
      agent: proxyAgent,
    });
    const body = await output.text();
    const token = body.match(/(?<=access_token\":\").*?(?=\")/gs);
    const now = new Date().toISOString();
    user.token = token?.[0];
    if (!user.token) {
      console.log(body, "body");
      await instance
        .from("users")
        .update({ skipped: true, updated_at: now })
        .eq("id", user?.id);
      throw Error("failed to register");
    }

    await instance.from("users").insert(user);

    await sleep(random(2, 5) * 1000);
    const fd = new FormData();
    fd.append("display_name", formatUsername(user?.username));
    fd.append("note", notes[random(0, notes.length - 1)]);
    fd.append("avatar", await getRandomAvatar());
    await fetch(cookies, `${BASE_URL}/api/v1/accounts/update_credentials`, {
      method: "patch",
      headers: {
        "User-Agent": userAgent,
        Authorization: `Bearer ${user?.token}`,
      },
      body: fd,
      agent: proxyAgent,
    });

    return NextResponse.json(
      { status: output.status, user },
      { status: output.status }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 422 });
  }
}
