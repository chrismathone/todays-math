import { expect, it } from "vitest";
import { validateLatex } from "mathlive/ssr";
import { FIGURE_MATH_TEMPLATES } from "@/components/unified/figure-editor/figureMathTemplates";
import { typesetLabel } from "@/lib/figure/mathjaxLabel";

it.each(FIGURE_MATH_TEMPLATES.flatMap((group) => group.items.map(([name, template]) => [group.name, name, template] as const)))
  ("%s · %s 틀은 칸을 채우면 저장용 MathJax로 조판된다", (_group, _name, template) => {
    const result = typesetLabel(`$${template.replaceAll("#?", "2")}$`);
    expect(validateLatex(template.replaceAll("#?", "2"))).toEqual([]);
    expect(result).not.toBeNull();
    expect(result!.inner).not.toMatch(/data-mml-node="merror"|data-mjx-error/);
    expect(result!.widthEm).toBeGreaterThan(0);
  });
