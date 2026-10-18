# SVIT ERP Website — Architecture, Data-Flow, and Security Audit

**Assessment date:** 2026-10-16  
**Scope:** Repository contents under `src/`, configuration, client-side storage, API route handlers, scraper utilities, and the bundled mobile wrapper references.  
**Assessment type:** Source-code review. No intrusive testing, credential testing, vulnerability exploitation, or external-system probing was performed.

## 1. Executive summary

This application is a Next.js web application packaged inside Capacitor for Android/iOS. It presents an SVIT-branded student dashboard, but the authoritative student data is obtained by logging in to the upstream Accredia/Contineo ERP and then proxying or scraping pages from that ERP on the server.

The main flow is:

1. The browser requests a CAPTCHA from this application.
2. The application fetches the upstream login page and CAPTCHA, captures the upstream PHP session and CSRF field, and stores those values in an HTTP-only temporary cookie.
3. The browser submits USN, date of birth, and CAPTCHA to `/api/auth/login`.
4. The server submits the login form to `svit-students.accredia.in:8084`, receives the upstream session cookie, and copies that session into cookies set for this application.
5. Dashboard API routes reuse those cookies to request upstream HTML pages, follow links, and parse tables/cards with Cheerio.
6. Parsed JSON is returned to the browser. Some data is cached in `sessionStorage` or `localStorage`.
7. Separate faculty routes scrape the public SVIT faculty site and IRINS/Google Scholar-style endpoints. Marketplace and chat data use Supabase.

The application does not appear to exploit a technical vulnerability in Contineo. It relies on normal authenticated requests, undocumented/form-discovered routes, predictable query parameters, and HTML scraping. The “ERP Unlocked” feature does, however, intentionally discover and request additional authenticated ERP pages that are not part of the normal dashboard navigation. That is a security-sensitive design choice and should be treated as an authorized integration only.

### 1.1 Simple explanation for non-technical readers

Think of the SVIT website as a receptionist standing between the student and the official ERP website:

- The student talks to the SVIT website.
- The SVIT website talks to the official Contineo/Accredia ERP website.
- The official ERP website checks the student’s login details.
- SVIT reads the pages returned by the official ERP, picks out useful information, and displays it in a cleaner dashboard.

SVIT is therefore not the original source of attendance, marks, timetable, profile, or examination information. In most cases, it is reading that information from the official ERP and translating it into a new format.

The important consequence is that a student is giving login information to an additional middle layer. That middle layer must protect the information as carefully as the official ERP. If it does not, a problem in the SVIT website could expose information that normally stays inside the official ERP.

### 1.2 What this audit does and does not say

This audit says what the source code is designed to do and identifies weaknesses in that design. It does not prove that someone has stolen data, that the Contineo website itself is hacked, or that a particular student account has been accessed. Proving those things requires checking live server logs, database permissions, deployment settings, and affected user accounts.

## 2. Evidence and confidence

| Classification | Meaning |
|---|---|
| Confirmed | Directly visible in repository source/configuration. |
| Likely | Strong inference from code, but dependent on deployment/runtime behavior. |
| Not verified | Requires production logs, Supabase policies, browser inspection, or permission from the ERP owner. |

This report does **not** claim that the upstream Contineo server is compromised, that data has definitely leaked, or that a specific external endpoint is vulnerable. Those claims cannot be established from this repository alone.

## 3. System architecture

### 3.1 Components

- **Next.js App Router:** UI pages and server route handlers under `src/app/`.
- **Capacitor shell:** Native Android/iOS projects load the deployed HTTPS application; `CAPACITOR_SERVER_URL` is documented as `https://svit-erp.vercel.app`.
- **Upstream ERP:** `https://svit-students.accredia.in:8084/parents/index.php`, with paths containing `contineoReg`.
- **Public college/faculty sources:** `https://saividya.ac.in` and `https://saividya.irins.org`.
- **Supabase:** Marketplace, chat, user presence/identity support, and realtime subscriptions.
- **Browser storage:** Dashboard/profile/events/timetable caches, photos, attendance notes, and optionally saved login credentials.

### 3.2 Request flow

