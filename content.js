(() => {
  "use strict";

  const ATTRIBUTE = "data-gr-classic-challenge";
  const SUMMARY_ID = "gr-classic-challenge-summary";
  const RETRY_LIMIT = 30;
  let retryCount = 0;
  let scheduled = false;

  function normaliseText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function findByText(selector, pattern, root = document) {
    return [...root.querySelectorAll(selector)].find((element) =>
      pattern.test(normaliseText(element.textContent))
    );
  }

  function findBookList() {
    const labelledList = document.querySelector('ul[aria-label^="Books read list"]');
    if (labelledList) return labelledList;

    const heading = findByText("h2", /^Books read\s*\([\d,]+\)$/i);
    return heading?.closest("section")?.querySelector("ul") || null;
  }

  function isChallengePage() {
    return /^\/readingchallenges\/(?:gr\/)?annual(?:\/|$)/.test(window.location.pathname);
  }

  function resetLayout() {
    document.getElementById(SUMMARY_ID)?.remove();
    for (const suffix of ["hidden", "content", "books", "grid", "layout", "layout-shell"]) {
      const attribute = `${ATTRIBUTE}-${suffix}`;
      for (const element of document.querySelectorAll(`[${attribute}]`)) {
        element.removeAttribute(attribute);
      }
    }
    document.documentElement.removeAttribute(ATTRIBUTE);
  }

  function updateText(element, value) {
    if (element && element.textContent !== value) element.textContent = value;
  }

  function booksTitle(details) {
    return details.owner ? `${details.year} BOOKS` : `YOUR ${details.year} BOOKS`;
  }

  function extractYear(value) {
    return normaliseText(value).match(/\b(20\d{2})\b/)?.[1] || null;
  }

  function readChallengeYear() {
    const url = new URL(window.location.href);
    for (const parameter of ["challenge_year", "year", "challengeYear"]) {
      const year = extractYear(url.searchParams.get(parameter));
      if (year) return year;
    }

    const pathYear = url.pathname.match(/\/annual\/(20\d{2})(?:\/|$)/)?.[1];
    if (pathYear) return pathYear;

    const candidates = document.querySelectorAll(
      [
        'img[alt*="Reading Challenge"]',
        "select option:checked",
        '[aria-selected="true"]',
        '[aria-current="true"]',
        "h1",
        "h2"
      ].join(",")
    );

    for (const element of candidates) {
      if (element.closest(`#${SUMMARY_ID}`)) continue;
      const year = extractYear(element.getAttribute("alt") || element.textContent);
      if (year) return year;
    }

    return (
      extractYear(document.querySelector('meta[property="og:title"]')?.content) ||
      extractYear(document.title) ||
      String(new Date().getFullYear())
    );
  }

  function readChallengeOwner(bookList) {
    const contentRoot = bookList.closest(".goodreads-children") || document;
    const ignoredHeading = [
      /^Challenge details$/i,
      /^(?:20\d{2}\s+)?Reading Challenge$/i,
      /^YOUR 20\d{2} BOOKS$/i,
      /^Books read\b/i,
      /\bachievements?\b/i
    ];

    for (const heading of contentRoot.querySelectorAll("h1,h2,h3")) {
      if (heading.closest(`#${SUMMARY_ID}`)) continue;
      const text = normaliseText(heading.textContent);
      if (
        text &&
        text.length <= 80 &&
        !ignoredHeading.some((pattern) => pattern.test(text))
      ) {
        return text;
      }
    }

    return null;
  }

  function readChallengeDetails(bookList) {
    const progressText = normaliseText(
      findByText("strong", /^[\d,]+\s+of\s+[\d,]+\s+books?\s+read$/i)?.textContent
    );
    const progressMatch = progressText.match(/([\d,]+)\s+of\s+([\d,]+)\s+books?\s+read/i);

    const booksHeading = findByText("h2", /^Books read\s*\([\d,]+\)$/i);
    const headingMatch = normaliseText(booksHeading?.textContent).match(/\(([\d,]+)\)/);
    const coverCount = bookList.querySelectorAll('[data-testid="book-cover"]').length;
    const visibleBookCount =
      coverCount || bookList.querySelectorAll(".BookCard__cover").length;

    return {
      read: progressMatch?.[1] || headingMatch?.[1] || String(visibleBookCount),
      goal: progressMatch?.[2] || null,
      year: readChallengeYear(),
      owner: readChallengeOwner(bookList),
      booksHeading
    };
  }

  function progressSentence(details) {
    const currentYear = details.year === String(new Date().getFullYear());
    const verb = details.owner
      ? `${details.owner} ${currentYear ? "has read" : "read"}`
      : `You ${currentYear ? "have read" : "read"}`;
    return details.goal
      ? `${verb} ${details.read} of ${details.goal} books in ${details.year}.`
      : `${verb} ${details.read} books in ${details.year}.`;
  }

  function createSummary(details) {
    const summary = document.createElement("div");
    summary.id = SUMMARY_ID;
    summary.setAttribute("role", "region");
    summary.setAttribute("aria-label", "Reading challenge progress");

    const progressRow = document.createElement("div");
    progressRow.className = "gr-classic-progress-row";

    const badge = document.createElement("span");
    badge.className = "gr-classic-badge";
    badge.setAttribute("aria-hidden", "true");
    const book = document.createElement("span");
    book.className = "gr-classic-badge-book";
    badge.append(book);

    const progress = document.createElement("p");
    progress.className = "gr-classic-progress";
    progress.textContent = progressSentence(details);

    progressRow.append(badge, progress);

    const divider = document.createElement("hr");
    divider.className = "gr-classic-divider";

    const heading = document.createElement("h1");
    heading.className = "gr-classic-books-heading";
    heading.textContent = booksTitle(details);

    summary.append(progressRow, divider, heading);
    return summary;
  }

  function markUnneededContent(contentRoot, booksSection) {
    const pageHeading = findByText("h1", /^Challenge details$/i, contentRoot);
    if (pageHeading && pageHeading.id !== SUMMARY_ID) {
      pageHeading.setAttribute(`${ATTRIBUTE}-hidden`, "");
    }

    for (const section of contentRoot.querySelectorAll("section")) {
      if (
        section !== booksSection &&
        !section.contains(booksSection) &&
        !booksSection.contains(section)
      ) {
        section.setAttribute(`${ATTRIBUTE}-hidden`, "");
      }
    }
  }

  function applyClassicLayout() {
    if (!isChallengePage()) {
      resetLayout();
      return true;
    }

    const bookList = findBookList();
    if (!bookList) {
      resetLayout();
      return false;
    }

    const booksSection = bookList.closest("section") || bookList.parentElement;
    const contentRoot =
      bookList.closest(".goodreads-children") || booksSection?.parentElement;
    if (!booksSection || !contentRoot) return false;

    const details = readChallengeDetails(bookList);

    contentRoot.setAttribute(`${ATTRIBUTE}-content`, "");
    booksSection.setAttribute(`${ATTRIBUTE}-books`, "");
    bookList.setAttribute(`${ATTRIBUTE}-grid`, "");
    details.booksHeading?.setAttribute(`${ATTRIBUTE}-hidden`, "");

    const layout = contentRoot.closest(".NoSiderailLayout__content");
    layout?.setAttribute(`${ATTRIBUTE}-layout`, "");
    layout?.parentElement?.setAttribute(`${ATTRIBUTE}-layout-shell`, "");

    markUnneededContent(contentRoot, booksSection);

    let summary = document.getElementById(SUMMARY_ID);
    if (!summary) {
      summary = createSummary(details);
      booksSection.before(summary);
    } else {
      const progress = summary.querySelector(".gr-classic-progress");
      const heading = summary.querySelector(".gr-classic-books-heading");
      updateText(progress, progressSentence(details));
      updateText(heading, booksTitle(details));
      if (summary.nextElementSibling !== booksSection) booksSection.before(summary);
    }

    document.documentElement.setAttribute(ATTRIBUTE, "ready");
    return true;
  }

  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(() => {
      scheduled = false;
      const applied = applyClassicLayout();
      if (!applied && retryCount < RETRY_LIMIT) {
        retryCount += 1;
        window.setTimeout(scheduleApply, 500);
      }
    }, 50);
  }

  document.documentElement.setAttribute(ATTRIBUTE, "loading");
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => !document.getElementById(SUMMARY_ID)?.contains(mutation.target))) {
      scheduleApply();
    }
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["aria-current", "aria-selected"],
    characterData: true,
    childList: true,
    subtree: true
  });
  window.addEventListener("popstate", scheduleApply);
  scheduleApply();
})();
