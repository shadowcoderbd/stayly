type Primitive = string | number | boolean | null | undefined;

export function buildQueryString(params: Record<string, Primitive | Primitive[]>) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) value.forEach((v) => v != null && qs.append(key, String(v)));
    else qs.set(key, String(value));
  }
  const str = qs.toString();
  return str ? `?${str}` : "";
}
