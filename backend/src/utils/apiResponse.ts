export function success<T>(data: T, message = "OK") {
  return { success: true, message, data };
}

export function failure(message: string, details?: unknown) {
  return { success: false, message, details };
}
