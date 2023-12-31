import sharp from "sharp";
import * as users from "@/assets/users.json";
import { User } from "@/types";

export const encodeFormData = (data: Record<string, string | number>) => {
  const encoded = [];
  for (const key in data) {
    if (Object.hasOwnProperty.call(data, key)) {
      encoded.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`
      );
    }
  }
  return encoded.join("&");
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const random = (min: number, max: number) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
};

export const formatUsername = (username: string) => {
  username = username.replace(/\d+/g, "");
  return username.charAt(0).toUpperCase() + username.slice(1);
};

export const getRandomAvatar = async () => {
  const original = await fetch("https://thispersondoesnotexist.com/");
  return (
    "data:image/jpeg;base64," +
    (
      await sharp(await original.arrayBuffer())
        .rotate()
        .resize(80)
        .jpeg({ mozjpeg: true })
        .toBuffer()
    ).toString("base64")
  );
};

export const generateRandomUser = (): User => {
  const user = users[random(0, users.length - 1)].toLocaleLowerCase();
  const emls = ["@gmail.com", "@yahoo.com", "@hotmail.com", "@live.com"];
  return {
    username: user + random(999, 99999),
    email: user + random(999, 99999) + emls[random(0, emls.length - 1)],
  };
};

export const shouldBoostExtras = ({
  likes,
  reblogs,
  replies,
  quotes,
}: {
  likes: number;
  reblogs: number;
  replies: number;
  quotes: number;
}): { shouldReblog: boolean; shouldReply: boolean; shouldQuote: boolean } => {
  const total = likes;

  const reblogsThreshold = 30;
  const repliesThreshold = 2;
  const quotesThreshold = 1;

  const reblogsPercentage = (reblogs / total) * 100;
  const repliesPercentage = (replies / total) * 100;
  const quotesPercentage = (quotes / total) * 100;

  const boostExtras = {
    shouldReblog: false,
    shouldReply: false,
    shouldQuote: false,
    shouldFollow: false,
  };

  if (reblogsPercentage < reblogsThreshold) {
    boostExtras.shouldReblog = true;
  }
  if (repliesPercentage < repliesThreshold) {
    boostExtras.shouldReply = true;
  }
  if (quotesPercentage < quotesThreshold) {
    boostExtras.shouldQuote = true;
  }

  return boostExtras;
};

export const commentPayload = ({
  statusId,
  comment,
  type,
}: {
  statusId: any;
  comment: string;
  type: "reply" | "quote";
}) => {
  return {
    status: comment,
    markdown: comment,
    expires_at: null,
    scheduled_at: null,
    in_reply_to_id: type === "reply" ? statusId : null,
    quote_of_id: type === "quote" ? statusId : null,
    sensitive: false,
    spoiler_text: "",
    visibility: "public",
    poll: null,
    group_id: null,
    media_ids: [],
    status_context_id: null,
  };
};
