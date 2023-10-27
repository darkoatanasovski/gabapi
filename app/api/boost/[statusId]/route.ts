import { BASE_URL } from "@/utils/constants";
import { fetch, CookieJar } from "node-fetch-cookies";
import { instance } from "@/utils/supabase";
import { HttpsProxyAgent } from "https-proxy-agent";
import { Params } from "next/dist/shared/lib/router/utils/route-matcher";
import { NextRequest, NextResponse } from "next/server";
import { sleep } from "@/utils/helper";

export async function GET(
  request: NextRequest,
  { params: { statusId } }: Params
) {
  try {
    const limit = request.nextUrl.searchParams.get("limit") || "10";
    const proxyAgent = new HttpsProxyAgent(process.env.PROXY_URL || "");
    const cookies = new CookieJar("");

    const { data } = await instance
      .from("users")
      .select("id, username, email, token, skipped, last_action_at")
      .not("token", "is", null)
      .limit(parseInt(limit))
      .order("last_action_at", { ascending: true });
    const users = data;

    if (!users) {
      throw Error("no users exist.");
    }

    for (let i = 0; i < users?.length; i++) {
      const user = users[i];
      const postRequestOptions = {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
        method: "POST",
        agent: proxyAgent,
      };

      const favourite = await fetch(
        cookies,
        `${BASE_URL}/api/v1/statuses/${statusId}/favourite`,
        postRequestOptions
      );
      const favouriteResponse = await favourite.json();
      console.log(favouriteResponse, " favourite");

      await sleep(2000);

      const reblog = await fetch(
        cookies,
        `${BASE_URL}/api/v1/statuses/${statusId}/reblog`,
        postRequestOptions
      );
      const reblogResponse = await reblog.json();

      await sleep(1000);

      if (reblogResponse.account_id) {
        const relationships = await fetch(
          cookies,
          `${BASE_URL}/api/v1/accounts/relationships`,
          {
            ...postRequestOptions,
            body: JSON.stringify({
              accountIds: [`${reblogResponse.account_id}`],
            }),
          }
        );

        if (!relationships[0]?.following) {
          const followResponse = await fetch(
            cookies,
            `${BASE_URL}/api/v1/accounts/${reblogResponse.account_id}/follow`,
            postRequestOptions
          );
          console.log(followResponse, " follow");
        }
      }
      console.log(reblogResponse, " reblog");

      await instance
        .from("users")
        .update({ last_action_at: new Date().toISOString() })
        .eq("id", user?.id);
    }
    return NextResponse.json({ status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }
}
