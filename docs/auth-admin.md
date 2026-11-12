# Accounts, sessions and admin (feature/auth-admin)

## Who can do what

| Role | Can |
|---|---|
| **User** | Use the counter (orders). Manage their own sessions and 2FA. |
| **Manager** | Everything a User can, plus list users, invite Users, and edit Users. Cannot change roles, suspend, delete, or touch Admins. |
| **Admin** | Everything. Manage all accounts, change roles, suspend, delete, and read the audit log. |

Permissions are checked in code (`api/_lib/rbac.ts`). Roles only map to permissions.

## Endpoints

Auth: `POST` routes need the app's `Origin` and `X-Requested-With: app` headers. Signed-in routes need `Authorization: Bearer <accessToken>`.

| Method | Route | Auth | Permission |
|---|---|---|---|
| POST | `/api/auth/login` | none, rate-limited | none |
| POST | `/api/auth/login/2fa` | pending sign-in token | none |
| POST | `/api/auth/refresh` | refresh cookie | none |
| POST | `/api/auth/logout` | refresh cookie | none |
| POST | `/api/auth/forgot-password` | none, rate-limited | none |
| POST | `/api/auth/reset-password` | one-time token | none |
| POST | `/api/auth/verify-email` | one-time token | none |
| POST | `/api/auth/resend-verification` | none, rate-limited | none |
| POST | `/api/auth/accept-invite` | one-time token | none |
| GET | `/api/auth/me` | signed in | none |
| GET | `/api/auth/sessions` | signed in | own sessions |
| DELETE | `/api/auth/sessions` | signed in | own sessions (all) |
| DELETE | `/api/auth/sessions/:id` | signed in | own session |
| POST | `/api/auth/2fa/setup` | signed in | own account |
| POST | `/api/auth/2fa/enable` | signed in | own account |
| POST | `/api/auth/2fa/disable` | signed in | own account |
| GET | `/api/admin/users` | signed in | `users:read` |
| POST | `/api/admin/users` | signed in | `users:invite` (Admin role needs `users:role`) |
| GET | `/api/admin/users/:id` | signed in | `users:read` |
| PATCH | `/api/admin/users/:id` | signed in | `users:edit` (role change needs `users:role`) |
| POST | `/api/admin/users/:id/suspend` | signed in | `users:suspend` |
| POST | `/api/admin/users/:id/reactivate` | signed in | `users:suspend` |
| DELETE | `/api/admin/users/:id` | signed in | `users:delete` (soft delete) |
| GET | `/api/admin/audit` | signed in | `audit:read` |
| POST | `/api/admin/bootstrap` | `SETUP_TOKEN` | none. Works only while no active Admin exists. |
| GET / POST | `/api/orders` | signed in with `orders:use`, or the staff PIN while `STAFF_PIN` is set | |
| GET | `/api/rates` | none | |

## Safety rules

- Nobody can delete or demote themselves, or suspend themselves.
- The last active Admin can't be demoted, suspended or deleted. The database enforces this with a locked check, so two Admins acting at once can't both remove the last one.
- Managers can act only on Users, not on Managers or Admins.
- Every admin action is written to `audit_log`: actor, action, target, time, IP, user agent. The table rejects UPDATE, DELETE and TRUNCATE for every role.
- Suspending or deleting a user ends their sessions at once. A changed role takes effect on the next request.

## Database

Migrations, in order:
1. `supabase/migrations/20261111000000_auth_admin.sql`: users, sessions, auth_tokens, backup_codes, audit_log, rate_limits, the rate-limit function, the last-Admin guard, and row-level security.
2. `supabase/migrations/20261111000100_totp_replay.sql`: stores the last used 2FA time step.
3. `supabase/migrations/20261112000000_pin_function_search_path.sql`: pins the search path on the three functions (clears a Supabase security warning).
4. `supabase/migrations/20261112000100_must_change_password.sql`: forces a password change after an Admin-set temporary password.

`supabase/schema.sql` is the earlier baseline. Apply the migrations after it.

**Status:** 1–3 are applied to the Supabase project (checked 2026-11-12). The project's security advisor shows only the expected notices: these tables have no public policies, because only the server reads and writes them.

Verified on the live project:
- All 6 auth tables exist with row-level security on.
- Rate limiter allows 5 attempts and blocks the 6th.
- The audit log rejects UPDATE, DELETE and TRUNCATE.
- The last-Admin guard refuses to demote the only active Admin, and allows it when another Admin exists.
- With the public key, reads return no rows and writes and function calls are refused.

Not yet verified: the server's Supabase client (`api/_lib/store.ts`) with the service role key. That needs a Vercel deployment or a local test with the key.

## How accounts are created

