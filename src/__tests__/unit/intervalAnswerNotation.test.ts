import { describe, expect, it } from "vitest";
import { intervalAnswerKey } from "@/lib/import/schoolTextbook/intervalAnswerNotation";
describe("exact one-variable domain notation", () => {
  it.each([
    ["0<a<1 또는 1<a<\\frac{3}{2}", "0<a<1 또는 1<a<1.5"],
    ["\\frac{1}{2}<x<1 또는 x>1", "x>1/2,x\\ne1"],
    ["2/3<x<1 또는 x>1", "x>\\frac{2}{3},x\\neq1"],
    ["x>7", "7<x"],
    ["x>0,x>1", "x>1"],
    ["x>=1,x<=2,x!=1", "1<x<=2"],
    ["x<=0 또는 x>0", "x<1 또는 x>=1"],
    ["1>x>0", "0<x<1"],
    ["x>0,x!=2,x!=1", "0<x<1 또는 1<x<2 또는 x>2"],
  ])("accepts complete ranges %s", (a, b) => {
    expect(intervalAnswerKey(a)).not.toBeNull();
    expect(intervalAnswerKey(a)).toEqual(intervalAnswerKey(b));
  });
  it.each([
    ["x>1/2,x!=1", "x>1/2"],
    ["x>=1", "x>1"],
    ["x>1/2", "y>1/2"],
    ["0<x<1 또는 x>1", "0<x<=1 또는 x>1"],
    ["x>1", "x>2"],
    ["x>=1,x<=1", "x>1,x<1"],
  ])("preserves endpoints and exclusions %s", (a, b) => {
    expect(intervalAnswerKey(a)).not.toEqual(intervalAnswerKey(b));
  });
  it.each([
    "x>y",
    "x>1,y>2",
    "x>1cm",
    "x>1/0",
    "x>1/(2)",
    "x!=1",
    "(1) x>2 (2) x>3",
    "x>sqrt(2)",
    "(0,1)",
    "x>1 또는",
    "x>",
    `x>${"1".repeat(101)}`,
  ])("rejects unsupported notation %s", (input) => {
    expect(intervalAnswerKey(input)).toBeNull();
  });
});
