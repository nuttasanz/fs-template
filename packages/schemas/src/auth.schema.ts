import { z } from "zod";

// ---------------------------------------------------------------------------
// LoginDTO — credentials submitted to the login endpoint
// ---------------------------------------------------------------------------

export const LoginDTOSchema = z.object({
  email: z
    .string()
    .email()
    .describe("The email address associated with the account."),
  password: z
    .string()
    .min(1)
    .describe(
      "The account password. Only presence is validated here — enforcing " +
        "complexity rules on the login form would leak the current password " +
        "policy to attackers. Full verification happens server-side."
    ),
});

export type LoginDTO = z.infer<typeof LoginDTOSchema>;

// ---------------------------------------------------------------------------
// SessionDTO — session metadata returned after successful authentication
//
// The session token itself is NOT included: it is transmitted via an
// HttpOnly cookie and must never appear in a JSON response body.
// ---------------------------------------------------------------------------

export const SessionDTOSchema = z.object({
  id: z
    .string()
    .uuid()
    .describe("The unique identifier of the session (UUID v4)."),
  userId: z
    .string()
    .uuid()
    .describe("The UUID of the user this session belongs to."),
  expiresAt: z
    .string()
    .datetime()
    .describe(
      "ISO 8601 timestamp indicating when this session expires. " +
        "Clients should re-authenticate before this time."
    ),
});

export type SessionDTO = z.infer<typeof SessionDTOSchema>;
