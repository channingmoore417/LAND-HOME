import { redirect } from "next/navigation";

// The team roster lives on /about; /agents/[slug] are the individual pages.
export default function AgentsIndex() {
  redirect("/about");
}
