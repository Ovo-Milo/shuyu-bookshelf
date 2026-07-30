type OpenLibraryDocument = {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  publisher?: string[];
  isbn?: string[];
};

type OpenLibraryResponse = {
  docs?: OpenLibraryDocument[];
};

function cleanedIsbns(values: string[] = []) {
  return values.map((value) => value.replace(/[^0-9X]/gi, ""));
}

function preferredIsbn(values: string[] = []) {
  return (
    values.find((value) => value.length === 13) ??
    values.find((value) => value.length === 10)
  );
}

export async function GET(request: Request) {
  const rawQuery = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (!rawQuery) {
    return Response.json({ books: [] });
  }

  const compactIsbn = rawQuery.replace(/[^0-9X]/gi, "");
  const query =
    compactIsbn.length === 10 || compactIsbn.length === 13
      ? `isbn:${compactIsbn}`
      : Array.from(rawQuery).length < 3
        ? `(title:${rawQuery} OR author:${rawQuery})`
        : rawQuery;
  const params = new URLSearchParams({
    q: query,
    lang: "zh",
    page: "1",
    limit: "20",
    fields:
      "key,title,author_name,first_publish_year,cover_i,publisher,isbn",
  });

  try {
    const response = await fetch(`https://openlibrary.org/search.json?${params}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ShuyuBookshelf/1.0 (personal reading tracker)",
      },
    });

    if (!response.ok) {
      return Response.json(
        { books: [], message: "Book catalogue unavailable" },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as OpenLibraryResponse;
    const seen = new Set<string>();
    const books = (payload.docs ?? [])
      .filter((book) => book.key && book.title)
      .map((book) => {
        const isbn = preferredIsbn(cleanedIsbns(book.isbn));
        return {
          id: `openlibrary:${book.key}`,
          source: "openlibrary" as const,
          sourceUrl: `https://openlibrary.org${book.key}`,
          isbn,
          title: book.title!,
          authors: book.author_name?.slice(0, 4) ?? [],
          publisher: book.publisher?.[0],
          publishedDate: book.first_publish_year?.toString(),
          coverUrl: book.cover_i
            ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg?default=false`
            : isbn
              ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`
              : undefined,
        };
      })
      .filter((book) => {
        const duplicateKey = book.isbn ?? `${book.title}:${book.authors[0] ?? ""}`;
        if (seen.has(duplicateKey)) return false;
        seen.add(duplicateKey);
        return true;
      })
      .slice(0, 12);

    return Response.json(
      { books },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } },
    );
  } catch {
    return Response.json(
      { books: [], message: "Book catalogue unavailable" },
      { status: 502 },
    );
  }
}