1. **Owner.** Run the one-time setup call (see Setup). Sign in, then turn on 2FA.
2. **Staff.** The owner opens **Team → Add a staff account**, enters the name, email and role, and clicks **Create account**. The temporary password is shown once. Give it to the person.
3. **First sign-in.** The person signs in with the temporary password and is asked to choose their own (12 characters or more). Until they do, the app and the orders API refuse them.
4. **Forgotten password.** The owner (or a Manager, for Users) opens the person in **Team** and clicks **Reset password**. A new temporary password is shown once, and the person is signed out everywhere. No email is needed.
5. **Forgot password (self-service).** Uses an email link. This needs the email setup below.

Roles: a Manager can create and reset Users only. Only the owner can create Admins or Managers.

## Existing users

There are no accounts in the database before this change. Staff have only the shared PIN.
- The migrations add no users, so nobody loses access by them.
- The first Admin is created with `POST /api/admin/bootstrap` (see Setup).
- Staff accounts are created from **Team** (see above).
- The staff PIN keeps working until you remove `STAFF_PIN`. Remove it once every staff member has an account.

## Setup

1. Apply the two migrations in the Supabase SQL editor.
2. In Vercel, set these (server only, no `VITE_` prefix):
   - `APP_URL`: your site, e.g. `https://your-site.vercel.app`
   - `JWT_SECRET`: 48 random characters, e.g. `openssl rand -base64 48`
   - `TOTP_ENCRYPTION_KEY`: `openssl rand -base64 32`
   - `RESEND_API_KEY` and `EMAIL_FROM`: email (verify your sending domain in Resend first)
   - `SETUP_TOKEN`: a random string, for the first Admin only
3. Redeploy, then create the owner account:

```bash
curl -X POST https://your-site.vercel.app/api/admin/bootstrap \
  -H 'Content-Type: application/json' -H 'Origin: https://your-site.vercel.app' -H 'X-Requested-With: app' \
  -d '{"setupToken":"<SETUP_TOKEN>","email":"owner@example.com","name":"Owner","password":"at least 12 characters"}'
```

4. Remove `SETUP_TOKEN` from Vercel. It's no longer needed.
5. Add staff from **Team → Add a staff account**, then remove `STAFF_PIN` once everyone has signed in.

## Tests

`npm test` runs 125 tests:
- `tests/db/migration.test.ts`: the migration on Postgres (audit immutability, rate limiter, last-Admin guard, RLS).
- `tests/auth-service.test.ts`: sign-in, lockout, rotation and reuse detection, immediate revocation, reset, verification, invitations, 2FA and replay protection, audit.
- `tests/admin.test.ts`: API access from outside (401/403/CSRF), manager limits, listing, invites, role changes, guardrails, audit, first-Admin setup.
- `tests/http.test.ts`: CSRF check, cookie flags, token types, encryption, validation.

The Supabase store (`api/_lib/store.ts`) is tested only through the migration tests. Check it against the real project (see the manual checklist).

## Manual checklist

Automated browser run (2026-11-12, against a local build with mocked API responses): sign-in with 2FA, the team list and filters, the audit tab, the account panel, sign-out, the reset link, the invite link, and the password length check all pass, with no page errors. Not yet done: a real iPad, and the live site.

- [ ] Bootstrap creates the owner; a second bootstrap call returns 404.
- [ ] Owner creates a staff account in Team; the temporary password is shown once and not again.
- [ ] Staff signs in with the temporary password and must choose a new one before reaching the counter.
- [ ] Owner resets a staff password; the staff member is signed out and must choose a new one.
- [ ] A Manager can create and reset Users, but not Admins or Managers.
- [ ] Sign-in works; a wrong password and an unknown email look the same.
- [ ] Five wrong passwords lock the account for 15 minutes.
- [ ] Forgot-password gives the same reply for a real and a fake email, and the email link works once (needs email set up).
- [ ] Refresh cookie has HttpOnly, Secure and SameSite=Lax (browser devtools).
- [ ] Reusing an old refresh token signs out every session from that login.
- [ ] Sign out on one device doesn't affect another; "sign out everywhere" affects all.
- [ ] Suspend a user while they're signed in: their next request fails.
- [ ] Manager can invite a User but not an Admin, and can't suspend.
- [ ] A User calling `/api/admin/users` directly gets 403.
- [ ] Admin can't delete or demote themselves; can't remove the last Admin.
- [ ] Audit log shows each action with actor, IP and user agent. Audit entries can't be edited or deleted in the Supabase table editor (the trigger rejects it).
- [ ] 2FA: setup, enable with the app's code, sign in with a code, sign in with a backup code, backup code can't be reused.
- [ ] Counter orders still save for a signed-in staff account, and with the PIN while `STAFF_PIN` is set.
