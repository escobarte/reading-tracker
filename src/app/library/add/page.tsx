import { getGenreSuggestions } from "@/lib/db/stats";
import { AddBookPageView } from "./AddBookPageView";

export default async function AddBookPage() {
  const genreSuggestions = await getGenreSuggestions();
  return <AddBookPageView genreSuggestions={genreSuggestions} />;
}
