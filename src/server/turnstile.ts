import { createServerFn } from "@tanstack/react-start";

export const verifyTurnstileToken = createServerFn({ method: "POST" })
  .validator((token: string) => token)
  .handler(async ({ data: token }): Promise<{ success: boolean; error?: string }> => {
    if (!token) {
      return { success: false, error: "Missing CAPTCHA token." };
    }

    const secretKey = process.env['TURNSTILE_SECRET_KEY'];
    if (!secretKey) {
      console.error("TURNSTILE_SECRET_KEY is not defined in server environment variables.");
      return { success: false, error: "Server configuration error." };
    }

    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);

    try {
      const response = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          body: formData,
        }
      );

      const outcome = await response.json();

      if (!outcome.success) {
        return {
          success: false,
          error: "Turnstile verification failed. Please try again.",
        };
      }

      return { success: true };
    } catch (err) {
      console.error("Cloudflare siteverify error:", err);
      return { success: false, error: "Failed to verify CAPTCHA with Cloudflare." };
    }
  });