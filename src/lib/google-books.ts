export type BookSearchResult = {
  google_books_id: string | null;
  title: string;
  author: string | null;
  total_pages: number | null;
  language: string | null;
  cover_url: string | null;
  isbn: string | null;
  genre: string | null;
};

function toHttps(url: string | undefined): string | null {
  if (!url) return null;
  return url.replace(/^http:/, "https:").replace(/[?&]edge=curl/, "");
}

function normalizeForMatch(value: string): string {
  return value.trim().toLowerCase();
}

function matchesQuery(query: string, result: Pick<BookSearchResult, "title" | "author">): boolean {
  const q = normalizeForMatch(query);
  const title = normalizeForMatch(result.title);
  const author = result.author ? normalizeForMatch(result.author) : "";
  return title.includes(q) || q.includes(title) || (author !== "" && (author.includes(q) || q.includes(author)));
}

type GoogleVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    pageCount?: number;
    printedPageCount?: number;
    language?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
    categories?: string[];
  };
};

function normalizeGoogle(volume: GoogleVolume): BookSearchResult | null {
  const info = volume.volumeInfo;
  if (!info?.title) return null;

  const isbn =
    info.industryIdentifiers?.find((id) => id.type === "ISBN_13")?.identifier ??
    info.industryIdentifiers?.find((id) => id.type === "ISBN_10")?.identifier ??
    null;

  return {
    google_books_id: volume.id,
    title: info.title,
    author: info.authors?.join(", ") ?? null,
    total_pages: info.pageCount ?? info.printedPageCount ?? null,
    language: info.language ?? null,
    cover_url: toHttps(info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail),
    isbn,
    genre: info.categories?.[0] ?? null,
  };
}

async function searchGoogleBooks(query: string): Promise<BookSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    printType: "books",
    orderBy: "relevance",
    maxResults: "20",
  });
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (apiKey) params.set("key", apiKey);

  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Google Books: ${response.status}`);

  const json = (await response.json()) as { items?: GoogleVolume[] };
  const normalized = (json.items ?? [])
    .map(normalizeGoogle)
    .filter((result): result is BookSearchResult => result !== null)
    .filter((result) => result.author !== null);

  const relevant = normalized.filter((result) => matchesQuery(query, result));
  return (relevant.length > 0 ? relevant : normalized).slice(0, 10);
}

type OpenLibraryDoc = {
  title?: string;
  author_name?: string[];
  number_of_pages_median?: number;
  language?: string[];
  cover_i?: number;
  isbn?: string[];
  subject?: string[];
};

function normalizeOpenLibrary(doc: OpenLibraryDoc): BookSearchResult | null {
  if (!doc.title) return null;

  return {
    google_books_id: null,
    title: doc.title,
    author: doc.author_name?.join(", ") ?? null,
    total_pages: doc.number_of_pages_median ?? null,
    language: doc.language?.[0] ?? null,
    cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    isbn: doc.isbn?.[0] ?? null,
    genre: doc.subject?.[0] ?? null,
  };
}

async function searchOpenLibrary(query: string): Promise<BookSearchResult[]> {
  const params = new URLSearchParams({ q: query, limit: "10" });
  const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Open Library: ${response.status}`);

  const json = (await response.json()) as { docs?: OpenLibraryDoc[] };
  return (json.docs ?? [])
    .map(normalizeOpenLibrary)
    .filter((result): result is BookSearchResult => result !== null);
}

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  try {
    const results = await searchGoogleBooks(query);
    if (results.length > 0) return results;
  } catch {
    // falls through to Open Library
  }

  try {
    return await searchOpenLibrary(query);
  } catch {
    return [];
  }
}