```text
Browser / Capacitor app
        |
        | same-origin /api requests with cookies
        v
SVIT Next.js server
   |             |                 |
   |             |                 +--> Supabase marketplace/chat/realtime
   |             +--> saividya.ac.in / saividya.irins.org faculty scraping
   +--> Accredia/Contineo ERP using the student's upstream session
        |
        v
  Parsed JSON returned to browser and cached locally
```

## 4. Authentication and upstream ERP integration

### 4.1 CAPTCHA bootstrap — confirmed

`src/app/api/auth/captcha/route.js`:

- GETs the upstream parent login page.
- Extracts `Set-Cookie` values and a hidden 32-character CSRF field.
- GETs `templates/contineoReg/captcha/get_captcha.php?rand=...` with the upstream cookie and Referer.
- Returns the CAPTCHA as a base64 data URL.
- Stores the upstream cookie, CSRF field, return token, and timestamp in `erp_login_session`.

The temporary cookie is HTTP-only and expires after 15 minutes, but its value is only base64-encoded JSON, not encrypted or signed. Because it is HTTP-only, ordinary page JavaScript cannot read it; nevertheless, a stolen cookie would expose the upstream login bootstrap state.

### 4.2 Login — confirmed

`src/app/api/auth/login/route.js`:

- Normalizes the USN and date format.
- Sends the date of birth as both `passwd` and `password`, plus `yyyy`, `mm`, and `dd` fields.
- Sends the supplied CAPTCHA as `securityCode`.
- Sends the discovered CSRF field and upstream session cookie.
- Rejects common upstream login/CAPTCHA failure responses.
- Copies returned upstream cookie pairs into cookies for the SVIT application.
- Stores `dashboard_url`, `erp_usn`, and upstream session cookies for approximately one day.

This is a credential-forwarding proxy: the SVIT server receives the student’s USN, date of birth, and CAPTCHA and sends them to the upstream ERP. The upstream ERP remains the authentication authority.

### 4.3 Authenticated data retrieval — confirmed

Student routes reconstruct a `Cookie` header from the application request cookies and send it to the upstream ERP. Examples include:

- `/api/student/dashboard` — dashboard HTML, marks, attendance, links, and related pages.
- `/api/student/profile` — profile and fee-related pages.
- `/api/student/photo` — dashboard page plus discovered photo URL.
- `/api/student/timetable` — timetable pages and related navigation.
- `/api/student/events` — academic calendar.
- `/api/student/feedback` — feedback lists, details, acknowledgements, and submissions.
- `/api/student/erp-unlocked` — additional pages discovered from authenticated ERP navigation and hard-coded/derived routes.

Most responses are HTML, not JSON APIs. Cheerio parses tables, headings, links, cards, and text into application-specific JSON. Thus “API extraction” is primarily server-side HTML scraping and form submission, with some upstream AJAX-style endpoints.

## 5. What is meant by “using vulnerabilities”

There is no evidence in the source that the application performs SQL injection, authentication bypass, CAPTCHA bypass, password cracking, or exploit delivery against Contineo. The implementation uses:

- An authenticated session obtained through the normal login form.
- CSRF fields extracted from the normal login page.
- Form actions and query parameters used by the upstream application.
- Additional authenticated pages whose links/routes are discoverable from ERP HTML.
- Public faculty and research endpoints.

The `/api/student/erp-unlocked` name and comments such as “reverse-engineering” indicate deliberate discovery of extra ERP functionality. This can become unauthorized access if it requests pages outside the student’s intended authorization or if it is used without the ERP owner’s written permission. The safe policy is to restrict it to documented, approved endpoints and to remove any endpoint that exposes another user’s or an administrative user’s data.

## 6. Data inventory and destinations

| Data | Source | Processing/storage observed |
|---|---|---|
| USN, date of birth, CAPTCHA | Browser | Sent to SVIT login route; date of birth is sent upstream. Optional saved credentials are stored in local storage. |
| ERP session cookies | Upstream ERP | Copied into SVIT HTTP-only cookies and forwarded to upstream routes. |
| Name, attendance, marks, results, timetable, events | ERP HTML | Parsed server-side; cached in browser `sessionStorage`. |
| Student photo and ID-card details | ERP HTML/image | Returned by server; photo may persist in `localStorage`. |
| Feedback content and submissions | ERP pages/forms | Proxied through server routes; debug/error logging must be checked for sensitive values. |
| Faculty profiles/publications/metrics | Public college and IRINS endpoints | Scraped and returned to clients; no ERP login required on faculty list/profile/xray routes. |
| Marketplace tasks, applications, reviews, reports, messages | Supabase | Queried/mutated with the public anon client from server and browser code. |
| Self-entered attendance and UI data | Browser | Persistent `localStorage`; keyed partly by USN. |

