import { redirect } from "next/navigation";

// Bare /[city] → the city's "homes for sale" hub. Keeps a clean entry point
// (e.g. /lake-charles) pointing at the canonical landing page.
export default function CityIndex({ params }: { params: { city: string } }) {
  redirect(`/${params.city}/homes-for-sale`);
}
