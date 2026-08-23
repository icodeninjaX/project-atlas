const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function offlineEntityId(formData: FormData) {
  const value = String(formData.get("offlineEntityId") ?? "");
  return uuidPattern.test(value) ? value : undefined;
}
