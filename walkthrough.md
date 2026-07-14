# Walkthrough - Security Level 1 & 2 Implementation (Hardened)

We have successfully upgraded the RailConnect application to satisfy all **Level 1 (Basic)** and **Level 2 (Intermediate)** security checkpoints, including the additional hardening items.

---

## 🔒 Level 1 (Basic Security) Updates Completed

1. **Passwords hashed using bcrypt**:
   - Integrated `bcryptjs` with 10 salt rounds to hash all user passwords on registration.
   - Refactored login comparisons to use safe bcrypt verification.
2. **Never store passwords in plain text**:
   - Validated that plain-text passwords never reach the database.
3. **Input validation on frontend & backend**:
   - Created [validation.ts](file:///c:/Users/Shubham%20Madaye/OneDrive/Desktop/rail/backend/src/utils/validation.ts) to strictly validate email patterns, phone formats, names, and password strength.
   - Implemented corresponding input verification on the frontend registration and password reset forms.
4. **Protection against SQL Injection**:
   - Handled exclusively via Prisma ORM parameterized queries. No raw SQL strings.
5. **Protection against XSS**:
   - Helmet headers configured on backend, React JSX automatic escaping, and moved JWT tokens to in-memory state.
6. **Protection against CSRF attacks**:
   - Immune through header-based Bearer JWT authentication (browser does not auto-submit headers cross-origin).
7. **Secure authentication (JWT)**:
   - Configured token-based authentication.
8. **Strong password requirements**:
   - Implemented validation requiring passwords to be **at least 8 characters long** and contain **at least one uppercase letter, one lowercase letter, one number, and one special character**.
9. **Rate limiting**:
   - Implemented Express middleware `express-rate-limit` on general API endpoints (100 requests per 15 min) and strict limits on authentication endpoints (10 requests per 15 min).
10. **Environment variables**:
    - Kept all secrets in environment configuration file `.env`.

---

## 🛠️ Level 2 (Intermediate Security) Updates Completed

1. **Secure JWT Handling (Access + Refresh Token Rotation)**:
   - Refactored authentication to issue short-lived in-memory `accessToken` (15 minutes) and a long-lived `refreshToken` (7 days) stored in an `HttpOnly`, `SameSite=Strict` cookie.
   - **Refresh Token Hashing**: Added cryptographic hashing (`SHA-256`) to refresh tokens prior to database storage in [auth.ts](file:///c:/Users/Shubham%20Madaye/OneDrive/Desktop/rail/backend/src/routes/auth.ts). If the database leaks, refresh tokens cannot be used by attackers.
   - Configured frontend automatic token rotation by intercepting `401 Unauthorized` responses and calling `/auth/refresh` behind the scenes, resolving token rotation and invalid/expired session recovery automatically.
2. **CSRF Mitigation**:
   - Hardened refresh cookies to `SameSite=Strict` and `HttpOnly` configurations.
3. **Resource Ownership Verification (Zero IDOR / Insecure Direct Object References)**:
   - Secured PNR booking lookups, waitlist prediction, and ticket validator endpoints in [bookings.ts](file:///c:/Users/Shubham%20Madaye/OneDrive/Desktop/rail/backend/src/routes/bookings.ts) to verify that the logged-in user owns the booking or is an admin.
   - Secured food order tracking `/order/:id` and order listings `/orders/booking/:bookingId` in [food.ts](file:///c:/Users/Shubham%20Madaye/OneDrive/Desktop/rail/backend/src/routes/food.ts) to block unauthorized cross-user order visibility.
4. **Email Verification**:
   - New accounts are created with `isEmailVerified: false`.
   - On registration, a verification token is generated, and a mock email containing a confirmation link is appended to [mock-emails.log](file:///c:/Users/Shubham%20Madaye/OneDrive/Desktop/rail/backend/mock-emails.log).
   - Designed frontend [VerifyEmailPage](file:///c:/Users/Shubham%20Madaye/OneDrive/Desktop/rail/frontend/app/verify-email/page.tsx) to capture tokens and process validation.
5. **Password Reset via Email**:
   - Created forgot-password and reset-password flows with secure verification tokens.
   - Reset links are appended to the mock email log file.
6. **Account Lockout**:
   - Tracked login failures. If a user inputs 5 consecutive incorrect passwords, the account is locked for 15 minutes.
7. **Audit Logging**:
   - Created the `AuditLog` database model to trace auth activities (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `REGISTER`, `PASSWORD_RESET`, etc.).
   - Exposed a secure `GET /api/admin/audit-logs` endpoint.
8. **Database Backups**:
   - Setup a scheduled task (once every 24 hours) and manual administrative backups to place SQLite copies inside the `prisma/backups/` directory, automatically rotating to keep only the latest 7 files.

---

## 🧪 Validation & Manual Testing Instructions

### **1. Access the Mock Email Log**
Whenever you Register or request a Password Reset, check the log file located at:
👉 [backend/mock-emails.log](file:///c:/Users/Shubham%20Madaye/OneDrive/Desktop/rail/backend/mock-emails.log)

Copy the link printed in the log and navigate to it in your browser.

### **2. Verification Flow Testing**
1. Register a new user at `http://localhost:3000/register`. Make sure to use a strong password (e.g., `P@ssword123`).
2. Try logging in immediately with that account at `http://localhost:3000/login`. You should be blocked with a message asking to verify your email.
3. Open `backend/mock-emails.log`, copy the verification link, and paste it into your browser.
4. Once verified, log in successfully.

### **3. Lockout Flow Testing**
1. Go to the login page and enter an incorrect password 5 times.
2. Verify that the app blocks further login attempts and notifies you that the account has been locked.
