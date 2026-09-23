import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

const NONCE_COOKIE = "google_nonce";

/**
 * Issues a nonce for the Google sign-in flow. The raw value is stored in a
 * cookie; Google embeds a SHA-256 hash of it in the ID token so the callback
 * can prove the token was minted for this login attempt.
 */
export async function GET() {
  const nonce = randomBytes(32).toString("base64url");
  const hashedNonce = createHash("sha256").update(nonce).digest("hex");

  const response = NextResponse.json({ nonce: hashedNonce });
  response.cookies.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: true,
    // Google posts the token to /auth/callback from accounts.google.com,
    // so the cookie must be allowed on a cross-site request.
    sameSite: "none",
    path: "/auth/callback",
    maxAge: 60 * 10,
  });
  return response;
}
