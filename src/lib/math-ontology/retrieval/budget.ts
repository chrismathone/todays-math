type CatalogRow = Record<string, string>;
const normalized = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
/** Relevance precedes namespace/opaque identity. A short broad search term must
 * not displace an available longer phrase from the same request. */
export function rankOntologySeeds(rows: readonly CatalogRow[], terms: readonly string[], preferredNamespaces: readonly string[], limit: number) {
  const queries = [...new Set(terms.map(normalized).filter(Boolean))];
  const rank = (row: CatalogRow) => {
    const label = normalized(row.label ?? "");
    const matches = queries.filter(term => label.includes(term));
    const specificity = Math.max(0, ...matches.map(term => term.length));
    return [specificity, matches.some(term => term.length === specificity && term === label) ? 1 : 0];
  };
  const namespace = (value: string) => { const i = preferredNamespaces.indexOf(value); return i < 0 ? preferredNamespaces.length : i; };
  return [...new Map(rows.map(row => [row.entity, row])).values()].sort((a, b) => {
    const ar = rank(a), br = rank(b);
    return br[0] - ar[0] || br[1] - ar[1] || namespace(a.namespace) - namespace(b.namespace) || a.entity.localeCompare(b.entity);
  }).slice(0, limit);
}
/** Alternate each ranked seed with an incoming witness before considering more
 * witnesses for that seed. An assessment fan-in cannot evict all seed nodes. */
export function ontologySeedFrontier(seeds: readonly string[], incoming: ReadonlyMap<string, readonly string[]>, limit: number) {
  const ordered: string[] = [];
  for (const seed of seeds) { ordered.push(seed); const first = incoming.get(seed)?.[0]; if (first) ordered.push(first); }
  for (let round = 1; round < limit; round++) for (const seed of seeds) { const id = incoming.get(seed)?.[round]; if (id) ordered.push(id); }
  return [...new Set(ordered)].slice(0, limit);
}
/** Allocate a fixed budget across producers, retaining explicitly checked bridge
 * witnesses first. Every id still comes from the authorized closed query. */
export function fairOntologyBudget(groups: readonly (readonly string[])[], limit: number, priority: readonly string[] = []) {
  const selected = new Set<string>();
  const add = (id: string) => { if (selected.size < limit) selected.add(id); };
  for (const id of priority) add(id);
  const longest = Math.max(0, ...groups.map(group => group.length));
  for (let index = 0; index < longest && selected.size < limit; index++) for (const group of groups) { const id = group[index]; if (id) add(id); }
  return [...selected];
}
