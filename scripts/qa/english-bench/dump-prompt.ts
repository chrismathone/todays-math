/** 오늘의 영어 모델 벤치 — 과제 하나의 제품 프롬프트를 파일로 떨군다(수동 재현용). `--task A-original --out <폴더>` */
import { writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildEnglishSystemPrompt,
  buildEnglishUserPrompt,
} from "@/lib/ai/prompts/englishExam";

import { BENCH_TASKS } from "./tasks";
import { flag } from "./util";

const task = BENCH_TASKS.find((t) => t.id === (flag("--task") ?? "A-original"));
const out = flag("--out") ?? ".";
if (!task) throw new Error("과제 없음");
writeFileSync(path.join(out, "p-sys.txt"), buildEnglishSystemPrompt(), "utf8");
writeFileSync(
  path.join(out, "p-user.txt"),
  buildEnglishUserPrompt(task.request, task.grade),
  "utf8",
);