## 7. Findings

### CRITICAL — TLS certificate verification is disabled

`src/lib/erpConfig.js` creates an HTTPS agent with `rejectUnauthorized: false`.

Effect: the server can accept an invalid or substituted certificate when connecting to the ERP. In a hostile network, this can enable interception of USNs, dates of birth, CAPTCHA values, session cookies, marks, attendance, profile data, and feedback submissions.

Fix: remove the override and use the platform trust store. Fail closed on certificate errors. Add monitoring for certificate failures and test the real certificate chain before deployment.

### HIGH — Upstream session cookies are copied and broadly forwarded

Multiple routes reconstruct a cookie string from nearly all request cookies and send it upstream. The login route also copies all returned cookie pairs into application cookies.

Risks:

- Excess cookies can be sent to a third party unintentionally.
- Cookie attributes from the upstream server are not preserved exactly.
- A compromised application route or logging layer could expose a reusable ERP session.
- A session cookie may be accepted by the application as proof of authentication without an independent server-side session record.

Fix: maintain a server-side session store keyed by a random opaque session ID. Store upstream cookies only server-side, allowlist exactly the ERP session cookie names, rotate/expire sessions, never expose upstream cookies to the browser, and never forward arbitrary application cookies.

### HIGH — Marketplace identity fallback can mix users

`src/lib/marketplaceSession.js` falls back to the most recently seen row in Supabase when `erp_usn` is absent. The code comment itself states that this is not reliable in production.

Effect: a request lacking a resolvable USN can be associated with another user. Depending on Supabase policies and route behavior, this can cause cross-user reads, applications, messages, updates, or deletions.

Fix: fail closed when the USN is unavailable. Bind marketplace identity to a server-side authenticated session, never to “most recent user,” and enforce ownership in database Row Level Security and server-side queries.

### HIGH — Faculty routes are callable without ERP authentication

`/api/faculty/list`, `/api/faculty/profile`, and `/api/faculty/xray` do not visibly require an ERP session. They can trigger scraping and return staff profiles, publications, research projects, patents, memberships, citation metrics, and network data.

Risks: unrestricted scraping, resource exhaustion, privacy/copyright concerns, and use of the application as a proxy against third-party services.

Fix: decide whether these are public features. If not, require authentication and authorization. Add strict input validation, allowlisted department slugs and numeric expert IDs, caching, rate limits, concurrency limits, and upstream terms-of-use review.

### HIGH — Credentials can be stored persistently in local storage

`src/app/page.js` uses `svit_saved_credentials`; the UI offers saved credentials. Browser local storage is readable by any JavaScript executing in the origin and survives browser restarts.

Effect: an XSS or malicious browser extension can obtain the student’s USN and date of birth. Date of birth is used as the ERP password in the login request.

Fix: remove credential persistence. If convenience is required, use the operating system/browser credential manager or a native secure-storage plugin; never store the date of birth/password in local storage.

### HIGH — Sensitive data is cached in browser storage

Dashboard, profile, timetable, events, ID-card photo, faculty data, and self-entered attendance are stored in `sessionStorage` or `localStorage`.

Effect: same-origin XSS, injected third-party scripts, browser extensions, shared-device access, backups, and forensic recovery can expose academic and identity data. `localStorage.clear()` in settings is also broad and can remove unrelated application data.

Fix: minimize client caching, avoid persistent storage for photos and identity data, clear caches on logout and session expiry, use short-lived in-memory state where possible, and set a strict Content Security Policy.

### HIGH — Possible authorization gap on student routes

Several student routes use “any non-helper cookie exists” as the authentication test (`hasErpSession`). This checks cookie presence, not validity, expiry, audience, or user binding.

Fix: validate a server-side session before every route; optionally perform a lightweight upstream identity check and verify the returned identity matches the session’s USN. Do not treat arbitrary client-set cookie names as authentication.

### MEDIUM — Password recovery endpoints may disclose account state

