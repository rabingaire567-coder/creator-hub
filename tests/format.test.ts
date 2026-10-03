import { describe, expect, test } from "bun:test";
import {
  DEFAULT_STATS,
  extractYouTubeId,
  formatDate,
  isValidHttpUrl,
  parseJsonArray,
  readingTime,
  slugify,
  timeAgo,
  truncate,
  youtubeThumb,
} from "../src/lib/format";

describe("slugify", () => {
  test("lowercases and hyphenates", () => {
    expect(slugify("Why Explanations Matter!")).toBe(
      "why-explanations-matter",
    );
  });
  test("trims surrounding whitespace and stray hyphens", () => {
    expect(slugify("  Hello World  ")).toBe("hello-world");
    expect(slugify("--hello--world--")).toBe("hello-world");
  });
  test("caps length at 96 characters", () => {
    expect(slugify("a".repeat(200))).toHaveLength(96);
  });
  test("empty input stays empty", () => {
    expect(slugify("")).toBe("");
  });
});

describe("extractYouTubeId", () => {
  const id = "dQw4w9WgXcQ";
  test("watch URL", () => {
    expect(extractYouTubeId(`https://www.youtube.com/watch?v=${id}`)).toBe(id);
  });
  test("short URL", () => {
    expect(extractYouTubeId(`https://youtu.be/${id}`)).toBe(id);
  });
  test("shorts URL", () => {
    expect(extractYouTubeId(`https://www.youtube.com/shorts/${id}`)).toBe(id);
  });
  test("embed URL", () => {
    expect(extractYouTubeId(`https://www.youtube.com/embed/${id}`)).toBe(id);
  });
  test("bare 11-char id", () => {
    expect(extractYouTubeId(id)).toBe(id);
  });
  test("non-YouTube URL returns undefined", () => {
    expect(extractYouTubeId("https://example.com/video")).toBeUndefined();
  });
  test("undefined input returns undefined", () => {
    expect(extractYouTubeId(undefined)).toBeUndefined();
  });
});

describe("youtubeThumb", () => {
  test("builds the hqdefault URL", () => {
    expect(youtubeThumb("abc123")).toBe(
      "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
    );
  });
  test("undefined input passes through", () => {
    expect(youtubeThumb(undefined)).toBeUndefined();
  });
});

describe("readingTime", () => {
  test("never below one minute", () => {
    expect(readingTime("")).toBe(1);
    expect(readingTime("few words only")).toBe(1);
  });
  test("uses ~200 words per minute", () => {
    expect(readingTime(Array(400).fill("word").join(" "))).toBe(2);
  });
});

describe("parseJsonArray", () => {
  const fallback = ["fallback"];
  test("parses a valid JSON array string", () => {
    expect(parseJsonArray('[{"label":"YouTube"}]', [])).toEqual([
      { label: "YouTube" },
    ]);
  });
  test("returns fallback for malformed JSON", () => {
    expect(parseJsonArray("not json", fallback)).toEqual(fallback);
  });
  test("returns fallback when JSON is not an array", () => {
    expect(parseJsonArray('{"a":1}', fallback)).toEqual(fallback);
  });
  test("passes arrays through untouched", () => {
    expect(parseJsonArray([1, 2], [])).toEqual([1, 2]);
  });
  test("returns fallback for other value types", () => {
    expect(parseJsonArray(42, fallback)).toEqual(fallback);
  });
});

describe("truncate", () => {
  test("leaves short text alone", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });
  test("caps length and adds an ellipsis", () => {
    const result = truncate("x".repeat(50), 10);
    expect(result.length).toBeLessThanOrEqual(10);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("isValidHttpUrl", () => {
  test("accepts http and https", () => {
    expect(isValidHttpUrl("https://rabingaire.com")).toBe(true);
    expect(isValidHttpUrl("http://example.com/path?q=1")).toBe(true);
  });
  test("rejects other schemes and junk", () => {
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isValidHttpUrl("not a url")).toBe(false);
    expect(isValidHttpUrl("")).toBe(false);
  });
});

describe("formatDate / timeAgo", () => {
  test("empty for missing timestamps", () => {
    expect(formatDate(undefined)).toBe("");
    expect(timeAgo(undefined)).toBe("");
    expect(formatDate(0)).toBe("");
  });
  test("formats a midday UTC timestamp without day drift", () => {
    expect(formatDate(Date.UTC(2024, 0, 15, 12))).toBe("Jan 15, 2024");
  });
  test("fresh timestamps read as just now", () => {
    expect(timeAgo(Date.now())).toBe("just now");
  });
  test("two hours ago", () => {
    expect(timeAgo(Date.now() - 2 * 60 * 60 * 1000)).toBe("2h ago");
  });
});

describe("DEFAULT_STATS", () => {
  test("ships four labelled counters", () => {
    expect(DEFAULT_STATS).toHaveLength(4);
    for (const stat of DEFAULT_STATS) {
      expect(stat.label.length).toBeGreaterThan(0);
      expect(stat.value.length).toBeGreaterThan(0);
    }
  });
});
