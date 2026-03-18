import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export const UserRoleSchema = z.enum(['SUPER_ADMIN', 'ADMIN', 'USER'], {
  description: 'The access role assigned to a user within the system.',
});

export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED'], {
  description: 'The lifecycle status of a user account.',
});

export type UserStatus = z.infer<typeof UserStatusSchema>;

// ---------------------------------------------------------------------------
// UserDTO — shape returned from the API (read model)
// ---------------------------------------------------------------------------

export const UserDTOSchema = z.object({
  id: z.string().uuid().describe('The unique identifier of the user (UUID v4).'),
  email: z.string().email().describe('The primary email address of the user.'),
  role: UserRoleSchema,
  status: UserStatusSchema,
  createdAt: z.string().datetime().describe('ISO 8601 timestamp of when the user was created.'),
  updatedAt: z.string().datetime().describe('ISO 8601 timestamp of the last update.'),
  profile: z
    .object({
      firstName: z.string().describe("The user's given name."),
      lastName: z.string().describe("The user's family name."),
      bio: z.string().nullable().describe('Optional biographical text. Null when not provided.'),
    })
    .describe('Embedded profile data for the user.'),
});

export type UserDTO = z.infer<typeof UserDTOSchema>;

// ---------------------------------------------------------------------------
// CreateUserDTO — fields required when an admin creates a new user
// ---------------------------------------------------------------------------

export const CreateUserDTOSchema = z.object({
  email: z.string().email().describe('Email address for the new account. Must be globally unique.'),
  password: z
    .string()
    .min(12)
    .describe(
      'Plain-text password supplied by the admin. Minimum 12 characters (NIST SP 800-63B). ' +
        'The backend is responsible for hashing before persistence.',
    ),
  role: UserRoleSchema.describe(
    'Role to assign. ADMIN and SUPER_ADMIN creation is restricted by RBAC.',
  ),
  firstName: z.string().min(1).describe("The user's given name."),
  lastName: z.string().min(1).describe("The user's family name."),
  bio: z.string().optional().describe('Optional biographical text. Omit to leave blank.'),
});

export type CreateUserDTO = z.infer<typeof CreateUserDTOSchema>;

// ---------------------------------------------------------------------------
// UpdateUserDTO — subset of fields that may be changed after creation
//
// Excludes email and password: those changes require dedicated endpoints
// with additional verification steps (security by design).
// ---------------------------------------------------------------------------

export const UpdateUserDTOSchema = CreateUserDTOSchema.pick({
  firstName: true,
  lastName: true,
  bio: true,
  role: true,
})
  .partial()
  .describe('All fields are optional. Only the provided fields will be updated.');

export type UpdateUserDTO = z.infer<typeof UpdateUserDTOSchema>;
