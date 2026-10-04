// Next's global types are not loaded here (next/* is replaced by local adapters).
declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
