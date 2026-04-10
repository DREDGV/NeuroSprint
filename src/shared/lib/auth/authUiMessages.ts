export function toAuthUiError(error: unknown, fallback: string): string {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  const message = rawMessage.toLowerCase();

  if (!message) {
    return fallback;
  }

  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid_credentials") ||
    message.includes("email not confirmed")
  ) {
    return "Проверьте email и пароль, затем попробуйте ещё раз.";
  }

  if (message.includes("user already registered")) {
    return "Аккаунт с таким email уже существует. Попробуйте войти или восстановить пароль.";
  }

  if (message.includes("password should be at least") || message.includes("weak password")) {
    return "Пароль слишком короткий. Используйте не меньше 8 символов.";
  }

  if (
    message.includes("email rate limit exceeded") ||
    message.includes("over_email_send_rate_limit") ||
    message.includes("rate limit")
  ) {
    return "Слишком много писем за короткое время. Подождите немного и попробуйте снова.";
  }

  if (
    message.includes("invalid email") ||
    message.includes("email address") ||
    message.includes("unable to validate email")
  ) {
    return "Проверьте email и попробуйте ещё раз.";
  }

  if (
    message.includes("auth session missing") ||
    message.includes("jwt") ||
    message.includes("token")
  ) {
    return "Ссылка для восстановления устарела. Запросите письмо ещё раз.";
  }

  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("fetch failed")
  ) {
    return "Не удалось связаться с сервисом аккаунтов. Проверьте интернет и повторите попытку.";
  }

  return rawMessage || fallback;
}