The forgot-password routes send an email to the upstream `mode` endpoint and parse masked phone/username fields and error messages. Differences between “invalid email,” “verification required,” and success can enable account enumeration. The routes also forward verification values to the upstream endpoint.

Fix: return uniform responses and timing, add rate limits and abuse monitoring, do not return upstream usernames or more phone digits than necessary, and confirm that the upstream flow is authorized for this integration.

### MEDIUM — No visible rate limiting or request budget on scraping routes

Several routes perform multiple upstream requests, and faculty X-Ray can iterate over many department pages and publication pages. Feedback can perform chained requests and form posts.

Fix: add per-user/IP rate limits, maximum names/items/pages, upstream timeouts, circuit breakers, caching, and concurrency limits. Log request IDs and counts without logging credentials or session cookies.

### MEDIUM — Potential open-proxy/URL trust risk

`dashboard_url` is used as the target URL, and `resolveErpUrl` accepts absolute HTTP(S) paths. The current login response is the apparent source of the cookie, but accepting arbitrary absolute URLs in future or through cookie injection could turn routes into SSRF proxies.

Fix: never trust a client-provided target URL. Parse and enforce an exact hostname, port, scheme, and approved path prefix. Reject redirects to other origins and use an explicit route map.

### MEDIUM — Debug logging needs review

`src/app/api/student/feedback/route.js` contains debug logging around session cookies and request processing. Even if the current helper redacts some values, production logs must be checked for cookies, form values, feedback text, IDs, and upstream HTML.

Fix: remove sensitive debug logs in production, redact cookies/tokens, set short log retention, restrict log access, and review Vercel/provider logs for historical exposure.

### LOW — Untrusted text is inserted as HTML in one client feature

`src/app/dashboard/bunk/page.js` uses `dangerouslySetInnerHTML` after a simple Markdown-like replacement. If the source text ever becomes user-controlled or upstream-controlled, this could become XSS.

Fix: render structured React nodes or sanitize with a narrowly configured trusted sanitizer; do not treat a string replacement as HTML sanitization.

### LOW — Hard-coded public Supabase anon key is present

The Supabase URL and anon key are embedded in `src/lib/supabase.js`. An anon key is designed to be public, so this is not automatically a secret leak. The security boundary must be Supabase Row Level Security, not key secrecy.

Fix: rotate the key if it was intended to be private, inspect RLS policies for every table, disable unrestricted reads/writes, and never put a service-role key in client-reachable code.

## 8. Data-leak assessment

### Confirmed exposure paths in code

- The browser receives parsed academic/profile data from the application API.
- `sessionStorage` contains dashboard, results, timetable, events, profile, and “unlocked” data.
- `localStorage` may contain saved credentials, student ID/photo, self-logged attendance, and marketplace/UI state.
- Public faculty routes return staff and research information without an apparent login check.
- Supabase is used directly by browser components for marketplace/chat realtime behavior; actual exposure depends on RLS policies.
- The repository contains a bundled `public/svit-erp.apk`, which should be treated as a public artifact and inspected for embedded URLs, keys, logs, and old builds.

### Not established from this repository

- Whether production Vercel logs contain credentials, cookies, full upstream HTML, or feedback data.
- Whether Supabase tables permit anonymous reads/writes or expose private rows through realtime.
- Whether the deployed site has a restrictive CSP, HSTS, secure cookie behavior, or rate limiting.
- Whether the upstream ERP has an actual vulnerability or whether any hidden route crosses authorization boundaries.
- Whether the APK or deployment artifact has leaked secrets outside the repository.

### Immediate leak-check procedure

1. Rotate the Supabase anon key if it was ever mistakenly treated as secret; immediately rotate any service-role key if found in deployment history.
2. Search Git history, Vercel logs, Supabase logs, CI artifacts, APK strings, and browser telemetry for `PHPSESSID`, `ksign`, `erp_login_session`, `securityCode`, `passwd`, `password`, `dob`, and `Cookie:`.
3. Inspect Supabase RLS and realtime publication settings for `users`, `messages`, `marketplace_tasks`, `marketplace_applications`, `marketplace_reviews`, and `marketplace_reports`.
4. Check deployment access logs for unusual calls to `/api/faculty/*`, `/api/student/erp-unlocked`, forgot-password routes, and repeated CAPTCHA/login attempts.
5. Notify the ERP owner if any upstream session, student record, or feedback content was logged or exposed; invalidate affected sessions.

