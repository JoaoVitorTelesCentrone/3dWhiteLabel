export function firstProductionLoadError<T>(...errors: Array<T | null | undefined>): T | null {
  return errors.find((error): error is T => Boolean(error)) ?? null;
}
