/** Formats a count with the correct singular/plural noun, e.g. `pluralize(1, "page")` → "1 page". */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