## 9. Remediation plan

### Priority 0 — stop high-impact exposure

- Restore TLS certificate verification immediately.
- Disable saved credentials and remove existing stored credential keys on the next release.
- Make marketplace requests fail closed without an exact authenticated USN.
- Review and, if necessary, temporarily disable `erp-unlocked`, feedback mutation, and unauthenticated faculty scraping until authorization and rate limits are in place.
- Remove cookie/session values from logs and rotate any credentials or sessions that may have appeared in logs.

### Priority 1 — redesign session handling

- Create an opaque, random application session ID after successful upstream login.
- Store upstream cookie jar data server-side with encryption at rest and a short TTL.
- Set only the opaque application session cookie to `HttpOnly`, `Secure`, `SameSite=Lax/Strict`, and a narrow path.
- Allowlist upstream cookie names and approved upstream origins.
- Bind every student/marketplace operation to the session’s USN and reject mismatches.
- Revoke server-side state on logout and upstream-session failure.

### Priority 2 — constrain routes and data

- Add authentication and authorization middleware to every student route.
- Add request schemas and maximum lengths for all query/body fields.
- Allowlist `expertId`, department slugs, upstream paths, and feedback actions.
- Add per-IP/per-user rate limits, response-size limits, cache controls, and circuit breakers.
- Remove unnecessary fields from API responses and never return raw upstream HTML.

### Priority 3 — browser and deployment hardening

- Do not persist credentials or sensitive photos in local storage.
- Add CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, and frame protections.
- Use `Cache-Control: no-store` for sensitive API responses.
- Audit the APK and remove old build artifacts if they contain sensitive material.
- Review dependency advisories and run build/lint/security checks in CI.

### Priority 4 — operational assurance

- Obtain written authorization and a documented data-processing agreement for upstream scraping and hidden/extra ERP routes.
- Maintain an endpoint inventory with owner, purpose, data class, retention, and authorization basis.
- Add security tests for cross-user access, missing/forged cookies, origin enforcement, RLS, rate limits, and logout invalidation.
- Establish incident response: session invalidation, key rotation, log preservation, user notification, and upstream notification.

## 10. Recommended acceptance criteria

The release should not be considered secure until all of the following are true:

- Invalid ERP certificates fail the request.
- No date of birth/password is stored in local storage, logs, APK resources, or API responses.
- Upstream ERP cookies are server-side only and allowlisted.
- Forged, missing, expired, or cross-user cookies cannot access student data.
- Marketplace operations cannot resolve identity from the most recent Supabase user.
- Supabase RLS tests prove one user cannot read or mutate another user’s records.
- Faculty and extra-ERP routes have explicit authorization, rate limits, and approved endpoint lists.
- Sensitive responses are not cached by the browser or CDN.
- Production logs and historical artifacts have been reviewed for credential/session leakage.

## 11. Files reviewed most heavily

- `src/lib/erpConfig.js`
- `src/lib/authSession.js`
- `src/lib/marketplaceSession.js`
- `src/lib/supabase.js`
- `src/app/api/auth/captcha/route.js`
- `src/app/api/auth/login/route.js`
- `src/app/api/auth/forgot/route.js`
- `src/app/api/auth/forgot-password/route.js`
- `src/app/api/student/*/route.js`
- `src/app/api/faculty/*/route.js`
- `src/lib/facultyScraper.js`
- `src/app/page.js`
- `src/lib/clientApi.js`
- dashboard pages using `localStorage` and `sessionStorage`

## 12. Detailed walkthrough in everyday language

### 12.1 What happens when a student opens the site

1. The student opens the SVIT application in a browser or mobile app.
2. The mobile app is mainly a container. It loads the online SVIT website rather than keeping a separate copy of the student database inside the phone.
3. The login screen asks for the USN, date of birth, and a CAPTCHA.
4. The browser asks the SVIT server for a CAPTCHA image.
5. The SVIT server contacts the official ERP, gets a CAPTCHA belonging to a temporary ERP visit, and sends the picture back to the student.

