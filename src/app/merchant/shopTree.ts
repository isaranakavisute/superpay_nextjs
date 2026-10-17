import type { ViewableShop } from "@/lib/portal";

const NB = " ";

/**
 * Dropdown labels that draw the shop tree (├─ └─ │). `shops` is in tree order (parent, then its children, depth-first)
 * with each shop's depth. Non-breaking spaces: browsers collapse ordinary leading spaces in <option> text.
 */
export function treeLabels(shops: ViewableShop[]): Map<number, string> {
  const base = Math.min(...shops.map((s) => s.depth));
  const lastAt = (i: number) => {
    // Last among its siblings: no later shop at the same depth before one shallower than it.
    for (let j = i + 1; j < shops.length; j += 1) {
      if (shops[j].depth < shops[i].depth) return true;
      if (shops[j].depth === shops[i].depth) return false;
    }
    return true;
  };
  const out = new Map<number, string>();
  const open: boolean[] = []; // per level: does a line continue below (the ancestor at that level has later siblings)?
  shops.forEach((s, i) => {
    const d = s.depth - base;
    const last = lastAt(i);
    const prefix = d === 0 ? "" : open.slice(1, d).map((o) => (o ? `│${NB}${NB}${NB}` : `${NB}${NB}${NB}${NB}`)).join("") + (last ? "└─" : "├─") + NB;
    open[d] = !last;
    open.length = d + 1;
    out.set(s.id, prefix + s.name);
  });
  return out;
}
