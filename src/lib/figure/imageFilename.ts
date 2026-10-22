/** 저장 시각(로컬, yyyymmddhhss)과 6자리 난수. 같은 파일명은 브라우저가 (1), (2) 등을 붙여 저장한다. */
export function pngFilename(): string {
  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
    now.getHours(),
    now.getSeconds(),
  ].map((value) => String(value).padStart(2, "0")).join("");
  const random = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  return `${timestamp}_${random}.png`;
}
