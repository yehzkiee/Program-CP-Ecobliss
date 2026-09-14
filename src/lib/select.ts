/** Normalize Select onValueChange which may pass null */
export function setOrEmpty(
  setter: (v: string) => void,
): (value: string | null) => void {
  return (value) => setter(value ?? "");
}