The CAPTCHA is important because it is meant to prove that a person is completing the login instead of an automated program. The SVIT server must preserve the connection associated with that CAPTCHA so the later login attempt is checked against the correct CAPTCHA.

### 12.2 What happens when the student logs in

When the student presses Login, the browser sends the USN, date of birth, and CAPTCHA to the SVIT server. The SVIT server then sends a form to the official ERP.

The official ERP responds with a temporary “visitor pass,” usually called a session cookie. A cookie is a small piece of information that tells a website, “this browser has already logged in.” It is similar to a wristband at an event: the student does not need to show their full identity at every door, because the wristband proves that the entrance check already happened.

The SVIT server places that ERP pass into cookies belonging to the SVIT website. Later, when the student opens attendance or results, the SVIT server takes the pass and presents it to the ERP. The ERP then returns pages for that logged-in student.

This is convenient, but it means the SVIT server holds a key that can open the student’s ERP session. Anyone who obtains that key before it expires may be able to act as that student.

### 12.3 What an API means here

An API is simply a structured doorway between two programs. Instead of a person clicking a button, one program sends a request and another program sends a response.

For example:

```text
SVIT browser: “Please show attendance.”
SVIT server: “I will ask the official ERP.”
SVIT server -> ERP: “Return the attendance page for this logged-in session.”
ERP -> SVIT server: “Here is an HTML page containing attendance.”
SVIT server: “I found the subject rows and percentages.”
SVIT server -> browser: “Here is attendance as JSON for the dashboard.”
```

The project uses both standard form requests and API-like requests. Many ERP responses are complete HTML pages rather than clean JSON. The SVIT server uses Cheerio, an HTML-reading library, to search those pages for headings, tables, links, marks, dates, and percentages.

### 12.4 What scraping means

Scraping means a program reads a web page the way a person would, but automatically. For example, instead of a person looking at a table and copying “Mathematics — 82%,” the program finds the table, reads the row, and puts the result into an object that the dashboard can display.

The code scrapes:

- Dashboard summary cards and student names
- Attendance and attendance-detail pages
- Internal assessment and marks pages
- Timetables and faculty names
- Academic events
- Student profile and fee-related information
- Student photographs
- Feedback forms and feedback status

Scraping is not automatically a security problem. It becomes risky when the application reads pages that were not approved for this purpose, ignores the upstream website’s access rules, sends too many requests, or exposes one student’s result to another student.

### 12.5 What the “ERP Unlocked” feature does

The `erp-unlocked` route makes several requests after login. It looks through authenticated ERP pages, follows links, and tries to discover additional information such as proctorial notes, timetable details, feedback information, and hidden dashboard pages.

In plain language, it is like opening doors in the official ERP that are not necessarily shown in the normal student menu and checking what is behind them. That may be acceptable if the ERP owner explicitly approved it and every page is still limited to the currently logged-in student. It is not safe to assume that a page is permitted merely because the server returns it.

The feature should be reviewed by the ERP owner and the college. The review should answer:

- Which exact pages are approved?
- Is each page intended for students?
- Can any page return another student’s information?
- Can any page change information rather than only read it?
- Are requests limited to the logged-in student’s own records?

### 12.6 How faculty information is obtained

Faculty information follows a separate path and does not appear to depend on the student’s ERP session:

1. The application receives faculty names from the student timetable.
2. It visits public department pages on `saividya.ac.in`.
3. It finds matching faculty names and public profile links.
4. It uses the public IRINS profile ID to request qualifications, publications, projects, patents, memberships, and citation information.
5. It returns the collected information to the app.

This is a public-information aggregation feature. Its main risks are excessive automated requests, incorrect name matching, privacy/terms-of-use concerns, and the possibility that anyone can use the SVIT server to repeatedly scrape those third-party sites.

### 12.7 How Supabase is used

Supabase is a hosted database service used for SVIT Connect/marketplace features. It stores information such as marketplace tasks, applications, reviews, reports, messages, and user presence.

The browser can also connect to Supabase for realtime updates, meaning a new message or marketplace change may appear without the user manually refreshing the page.

The public “anon key” is not necessarily a password. Supabase expects applications to expose an anon key. The real protection is called Row Level Security, or RLS. RLS is like a database security guard that checks whether the current user is allowed to read or change each row. If RLS is missing or incorrectly written, hiding the anon key does not solve the problem.

