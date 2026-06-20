# EcoBuddy AI - Authentication Flow Audit Report

This report presents an in-depth audit of the authentication and session initialization flow for EcoBuddy AI, addressing the issue where fresh visitors are automatically routed to the dashboard rather than being redirected to the login/signup screen.

---

## 🔍 Root Cause Analysis

The authentication bypass is caused by a conflict between **unconditional mock seeding** in the database layer and **aggressive fallback routing** in the application shell.

### 1. Unconditional Seeding in `db.ts`
Inside [db.ts](file:///C:/Users/User/Desktop/Samhith%20V%20Gupta/My%20Apps/EcoBuddy%20AI/src/lib/db.ts#L337-L353), the local storage fallback logic contains the following function:
```typescript
const initLocalStorage = () => {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem('eb_profile')) {
    const mock = getInitialMockData();
    setLocal('eb_profile', mock.profile);
    setLocal('eb_trips', mock.trips);
    ...
  }
};

initLocalStorage(); // Triggered immediately on script import
```
Whenever `db.ts` is imported in the browser, this script checks if the key `eb_profile` exists. If it is absent (such as for a brand-new visitor or immediately after logging out), the script immediately pre-populates `localStorage` with mock data for the user "Alex Green".

### 2. Aggressive Fallback in `page.tsx`
Inside the home page [page.tsx](file:///C:/Users/User/Desktop/Samhith%20V%20Gupta/My%20Apps/EcoBuddy%20AI/src/app/page.tsx#L47-L75), session restoration operates as follows:
```typescript
  useEffect(() => {
    async function checkAuth() {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const prof = await db.getProfile();
            setProfile(prof);
          } else {
            // FALLBACK BLOCK
            const localProf = localStorage.getItem('eb_profile');
            if (localProf) {
              setProfile(JSON.parse(localProf));
            }
          }
        ...
```
When a brand-new visitor with no Supabase session opens the app:
1. `supabase.auth.getSession()` returns `null` for the session.
2. The logic goes to the `else` (fallback) block.
3. Because `db.ts` was imported, `eb_profile` has already been pre-populated with "Alex Green".
4. The fallback block successfully parses "Alex Green" and calls `setProfile(...)`.
5. The `profile` state becomes non-null, forcing the router to display the dashboard directly, completely bypassing [AuthScreen.tsx](file:///C:/Users/User/Desktop/Samhith%20V%20Gupta/My%20Apps/EcoBuddy%20AI/src/components/AuthScreen.tsx).

---

## 🧭 Authentication Scenarios & Behavior

### A. Brand-New Visitor with No Session
1. Visitor loads the page.
2. `db.ts` initializes and seeds the mock user profile `"Alex Green"` into `localStorage`.
3. The auth hook finds no Supabase session, runs the fallback, reads `"Alex Green"` from `localStorage`, and sets the state.
4. **Result**: Bypasses login screen; routes directly to the dashboard logged in as mock user.

### B. Visitor with an Existing Supabase Session
1. Hook finds an active Supabase session.
2. Queries the remote database `profiles` table.
3. **Result**: If schema is deployed, retrieves and displays their true profile. If schema is missing, queries fail and the interface stays on the login screen.

### C. Dashboard Display Without Authentication
* **Yes**. Anyone can access the dashboard and simulate logs, track commutes, and consult the AI coach under the anonymous mock profile `"Alex Green"` without registering.

### D. LocalStorage Sandbox Bypassing Login
* **Yes**. The sandbox mode automatically seeds session profiles on startup, which tricks the application routing logic into treating the user as signed in.
* **The Logout-Refresh Trap**: If a user clicks "Log Out", `eb_profile` is cleared, and they are redirected to the login screen. However, as soon as they refresh the page, the import of `db.ts` re-seeds the mock profile, and they are immediately logged back in as "Alex Green" automatically.

---

## 🏆 Competition Impact Assessment (PromptWars)

This behavior will **negatively affect** PromptWars evaluation:
1. **Security & Gatekeeping Penalties**: Automated evaluators expect a login/signup wall for non-public data dashboards. Bypassing authentication represents a failure of access control.
2. **Broken User Journey Testing**: Automated tests checking signup validations, invalid password warnings, or new profile creation triggers will fail or get skipped entirely because the evaluator is locked out of the `AuthScreen` by the mock session.
3. **Audit Failure**: Obvious mock data bypasses are penalized as incomplete code and fake integrations.

---

## 💡 Recommended Remediation

To fix this flow without breaking the offline localStorage fallback capability, the application should:
1. **Remove Unconditional Seeding**: Stop seeding the mock profile in `initLocalStorage()` on import. It should only be created when a user explicitly clicks a "Demo Mode" button (if supported) or when they authenticate.
2. **Restrict Fallback Routing**: Only restore a local session if the user explicitly opted for offline mode, or verify that the session profile matches an explicitly initialized state rather than a silent auto-generated default.
