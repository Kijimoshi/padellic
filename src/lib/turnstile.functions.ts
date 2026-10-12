import { createServerFn } from "@tanstack/react-start";

export const verifyTurnstileToken = createServerFn({ method: "POST" })
  .validator((token: string) => token)
  .handler(async ({ data: token }): Promise<{ success: boolean; error?: string }> => {
    if (!token) {
      return { success: false, error: "Missing CAPTCHA token." };
    }

    // Retrieve key strictly from environment variables
    const secretKey = process.env['TURNSTILE_SECRET_KEY'];

    if (!secretKey) {
      console.error(
        "[Turnstile Verification Error]: TURNSTILE_SECRET_KEY is missing from environment variables."
      );
      return {
        success: false,
        error: "Server configuration error: missing Turnstile secret key.",
      };
    }

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

      const outcome = (await response.json()) as {
        success: boolean;
        "error-codes"?: string[];
      };

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