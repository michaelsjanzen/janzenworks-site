/**
 * Unit tests for extractCitations in src/lib/aeo.ts.
 */
import { describe, it, expect } from "vitest";
import { extractCitations } from "@/lib/aeo";

describe("extractCitations", () => {
  it("returns empty array for content with no links", () => {
    expect(extractCitations("Just plain text with no links.")).toEqual([]);
  });

  it("extracts a single external link", () => {
    const md = "Read more at [Wikipedia](https://en.wikipedia.org/wiki/Pottery).";
    expect(extractCitations(md)).toEqual([
      { url: "https://en.wikipedia.org/wiki/Pottery", name: "Wikipedia" },
    ]);
  });

  it("extracts multiple external links", () => {
    const md = "See [MDN](https://developer.mozilla.org) and [W3C](https://www.w3c.org).";
    expect(extractCitations(md)).toEqual([
      { url: "https://developer.mozilla.org", name: "MDN" },
      { url: "https://www.w3c.org", name: "W3C" },
    ]);
  });

  it("deduplicates repeated links", () => {
    const md = "[Foo](https://example.com) and again [Bar](https://example.com).";
    const result = extractCitations(md);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://example.com");
    // First occurrence wins for the name
    expect(result[0].name).toBe("Foo");
  });

  it("does not extract image links (![alt](url))", () => {
    const md = "![Hero image](https://example.com/image.jpg) and [link](https://example.com/page).";
    const result = extractCitations(md);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://example.com/page");
  });

  it("does not extract relative links", () => {
    const md = "Visit [About](/about) and [Home](/) for more.";
    expect(extractCitations(md)).toEqual([]);
  });

  it("does not extract anchor links", () => {
    const md = "Jump to [section](#introduction).";
    expect(extractCitations(md)).toEqual([]);
  });

  it("extracts https and http links", () => {
    const md = "[Secure](https://example.com) and [Legacy](http://old.example.com).";
    expect(extractCitations(md)).toEqual([
      { url: "https://example.com", name: "Secure" },
      { url: "http://old.example.com", name: "Legacy" },
    ]);
  });

  it("handles links inside a paragraph with surrounding text", () => {
    const md = "This [study](https://pubmed.ncbi.nlm.nih.gov/12345) shows that ceramics are durable.";
    expect(extractCitations(md)).toEqual([
      { url: "https://pubmed.ncbi.nlm.nih.gov/12345", name: "study" },
    ]);
  });
});
