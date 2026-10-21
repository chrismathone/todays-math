import { freemem } from "node:os";
import { execFileSync } from "node:child_process";

export function memoryGate(stage) {
  const freeGiB = freemem() / 2 ** 30;
  const processes =
    process.platform === "win32"
      ? execFileSync(
          "powershell",
          [
            "-NoProfile",
            "-Command",
            "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'tsc.*--noEmit' } | Select-Object -ExpandProperty ProcessId",
          ],
          { encoding: "utf8" },
        ).trim()
      : execFileSync("ps", ["-axo", "comm,args"], { encoding: "utf8" })
          .split("\n")
          .filter(
            (line) =>
              /^(?:node|\S*\/node)\s/.test(line) &&
              /(?:typescript\/bin\/tsc|tsc).*--noEmit/.test(line),
          )
          .join("\n");
  console.log(
    `${stage}: available ${freeGiB.toFixed(2)} GiB; other tsc: ${processes ? "yes" : "no"}`,
  );
  if (freeGiB < 3 || processes)
    throw new Error("3GiB 이상 · 다른 tsc 없음 조건을 기다립니다.");
}

if (process.argv[1]?.endsWith("memory-gate.mjs"))
  memoryGate(process.argv[2] ?? "check");
