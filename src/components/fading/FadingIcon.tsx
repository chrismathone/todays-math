export function FadingIcon({
  name,
}: {
  name: "home" | "erase" | "list" | "stats" | "arrow" | "book";
}) {
  const paths = {
    home: "M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9",
    erase: "m4 15 9-11 8 7-8 10H9l-5-6ZM9 9l8 7M13 21h8",
    list: "M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1",
    stats: "M4 20h17M7 16V9M12 16V4M17 16v-5",
    arrow: "M4 12h16m-6-6 6 6-6 6",
    book: "M12 5v16M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2V4Z",
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
