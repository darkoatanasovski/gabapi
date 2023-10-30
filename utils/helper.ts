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
