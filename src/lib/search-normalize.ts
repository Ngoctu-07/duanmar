/**
 * Accent/case folding for search matching, shared by the site-wide `/search`
 * page (`search-client`) and tour filtering (`tour-search`) so both surfaces
 * rank "Ha Noi"/"Hà Nội"/"hà lò" identically.
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, (c) => (c === "đ" ? "d" : "D"))
    .toLowerCase();
}
