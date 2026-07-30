"use client";

import {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ReadingStatus = "want" | "reading" | "finished";
type ShelfFilter = "all" | ReadingStatus;
type SortMode = "updated" | "rating" | "title";

type BookRecord = {
  id: string;
  source: "openlibrary" | "manual" | "demo";
  sourceUrl?: string;
  isbn?: string;
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  publishedDate?: string;
  coverUrl?: string;
};

type ShelfBook = BookRecord & {
  status: ReadingStatus;
  rating: number | null;
  note: string;
  startedAt?: string;
  finishedAt?: string;
  addedAt: string;
  updatedAt: string;
  isDemo?: boolean;
};

type SearchState = "idle" | "loading" | "success" | "empty" | "error";

const STORAGE_KEY = "shuyu-bookshelf-v1";

const STATUS_META: Record<
  ReadingStatus,
  { label: string; short: string; description: string }
> = {
  want: { label: "想读", short: "想读", description: "先收好，留给未来" },
  reading: { label: "在读", short: "在读", description: "正在翻阅的这一册" },
  finished: { label: "读完", short: "读完", description: "已经留在记忆里" },
};

const RATING_LABELS = [
  "未评分",
  "不太喜欢",
  "比较一般",
  "值得一读",
  "很喜欢",
  "强烈推荐",
];

const COVER_TONES = ["clay", "forest", "ink", "ochre", "plum", "sage"];

const DEMO_BOOKS: ShelfBook[] = [
  {
    id: "demo-santi",
    source: "demo",
    isbn: "9787536692930",
    title: "三体",
    subtitle: "“地球往事”三部曲之一",
    authors: ["刘慈欣"],
    publisher: "重庆出版社",
    publishedDate: "2008",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9787536692930-L.jpg",
    status: "finished",
    rating: 5,
    note: "第一次抬头认真想宇宙，也重新看见了人类。",
    startedAt: "2026-01-08",
    finishedAt: "2026-01-19",
    addedAt: "2026-01-08T08:00:00.000Z",
    updatedAt: "2026-01-19T08:00:00.000Z",
    isDemo: true,
  },
  {
    id: "demo-huozhe",
    source: "demo",
    isbn: "9787506365437",
    title: "活着",
    authors: ["余华"],
    publisher: "作家出版社",
    publishedDate: "2012",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9787506365437-L.jpg",
    status: "finished",
    rating: 4,
    note: "沉重，却不绝望。合上书以后，福贵还在往前走。",
    startedAt: "2025-12-02",
    finishedAt: "2025-12-06",
    addedAt: "2025-12-02T08:00:00.000Z",
    updatedAt: "2025-12-06T08:00:00.000Z",
    isDemo: true,
  },
  {
    id: "demo-zhishennei",
    source: "demo",
    isbn: "9787208171336",
    title: "置身事内",
    subtitle: "中国政府与经济发展",
    authors: ["兰小欢"],
    publisher: "上海人民出版社",
    publishedDate: "2021",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9787208171336-L.jpg",
    status: "reading",
    rating: null,
    note: "正在读地方政府投融资这一章。",
    startedAt: "2026-07-26",
    addedAt: "2026-07-26T08:00:00.000Z",
    updatedAt: "2026-07-29T08:00:00.000Z",
    isDemo: true,
  },
  {
    id: "demo-marquez",
    source: "demo",
    isbn: "9787544253994",
    title: "百年孤独",
    authors: ["加西亚·马尔克斯"],
    publisher: "南海出版公司",
    publishedDate: "2011",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9787544253994-L.jpg",
    status: "want",
    rating: null,
    note: "",
    addedAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-20T08:00:00.000Z",
    isDemo: true,
  },
  {
    id: "demo-little-prince",
    source: "demo",
    isbn: "9787020042494",
    title: "小王子",
    authors: ["安托万·德·圣埃克苏佩里"],
    publisher: "人民文学出版社",
    publishedDate: "2003",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9787020042494-L.jpg",
    status: "want",
    rating: null,
    note: "",
    addedAt: "2026-07-17T08:00:00.000Z",
    updatedAt: "2026-07-17T08:00:00.000Z",
    isDemo: true,
  },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function stableTone(title: string) {
  const seed = Array.from(title).reduce(
    (total, character) => total + (character.codePointAt(0) ?? 0),
    0,
  );
  return COVER_TONES[seed % COVER_TONES.length];
}

function authorsText(authors: string[]) {
  return authors.length ? authors.join("、") : "作者不详";
}

function yearText(date?: string) {
  return date?.match(/\d{4}/)?.[0] ?? "";
}

function BookCover({
  book,
  size = "card",
}: {
  book: BookRecord;
  size?: "card" | "result" | "editor";
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(book.coverUrl) && !failed;

  return (
    <div
      className={`book-cover book-cover--${size} book-cover--${stableTone(book.title)}`}
      aria-hidden={!showImage}
    >
      {showImage ? (
        <img
          src={book.coverUrl}
          alt={`《${book.title}》封面`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <span className="cover-kicker">SHU YU</span>
          <strong>{book.title}</strong>
          <span>{authorsText(book.authors)}</span>
          <i />
        </>
      )}
    </div>
  );
}

function Stars({
  value,
  compact = false,
}: {
  value: number | null;
  compact?: boolean;
}) {
  if (!value) {
    return <span className="rating-empty">{compact ? "未评分" : "还没评分"}</span>;
  }

  return (
    <span className="rating-display" aria-label={`${value} 星`}>
      <span aria-hidden="true">{"★".repeat(value)}</span>
      {!compact && <em>{RATING_LABELS[value]}</em>}
    </span>
  );
}

function SearchSkeleton() {
  return (
    <div className="search-grid" aria-label="正在搜索书籍" role="status">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="search-card search-card--skeleton" key={index}>
          <div className="skeleton-cover" />
          <div className="skeleton-copy">
            <span />
            <span />
            <span />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [books, setBooks] = useState<ShelfBook[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [online, setOnline] = useState(true);
  const [filter, setFilter] = useState<ShelfFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("updated");
  const [shelfQuery, setShelfQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedTerm, setSearchedTerm] = useState("");
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [searchResults, setSearchResults] = useState<BookRecord[]>([]);
  const [editorBook, setEditorBook] = useState<ShelfBook | null>(null);
  const [editorIsNew, setEditorIsNew] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [toast, setToast] = useState("");
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const dialogCloseRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ShelfBook[];
        setBooks(Array.isArray(parsed) ? parsed : []);
      } else {
        setBooks(DEMO_BOOKS);
      }
    } catch {
      setBooks(DEMO_BOOKS);
      setStorageError(true);
    } finally {
      setStorageReady(true);
    }

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    setOnline(window.navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [books, storageReady]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!editorBook) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeEditor();
    };
    document.body.classList.add("modal-open");
    window.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => dialogCloseRef.current?.focus());
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editorBook]);

  const stats = useMemo(() => {
    const personalBooks = books.filter((book) => !book.isDemo);
    const source = personalBooks.length ? personalBooks : books;
    const rated = source.filter((book) => book.rating);
    return {
      all: source.length,
      want: source.filter((book) => book.status === "want").length,
      reading: source.filter((book) => book.status === "reading").length,
      finished: source.filter((book) => book.status === "finished").length,
      average: rated.length
        ? (
            rated.reduce((total, book) => total + (book.rating ?? 0), 0) /
            rated.length
          ).toFixed(1)
        : "—",
    };
  }, [books]);

  const visibleBooks = useMemo(() => {
    const normalizedQuery = shelfQuery.trim().toLocaleLowerCase("zh-CN");
    return books
      .filter((book) => filter === "all" || book.status === filter)
      .filter((book) => {
        if (!normalizedQuery) return true;
        return [book.title, book.subtitle, ...book.authors, book.publisher]
          .filter(Boolean)
          .some((value) =>
            String(value).toLocaleLowerCase("zh-CN").includes(normalizedQuery),
          );
      })
      .sort((left, right) => {
        if (sortMode === "rating") {
          return (right.rating ?? -1) - (left.rating ?? -1);
        }
        if (sortMode === "title") {
          return left.title.localeCompare(right.title, "zh-CN");
        }
        return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
      });
  }, [books, filter, shelfQuery, sortMode]);

  const featuredBook =
    books.find((book) => book.status === "reading") ??
    books.find((book) => book.status === "finished") ??
    books[0];

  const hasDemoBooks = books.some((book) => book.isDemo);

  function notify(message: string) {
    setToast(message);
  }

  function focusSearch(prefill?: string) {
    document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" });
    window.setTimeout(() => {
      if (prefill) setSearchQuery(prefill);
      searchInputRef.current?.focus();
    }, 350);
  }

  async function runSearch(term: string) {
    const query = term.trim();
    if (!query) {
      searchInputRef.current?.focus();
      return;
    }
    if (!online) {
      setSearchState("error");
      setSearchedTerm(query);
      return;
    }

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setSearchedTerm(query);
    setSearchState("loading");

    try {
      const response = await fetch(`/api/books?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Search failed");
      const payload = (await response.json()) as { books?: BookRecord[] };
      const results = Array.isArray(payload.books) ? payload.books : [];
      setSearchResults(results);
      setSearchState(results.length ? "success" : "empty");
      document
        .getElementById("search-results")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setSearchResults([]);
      setSearchState("error");
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(searchQuery);
  }

  function openNewBook(book: BookRecord, status: ReadingStatus = "want") {
    const existing = books.find(
      (item) =>
        item.id === book.id ||
        (item.isbn && book.isbn && item.isbn === book.isbn),
    );
    if (existing) {
      openExistingBook(existing);
      return;
    }

    const now = new Date().toISOString();
    setEditorBook({
      ...book,
      status,
      rating: null,
      note: "",
      startedAt: status === "reading" ? today() : undefined,
      finishedAt: status === "finished" ? today() : undefined,
      addedAt: now,
      updatedAt: now,
      isDemo: false,
    });
    setEditorIsNew(true);
    setConfirmRemove(false);
  }

  function openManualBook() {
    openNewBook({
      id: `manual-${crypto.randomUUID()}`,
      source: "manual",
      title: searchQuery.trim(),
      authors: [],
    });
  }

  function openExistingBook(book: ShelfBook) {
    setEditorBook({ ...book, authors: [...book.authors] });
    setEditorIsNew(false);
    setConfirmRemove(false);
  }

  function closeEditor() {
    setEditorBook(null);
    setEditorIsNew(false);
    setConfirmRemove(false);
  }

  function updateDraft(patch: Partial<ShelfBook>) {
    setEditorBook((current) => (current ? { ...current, ...patch } : current));
  }

  function chooseDraftStatus(status: ReadingStatus) {
    if (!editorBook) return;
    const patch: Partial<ShelfBook> = { status };
    if (status === "reading" && !editorBook.startedAt) patch.startedAt = today();
    if (status === "finished" && !editorBook.finishedAt) {
      patch.finishedAt = today();
    }
    updateDraft(patch);
  }

  function saveBook() {
    if (!editorBook) return;
    const title = editorBook.title.trim();
    const cleanedAuthors = editorBook.authors
      .map((author) => author.trim())
      .filter(Boolean);
    if (!title) {
      notify("请先写下书名");
      return;
    }

    const savedBook: ShelfBook = {
      ...editorBook,
      title,
      authors: cleanedAuthors,
      updatedAt: new Date().toISOString(),
      isDemo: false,
    };

    setBooks((current) => {
      const index = current.findIndex((book) => book.id === savedBook.id);
      if (index === -1) return [savedBook, ...current];
      return current.map((book) => (book.id === savedBook.id ? savedBook : book));
    });
    notify(
      editorIsNew ? `《${savedBook.title}》已加入书架` : "阅读记录已保存",
    );
    closeEditor();
  }

  function removeBook() {
    if (!editorBook) return;
    setBooks((current) => current.filter((book) => book.id !== editorBook.id));
    notify(`《${editorBook.title}》已移出书架`);
    closeEditor();
  }

  function clearDemoBooks() {
    setBooks((current) => current.filter((book) => !book.isDemo));
    notify("示例书已清空，现在开始建立你的书架吧");
  }

  function handleRatingKeys(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!editorBook) return;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const direction =
      event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : -1;
    const current = editorBook.rating ?? 0;
    const next = Math.min(5, Math.max(1, current + direction));
    updateDraft({ rating: next });
  }

  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="书屿首页">
          <span className="brand-mark" aria-hidden="true">
            书
          </span>
          <span>
            <strong>书屿</strong>
            <small>我的私人书架</small>
          </span>
        </a>
        <nav aria-label="主要导航">
          <a href="#shelf">我的书架</a>
          <a href="#discover">发现书籍</a>
        </nav>
        <button className="button button--dark header-action" onClick={() => focusSearch()}>
          <span aria-hidden="true">＋</span>
          添加书籍
        </button>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">
            <span />
            私人阅读档案
          </p>
          <h1>
            把读过的书，
            <br />
            留在<span>这里。</span>
          </h1>
          <p className="hero-lede">
            搜索公开书目，把想读、在读和读完的每一本书收好。
            评分，写几句感受，让阅读真正成为自己的收藏。
          </p>
          <form className="hero-search" onSubmit={handleSearch}>
            <label htmlFor="hero-book-search" className="sr-only">
              搜索书名、作者或 ISBN
            </label>
            <span className="search-symbol" aria-hidden="true">
              ⌕
            </span>
            <input
              id="hero-book-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜书名、作者或 ISBN"
              autoComplete="off"
            />
            <button type="submit">寻找这本书</button>
          </form>
          <div className="quick-searches" aria-label="热门搜索">
            <span>试着搜：</span>
            {["余华", "科幻小说", "心理学"].map((term) => (
              <button
                key={term}
                onClick={() => {
                  setSearchQuery(term);
                  void runSearch(term);
                }}
              >
                {term}
              </button>
            ))}
          </div>
          <p className="local-note">
            <span aria-hidden="true">●</span>
            阅读记录仅保存在当前设备，不需要注册
          </p>
        </div>

        <aside className="hero-library" aria-label="书架概览">
          <div className="library-orbit library-orbit--one" />
          <div className="library-orbit library-orbit--two" />
          <div className="hero-card">
            <div className="hero-card__top">
              <p>
                {featuredBook?.status === "reading" ? "正在读" : "书架近况"}
                <span className="live-dot" />
              </p>
              <span>{String(stats.all).padStart(2, "0")} 册藏书</span>
            </div>
            {featuredBook ? (
              <button
                className="featured-book"
                onClick={() => openExistingBook(featuredBook)}
                aria-label={`编辑《${featuredBook.title}》`}
              >
                <BookCover book={featuredBook} size="result" />
                <span className="featured-copy">
                  <small>{STATUS_META[featuredBook.status].label}</small>
                  <strong>{featuredBook.title}</strong>
                  <em>{authorsText(featuredBook.authors)}</em>
                  {featuredBook.rating ? (
                    <span className="featured-rating" aria-label={`${featuredBook.rating} 星`}>
                      {"★".repeat(featuredBook.rating)}
                    </span>
                  ) : (
                    <span className="featured-progress">
                      <i />
                      慢慢读，读到哪里都算数
                    </span>
                  )}
                </span>
                <span className="round-arrow" aria-hidden="true">
                  ↗
                </span>
              </button>
            ) : (
              <div className="featured-empty">
                <div className="empty-book-shape" aria-hidden="true">
                  <span>第一本</span>
                </div>
                <div>
                  <strong>从一本书开始</strong>
                  <p>你的阅读轨迹会慢慢长出来。</p>
                </div>
              </div>
            )}
            <div className="stat-row">
              <div>
                <strong>{stats.want}</strong>
                <span>想读</span>
              </div>
              <div>
                <strong>{stats.reading}</strong>
                <span>在读</span>
              </div>
              <div>
                <strong>{stats.finished}</strong>
                <span>读完</span>
              </div>
              <div>
                <strong>{stats.average}</strong>
                <span>均分</span>
              </div>
            </div>
          </div>
          <p className="hero-quote">
            <span>“</span>
            每一本读过的书，
            <br />
            都在悄悄重写我们。
          </p>
        </aside>
      </section>

      <section className="discover-section" id="discover">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <span />
              发现书籍
            </p>
            <h2>找到下一本书</h2>
            <p>从开放书目数据库中搜索，也可以手动记下一本特别的书。</p>
          </div>
          <form className="section-search" onSubmit={handleSearch}>
            <label htmlFor="section-book-search" className="sr-only">
              搜索书名、作者或 ISBN
            </label>
            <span aria-hidden="true">⌕</span>
            <input
              id="section-book-search"
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="书名、作者或 ISBN"
              autoComplete="off"
            />
            <button type="submit" disabled={searchState === "loading"}>
              {searchState === "loading" ? "搜索中…" : "搜索"}
            </button>
          </form>
        </div>

        {!online && (
          <div className="notice notice--offline" role="status">
            <span aria-hidden="true">○</span>
            你现在处于离线状态，仍可查看和编辑书架；联网后即可搜索新书。
          </div>
        )}

        <div id="search-results" className="search-results-anchor">
          {searchState === "idle" && (
            <div className="discovery-prompts">
              {[
                {
                  number: "01",
                  title: "按作者找",
                  copy: "输入一位熟悉的作者，看看还有哪些作品。",
                  query: "鲁迅",
                },
                {
                  number: "02",
                  title: "按主题逛",
                  copy: "从历史、旅行到科幻，顺着兴趣慢慢找。",
                  query: "中国历史",
                },
                {
                  number: "03",
                  title: "按 ISBN 查",
                  copy: "输入封底的数字，定位到更准确的版本。",
                  query: "9787536692930",
                },
              ].map((prompt) => (
                <button
                  className="prompt-card"
                  key={prompt.number}
                  onClick={() => {
                    setSearchQuery(prompt.query);
                    void runSearch(prompt.query);
                  }}
                >
                  <span>{prompt.number}</span>
                  <strong>{prompt.title}</strong>
                  <p>{prompt.copy}</p>
                  <i aria-hidden="true">→</i>
                </button>
              ))}
            </div>
          )}

          {searchState === "loading" && <SearchSkeleton />}

          {searchState === "success" && (
            <>
              <div className="results-heading">
                <p>
                  “{searchedTerm}”的搜索结果
                  <span>{searchResults.length} 本</span>
                </p>
                <small>部分新书或地区版本可能暂未收录</small>
              </div>
              <div className="search-grid">
                {searchResults.map((book) => {
                  const existing = books.find(
                    (item) =>
                      item.id === book.id ||
                      (item.isbn && book.isbn && item.isbn === book.isbn),
                  );
                  return (
                    <article className="search-card" key={book.id}>
                      <BookCover book={book} size="result" />
                      <div className="search-card__copy">
                        <div>
                          <p>
                            {yearText(book.publishedDate)}
                            {book.publisher
                              ? `${yearText(book.publishedDate) ? " · " : ""}${book.publisher}`
                              : ""}
                          </p>
                          <h3>{book.title}</h3>
                          <span>{authorsText(book.authors)}</span>
                        </div>
                        <button
                          className={existing ? "is-added" : ""}
                          onClick={() =>
                            existing ? openExistingBook(existing) : openNewBook(book)
                          }
                        >
                          <span aria-hidden="true">{existing ? "✓" : "＋"}</span>
                          {existing ? "已在书架" : "加入书架"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="manual-row">
                <p>没有看见你要找的版本？</p>
                <button onClick={openManualBook}>手动添加一本书 →</button>
              </div>
            </>
          )}

          {searchState === "empty" && (
            <div className="state-panel">
              <div className="state-mark" aria-hidden="true">
                ?
              </div>
              <h3>没有找到“{searchedTerm}”</h3>
              <p>试试更短的书名、作者或 ISBN，也可以直接手动添加。</p>
              <button className="button button--dark" onClick={openManualBook}>
                手动添加这本书
              </button>
            </div>
          )}

          {searchState === "error" && (
            <div className="state-panel" role="alert">
              <div className="state-mark" aria-hidden="true">
                !
              </div>
              <h3>{online ? "暂时无法搜索书籍" : "离线时不能搜索新书"}</h3>
              <p>
                {online
                  ? "公开书目服务可能正在忙，请稍后再试。"
                  : "你的书架和笔记仍然可以正常编辑。"}
              </p>
              <div className="state-actions">
                {online && (
                  <button
                    className="button button--dark"
                    onClick={() => void runSearch(searchedTerm)}
                  >
                    重新搜索
                  </button>
                )}
                <button className="button button--ghost" onClick={openManualBook}>
                  手动添加
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="shelf-section" id="shelf">
        <div className="section-heading shelf-heading">
          <div>
            <p className="eyebrow">
              <span />
              我的收藏
            </p>
            <h2>我的书架</h2>
            <p>
              {books.length
                ? `${books.length} 本书，组成你此刻的阅读生活。`
                : "从一本最近读过的书开始吧。"}
            </p>
          </div>
          <div className="shelf-tools">
            <label className="shelf-search">
              <span className="sr-only">搜索我的书架</span>
              <span aria-hidden="true">⌕</span>
              <input
                value={shelfQuery}
                onChange={(event) => setShelfQuery(event.target.value)}
                placeholder="搜索我的书架"
              />
            </label>
            <label className="sort-control">
              <span className="sr-only">排序方式</span>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
              >
                <option value="updated">最近更新</option>
                <option value="rating">评分最高</option>
                <option value="title">按书名</option>
              </select>
              <span aria-hidden="true">⌄</span>
            </label>
          </div>
        </div>

        {storageError && (
          <div className="notice notice--storage" role="alert">
            <span aria-hidden="true">!</span>
            浏览器暂时无法保存记录，请检查隐私或存储设置。
          </div>
        )}

        {hasDemoBooks && (
          <div className="demo-banner">
            <div>
              <span className="demo-label">示例书架</span>
              <p>先放了几本示例书，试试筛选、评分或写笔记。</p>
            </div>
            <button onClick={clearDemoBooks}>清空示例，开始我的书架</button>
          </div>
        )}

        <div className="filter-bar">
          <div className="filter-tabs" role="group" aria-label="按阅读状态筛选">
            {(
              [
                ["all", "全部", books.length],
                ["want", "想读", books.filter((book) => book.status === "want").length],
                [
                  "reading",
                  "在读",
                  books.filter((book) => book.status === "reading").length,
                ],
                [
                  "finished",
                  "读完",
                  books.filter((book) => book.status === "finished").length,
                ],
              ] as [ShelfFilter, string, number][]
            ).map(([value, label, count]) => (
              <button
                key={value}
                className={filter === value ? "is-active" : ""}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
                <span>{count}</span>
              </button>
            ))}
          </div>
          <p>
            平均评分
            <strong>{stats.average === "—" ? "暂无" : `${stats.average} / 5`}</strong>
          </p>
        </div>

        {storageReady && visibleBooks.length ? (
          <div className="shelf-grid">
            {visibleBooks.map((book, index) => (
              <article
                className="shelf-book"
                key={book.id}
                style={{ "--book-index": index } as React.CSSProperties}
              >
                {book.isDemo && <span className="demo-ribbon">示例</span>}
                <button
                  className="shelf-book__cover-button"
                  onClick={() => openExistingBook(book)}
                  aria-label={`查看并编辑《${book.title}》`}
                >
                  <BookCover book={book} />
                  <span className={`status-chip status-chip--${book.status}`}>
                    {STATUS_META[book.status].short}
                  </span>
                  <span className="book-edit" aria-hidden="true">
                    编辑 ↗
                  </span>
                </button>
                <div className="shelf-book__copy">
                  <p>{authorsText(book.authors)}</p>
                  <h3>
                    <button onClick={() => openExistingBook(book)}>{book.title}</button>
                  </h3>
                  <Stars value={book.rating} compact />
                </div>
              </article>
            ))}
            <button className="add-book-card" onClick={() => focusSearch()}>
              <span aria-hidden="true">＋</span>
              <strong>再加一本</strong>
              <small>去发现书籍</small>
            </button>
          </div>
        ) : storageReady ? (
          <div className="empty-shelf">
            <div className="empty-shelf__books" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <div>
              <h3>
                {shelfQuery
                  ? `书架里没有找到“${shelfQuery}”`
                  : filter === "all"
                    ? "你的书架还是空的"
                    : "这个分类里还没有书"}
              </h3>
              <p>
                {shelfQuery
                  ? "可以换个关键词，或去公开书目中找找。"
                  : "每一座书架，都从第一本书开始。"}
              </p>
              <div className="state-actions">
                {filter !== "all" && !shelfQuery && (
                  <button className="button button--ghost" onClick={() => setFilter("all")}>
                    查看全部书籍
                  </button>
                )}
                <button className="button button--dark" onClick={() => focusSearch()}>
                  搜索并添加书籍
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="shelf-loading" role="status">
            正在打开你的书架…
          </div>
        )}
      </section>

      <footer>
        <a className="brand brand--footer" href="#top">
          <span className="brand-mark" aria-hidden="true">
            书
          </span>
          <span>
            <strong>书屿</strong>
            <small>把读过的书，留在自己的书架上。</small>
          </span>
        </a>
        <div>
          <p>阅读记录保存在当前设备</p>
          <a href="https://openlibrary.org/" target="_blank" rel="noreferrer">
            书目数据来自 Open Library ↗
          </a>
        </div>
      </footer>

      {editorBook && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditor();
          }}
        >
          <section
            className="book-editor"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editor-title"
          >
            <div className="editor-topbar">
              <p>{editorIsNew ? "加入书架" : "编辑阅读记录"}</p>
              <button
                ref={dialogCloseRef}
                onClick={closeEditor}
                aria-label="关闭编辑窗口"
              >
                ×
              </button>
            </div>

            <div className="editor-identity">
              <BookCover book={editorBook} size="editor" />
              <div>
                {editorBook.source === "manual" ? (
                  <>
                    <label className="field field--title">
                      <span>书名</span>
                      <input
                        value={editorBook.title}
                        onChange={(event) => updateDraft({ title: event.target.value })}
                        placeholder="这本书叫什么？"
                        autoFocus
                      />
                    </label>
                    <label className="field">
                      <span>作者</span>
                      <input
                        value={editorBook.authors.join("、")}
                        onChange={(event) =>
                          updateDraft({ authors: event.target.value.split(/[、,，]/) })
                        }
                        placeholder="作者姓名"
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <span className="editor-source">
                      {editorBook.source === "openlibrary"
                        ? "Open Library 书目"
                        : "示例书目"}
                    </span>
                    <h2 id="editor-title">{editorBook.title}</h2>
                    {editorBook.subtitle && <p>{editorBook.subtitle}</p>}
                    <strong>{authorsText(editorBook.authors)}</strong>
                    <small>
                      {[editorBook.publisher, yearText(editorBook.publishedDate)]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </>
                )}
              </div>
            </div>

            <div className="editor-form">
              <fieldset>
                <legend>阅读状态</legend>
                <div className="status-picker">
                  {(Object.keys(STATUS_META) as ReadingStatus[]).map((status) => (
                    <button
                      type="button"
                      key={status}
                      className={editorBook.status === status ? "is-active" : ""}
                      aria-pressed={editorBook.status === status}
                      onClick={() => chooseDraftStatus(status)}
                    >
                      <span>{STATUS_META[status].label}</span>
                      <small>{STATUS_META[status].description}</small>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>我的评分</legend>
                <div
                  className="rating-picker"
                  role="radiogroup"
                  aria-label="为这本书评分"
                  onKeyDown={handleRatingKeys}
                >
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={editorBook.rating === rating}
                      aria-label={`${rating} 星，${RATING_LABELS[rating]}`}
                      className={
                        editorBook.rating && rating <= editorBook.rating
                          ? "is-active"
                          : ""
                      }
                      key={rating}
                      onClick={() =>
                        updateDraft({
                          rating: editorBook.rating === rating ? null : rating,
                        })
                      }
                    >
                      ★
                    </button>
                  ))}
                  <span>
                    {editorBook.rating
                      ? RATING_LABELS[editorBook.rating]
                      : "点亮星星，为它评分"}
                  </span>
                </div>
              </fieldset>

              <div className="date-row">
                <label className="field">
                  <span>开始阅读</span>
                  <input
                    type="date"
                    value={editorBook.startedAt ?? ""}
                    onChange={(event) =>
                      updateDraft({ startedAt: event.target.value || undefined })
                    }
                  />
                </label>
                <label className="field">
                  <span>读完日期</span>
                  <input
                    type="date"
                    value={editorBook.finishedAt ?? ""}
                    onChange={(event) =>
                      updateDraft({ finishedAt: event.target.value || undefined })
                    }
                  />
                </label>
              </div>

              <label className="field field--note">
                <span>
                  留下一句话
                  <small>{editorBook.note.length} / 500</small>
                </span>
                <textarea
                  value={editorBook.note}
                  maxLength={500}
                  onChange={(event) => updateDraft({ note: event.target.value })}
                  placeholder="这本书给你留下了什么？摘一句话，或写下此刻的感受。"
                />
              </label>
            </div>

            <div className="editor-actions">
              {!editorIsNew ? (
                confirmRemove ? (
                  <div className="remove-confirm">
                    <p>评分和笔记也会一起删除。</p>
                    <button onClick={() => setConfirmRemove(false)}>取消</button>
                    <button onClick={removeBook}>确认移出</button>
                  </div>
                ) : (
                  <button className="remove-button" onClick={() => setConfirmRemove(true)}>
                    移出书架
                  </button>
                )
              ) : (
                <span />
              )}
              <div>
                <button className="button button--ghost" onClick={closeEditor}>
                  取消
                </button>
                <button className="button button--dark" onClick={saveBook}>
                  {editorIsNew ? "收进书架" : "保存记录"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      <div className={`toast ${toast ? "is-visible" : ""}`} aria-live="polite">
        <span aria-hidden="true">✓</span>
        {toast}
      </div>
    </main>
  );
}
