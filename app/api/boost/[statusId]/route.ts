import { BASE_URL, COMMENTS } from "@/utils/constants";
import { fetch, CookieJar } from "node-fetch-cookies";
import { instance } from "@/utils/supabase";
import { HttpsProxyAgent } from "https-proxy-agent";
import { Params } from "next/dist/shared/lib/router/utils/route-matcher";
import { NextRequest, NextResponse } from "next/server";
import {
  commentPayload,
  random,
  shouldBoostExtras,
  sleep,
} from "@/utils/helper";

const PROXY_AGENT = new HttpsProxyAgent(process.env.PROXY_URL || "");
const COOKIES = new CookieJar("");
const CONCURRENCY = 3;

export async function GET(
  request: NextRequest,
  { params: { statusId } }: Params
) {
  const limit = request.nextUrl.searchParams.get("limit") || "10";

  const { data } = await instance
    .from("users")
    .select("*")
    .not("token", "is", null)
    .limit(parseInt(limit))
    .order("last_action_at", { ascending: true });
  const users = data;

  if (!users?.length) {
    return NextResponse.json({ error: "users list is empty" }, { status: 404 });
  }

  for (let i = 0; i < users?.length; i += CONCURRENCY) {
    try {
      const chunk = users.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map((user) => boostActions(user, statusId)));
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
  }
  return NextResponse.json({ status: 200 });
}

const boostActions = async (user: any, statusId: any) => {
  const postRequestOptions = {
    headers: {
      Authorization: `Bearer ${user?.token}`,
      "Content-Type": "application/json;charset=UTF-8",
    },
    method: "POST",
    agent: PROXY_AGENT,
  };

  const favourite = await fetch(
    COOKIES,
    `${BASE_URL}/api/v1/statuses/${statusId}/favourite`,
    postRequestOptions
  );

  if (favourite.status === 403) {
    console.log(JSON.stringify(await favourite.json()), " favorite status");

    console.log("delete user: ", JSON.stringify(user));
    await instance.from("users").delete().eq("id", user?.id);
    return;
  }

  const favouriteResponse = await favourite.json();
  const { shouldReblog, shouldReply, shouldQuote } = shouldBoostExtras({
    likes: favouriteResponse?.favourites_count,
    reblogs: favouriteResponse?.reblogs_count,
    replies: favouriteResponse?.replies_count,
    quotes: favouriteResponse?.quotes_count,
  });

  // if (favouriteResponse.account_id) {
  //   const relationships = await fetch(
  //     COOKIES,
  //     `${BASE_URL}/api/v1/accounts/relationships`,
  //     {
  //       ...postRequestOptions,
  //       body: JSON.stringify({
  //         accountIds: [`${favouriteResponse.account_id}`],
  //       }),
  //     }
  //   );
  //   await sleep(2000);

  //   if (!relationships[0]?.following) {
  //     const follow = await fetch(
  //       COOKIES,
  //       `${BASE_URL}/api/v1/accounts/${favouriteResponse.account_id}/follow`,
  //       postRequestOptions
  //     );
  //     const followResponse = await follow.json();
  //     console.log(followResponse, " follow");
  //   }

  //   await sleep(2000);
  // }

  if (shouldReblog) {
    const reblog = await fetch(
      COOKIES,
      `${BASE_URL}/api/v1/statuses/${statusId}/reblog`,
      postRequestOptions
    );
    const reblogResponse = await reblog.json();
    console.log(reblogResponse, " reblog");
    await sleep(1000);
  }

  if (shouldQuote) {
    const comment = COMMENTS[random(0, COMMENTS.length - 1)];
    console.log(comment, " comment");
    console.log(
      JSON.stringify(commentPayload({ statusId, comment, type: "quote" })),
      " payload comment"
    );

    const quote = await fetch(COOKIES, `${BASE_URL}/api/v1/statuses`, {
      ...postRequestOptions,
      body: JSON.stringify(
        commentPayload({ statusId, comment, type: "quote" })
      ),
    });

    const quoteResponse = await quote.json();
    console.log(quoteResponse, " quote status");
  } else if (shouldReply) {
    const comment = COMMENTS[random(0, COMMENTS.length - 1)];
    const reply = await fetch(COOKIES, `${BASE_URL}/api/v1/statuses`, {
      ...postRequestOptions,
      body: JSON.stringify(
        commentPayload({ statusId, comment, type: "reply" })
      ),
    });

    const replyResponse = await reply.json();
    console.log(replyResponse, " reply status");

    await instance
      .from("users")
      .update({ last_action_at: new Date().toISOString() })
      .eq("id", user?.id);
  }
};
