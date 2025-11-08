import { redirect } from "next/navigation";

export default async function Home() {
  // Always redirect to welcome page (no auth required)
  redirect("/welcome");
}