### 12.8 What browser storage means

The browser has two relevant storage areas:

- `sessionStorage` usually disappears when the browser tab/session ends. The app uses it for dashboard, profile, timetable, event, and unlocked-data caches.
- `localStorage` remains after closing the browser. The app uses it for items such as saved credentials, student photos, ID-card values, self-entered attendance, and some marketplace settings.

Browser storage is convenient but should be treated like a notebook left inside the browser. Any JavaScript running on the same website can usually read it. A malicious browser extension, an XSS bug, a shared computer, or a copied browser profile could expose it.

The most serious item is the optional saved credential feature because the date of birth is used as the ERP password. A student should not be offered a feature that stores this in ordinary browser storage.

### 12.9 Why disabled certificate checking is dangerous

When a browser visits an HTTPS website, the certificate helps prove that the connection really reaches the intended website. In this project, the server explicitly says it will accept the ERP’s certificate even when the certificate cannot be verified.

An everyday analogy is accepting a delivery from someone wearing an invalid company badge. The package may be genuine, but there is no reliable check that the person is from the company.

If someone could intercept the server’s network connection, they might read or change login information and session cookies. Certificate verification must be enabled so the server rejects an untrusted ERP connection.

### 12.10 What “data leakage” means in this audit

Data leakage does not only mean that data was posted publicly on the internet. It can also mean that information is exposed to a person or service that should not receive it.

Possible examples include:

- A student’s ERP cookie appearing in an application log.
- Student marks being stored in a long-lived browser cache on a shared phone.
- A marketplace request being linked to the wrong student.
- Supabase allowing one student to read another student’s application.
- A third-party faculty endpoint being called repeatedly through the SVIT server.
- An old APK containing a previous URL, key, debug message, or secret.

The source code confirms several places where data exists. It does not confirm that those places have already leaked data. That is why the report recommends checking logs, Supabase policies, deployment settings, and mobile artifacts.

## 13. Plain-language risk summary

| Risk | What it means in normal language | Priority |
|---|---|---|
| Disabled certificate checking | The server may not reliably know it is talking to the real ERP. | Critical |
| ERP cookies copied into the app | The SVIT server holds the student’s temporary ERP pass. | High |
| Weak marketplace identity fallback | The wrong student could potentially be selected when identity is missing. | High |
| Saved date of birth/password | A browser compromise could reveal the student’s login information. | High |
| Sensitive browser caches | Another person using the device may see academic or identity data. | High |
| Extra ERP discovery | The app may access pages beyond the normal menu without clear approval. | High |
| Public faculty scraping routes | Anyone may be able to make the server scrape third-party sites. | High |
| No visible rate limits | One person or bot may send excessive requests. | Medium |
| Debug logs | Technical logs may accidentally contain private values. | Medium |
| Missing Supabase RLS evidence | Database access may be too broad if policies are wrong. | High until verified |

## 14. What a safe corrected design should look like

In a safer design, the student would still use the SVIT dashboard, but the handling would be changed as follows:

1. The student logs in through the application.
2. The application verifies the ERP certificate normally.
3. The application stores the upstream ERP session only on the server, in protected server-side storage.
4. The browser receives only a random SVIT session ID, not the ERP’s actual session details.
5. Every request checks that the session is valid and belongs to the same student.
6. The server contacts only approved ERP pages on an allowlist.
7. The server returns only the fields required by the screen.
8. Sensitive responses are marked not to be cached.
9. Marketplace access uses the authenticated session’s exact USN and database RLS.
10. Credentials are never saved in local storage.
11. Requests are rate-limited and monitored without recording passwords or cookies.

This design still provides the convenient dashboard while reducing the chance that a browser bug, wrong cookie, database policy error, or third-party service issue exposes student information.

## Final conclusion

The website is a server-side ERP adapter and scraper with a client dashboard, not an independent ERP data store. Its strongest security boundary is currently the upstream session cookie, but that boundary is weakened by disabled TLS verification, broad cookie forwarding, browser persistence, weak marketplace identity fallback, and unrestricted scraping routes. There is no source-code evidence that it exploits a Contineo vulnerability; the principal risk is that normal authenticated access and undocumented extra routes are being used without sufficiently strong authorization, isolation, rate limiting, and data-leak controls.
