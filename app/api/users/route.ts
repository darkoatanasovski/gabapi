import * as users from "@/assets/users.json";
import { NextRequest } from "next/server";
import { instance } from "@/utils/supabase";
import { random, sleep } from "@/utils/helper";

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
