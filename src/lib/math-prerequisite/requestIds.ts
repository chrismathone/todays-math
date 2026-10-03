/** Allocate once per request; retrying the revision CAS reuses the same IDs. */
export function requestIdAllocator(newId: () => string) {
  const ids: string[] = [];
  return () => {
    let index = 0;
    return () => {
      ids[index] ??= newId();
      return ids[index++];
    };
  };
}
