import { fetch, CookieJar } from "node-fetch-cookies";
import * as cheerio from "cheerio";
import randomUserAgent from "random-useragent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { NextRequest, NextResponse } from "next/server";
import { BASE_URL } from "@/utils/constants";
import { encodeFormData, random, sleep } from "@/utils/helper";
import { instance } from "@/utils/supabase";
import FormData from "form-data";

export async function POST(request: NextRequest) {
  try {
    const userAgent = randomUserAgent.getRandom();
    const proxyAgent = new HttpsProxyAgent("http://163.172.214.121:17060/");
    const { data } = await instance
      .from("users")
      .select("id, username, email, token, skipped")
      .is("token", null)
      .is("skipped", false)
      .order("id", { ascending: true })
      .limit(1);
    const user = data?.[0];
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
      "user[account_attributes][username]": user?.username,
      "user[email]": user?.email,
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

    //Uncomment this if you want to update user info
    // await sleep(random(2, 5) * 1000);
    // const fd = new FormData();
    // fd.append("display_name", user?.username.replace(/\d+/g, ""));
    // fd.append("note", "Welcome to my Gab profile.");
    // await fetch(cookies, `${BASE_URL}/api/v1/accounts/update_credentials`, {
    //   method: "patch",
    //   headers: {
    //     Authorization: `Bearer ${user?.token}`,
    //   },
    //   body: fd,
    // });

    return NextResponse.json(
      { status: output.status, user },
      { status: output.status }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 422 });
  }
}
