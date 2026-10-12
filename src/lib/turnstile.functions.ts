import { createServerFn } from "@tanstack/react-start";

export const verifyTurnstileToken = createServerFn({ method: "POST" })
  .validator((token: string) => token)
  .handler(async ({ data: token }): Promise<{ success: boolean; error?: string }> => {
    if (!token) {
      return { success: false, error: "Missing CAPTCHA token." };
    }

    // Use environment variable or fallback to Cloudflare dummy secret key for testing
    const secretKey =
      process.env["TURNSTILE_SECRET_KEY"] || "1x0000000000000000000000000000000AA";

    try {
      const response = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            secret: secretKey,
            response: token,
          }),
        }
      );

      const outcome = await response.json();
      console.log("[Turnstile Server Verification Result]:", outcome);

      if (!outcome.success) {
        return {
          success: false,
          error: outcome["error-codes"]?.join(", ") || "Turnstile verification failed.",
        };
      }

      return { success: true };
    } catch (err) {
      console.error("Cloudflare siteverify error:", err);
      return {
        success: false,
        error: "Failed to connect to CAPTCHA verification server.",
      };
    }
  });