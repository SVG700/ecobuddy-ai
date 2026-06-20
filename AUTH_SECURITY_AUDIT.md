# EcoBuddy AI - Security and Anonymous Access Audit Report

This report evaluates the authentication security of the EcoBuddy AI application, focusing on anonymous access, route protection, local storage sandboxing, and competition scoring implications in **PromptWars**.

---

## 🔐 1. Analysis of Anonymous Access Gaps

### Root Cause of the Security Bypass
The application is structured as a client-side single-page app (SPA) governed by a single client-side route (`/`).
View routing is managed by the `activeTab` React state inside [page.tsx](file:///C:/Users/User/Desktop/Samhith%20V%20Gupta/My%20Apps/EcoBuddy%20AI/src/app/page.tsx).

The only route guard preventing access to the dashboard is located at lines 256-260 in `page.tsx`:
```typescript
  // Not signed in
  if (!profile) {
    return <AuthScreen onAuthComplete={handleAuthComplete} />;
  }
```
This guard relies entirely on the `profile` state. However, during app initialization (`checkAuth()` in `page.tsx`), the code aggressively falls back to local storage if a user has no active Supabase cloud session:
```typescript
  const localProf = localStorage.getItem('eb_profile');
  if (localProf) {
    setProfile(JSON.parse(localProf));
  }
```
Because the helper file [db.ts](file:///C:/Users/User/Desktop/Samhith%20V%20Gupta/My%20Apps/EcoBuddy%20AI/src/lib/db.ts#L337) unconditionally populates the `eb_profile` key in `localStorage` with mock profile data for `"Alex Green"` during script loading, `localStorage.getItem('eb_profile')` is **never null** for a visitor. The app parses this seeded data, sets it to `profile`, and renders the dashboard immediately.

---

## 📝 Audit Answers

### 1. Why anonymous visitors can access the dashboard?
When `db.ts` is imported, it automatically calls `initLocalStorage()`. This seeds `eb_profile` with the mock profile. The page check (`checkAuth()`) detects no Supabase session and falls back to this seeded object, logging the visitor in automatically and bypassing the `AuthScreen` route guard.

### 2. Is the dashboard intentionally public?
**No**. The existence of credentials sign-in, sign-up forms, password recovery endpoints, and RLS database policies in the SQL schema proves the application was designed as an authenticated cloud product. The localStorage sandbox was intended strictly as an offline fallback when Supabase is not configured, but it is currently overriding the security guard.

### 3. Is a mock/demo user automatically created?
**Yes**. The mock profile `"Alex Green"` (id: `mock-user-123`, email: `eco.buddy@example.com`) is written to local storage and initialized as the active session for any visitor without a Supabase session.

### 4. Is localStorage fallback overriding authentication?
**Yes**. By loading the local profile without verifying whether the user explicitly requested guest access or signed in, the fallback logic overrides the cloud login wall.

### 5. Can authenticated features be accessed without login?
**Yes**. Anonymous users can access all dashboard tabs, track commutes, submit fuel/electricity records, complete challenges, and chat with the AI Advisor. However:
- Data is only saved to their browser's local storage.
- If Supabase configuration is present in `.env.local` but the user is anonymous, any code path that hits Supabase client API endpoints will throw `Not authenticated` errors, causing silent console failures.

### 6. Will this negatively affect PromptWars scoring?
**Yes, heavily**.
* **Security Rating**: Bypassing authentication gates on fresh visits is classified as a severe access control vulnerability.
* **Code Quality**: Hardcoding unconditional session seeding on script loading represents poor session state separation.
* **Problem Alignment**: Automated evaluators testing signup forms or credentials validations will be blocked from reaching the login page, leading to failing test scripts.

---

## 💡 Recommended Remediation

To enforce security while keeping sandbox/demo mode functional for evaluators, we recommend the following changes:

1. **Remove Unconditional Seeding from `db.ts`**:
   Refactor `initLocalStorage` in [db.ts](file:///C:/Users/User/Desktop/Samhith%20V%20Gupta/My%20Apps/EcoBuddy%20AI/src/lib/db.ts) to *never* seed mock data on load. It should remain empty by default.
2. **Implement "Demo Mode" trigger on Auth Screen**:
   Add a prominent button to [AuthScreen.tsx](file:///C:/Users/User/Desktop/Samhith%20V%20Gupta/My%20Apps/EcoBuddy%20AI/src/components/AuthScreen.tsx): **"Launch Instant Demo Mode (No Setup)"** or **"Launch Local Sandbox"**.
3. **Seeding on User Consent**:
   When the user clicks the Demo Mode button, explicitly trigger the mock seeding function:
   ```typescript
   const handleLaunchDemo = () => {
     // Seed localStorage with mock data
     db.initializeDemoSession(); 
     onAuthComplete(mockProfile);
   };
   ```
This ensures a fresh visitor is always presented with the authentication/gatekeeping screen first, satisfying security and compliance checks, while still offering single-click access to the guest sandbox mode for evaluators.
