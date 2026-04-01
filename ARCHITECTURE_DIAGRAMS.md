# 2FA System Architecture & Flow Diagrams

## System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                       Frontend (React)                          │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐      ┌─────────────────────┐          │
│  │ RegistrationForm    │      │ Verify2FAForm       │          │
│  │ - username          │──┬─▶ │ - code input        │          │
│  │ - password          │  │   │ - attempts counter  │          │
│  │ - email             │  │   │ - resend button     │          │
│  │ - name fields       │  │   │                     │          │
│  └─────────────────────┘  │   └─────────────────────┘          │
│                           │                                     │
└────────────────────────────────────────────────────────────────┘
                            │
                     (POST requests)
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
   register/         verify-2fa/          resend-code/
   
┌────────────────────────────────────────────────────────────────┐
│                    Django Backend                               │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐  │
│  │ RegisterView     │  │ Verify2FAView    │  │ ResendView  │  │
│  ├──────────────────┤  ├──────────────────┤  ├─────────────┤  │
│  │ ✓ Validate input │  │ ✓ Get user       │  │ ✓ Get user  │  │
│  │ ✓ Create user    │  │ ✓ Verify code    │  │ ✓ Gen code  │  │
│  │ ✓ Gen 2FA code   │  │ ✓ Check limit    │  │ ✓ Send mail │  │
│  │ ✓ Send email     │  │ ✓ Create session │  │ ✓ Response  │  │
│  │ ✓ Response       │  │ ✓ Response       │  │             │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬──────┘  │
│           │                     │                   │         │
│           └─────────┬───────────┴───────────────────┘         │
│                     │                                          │
│              ┌──────▼─────────────┐                            │
│              │ 2FA Utilities      │                            │
│              ├────────────────────┤                            │
│              │ generate_2fa_code  │                            │
│              │ verify_2fa_code    │                            │
│              │ send_2fa_email     │                            │
│              │ is_user_blocked    │                            │
│              │ clear_2fa_...      │                            │
│              └──────┬──────────┬──┘                            │
│                     │          │                               │
└─────────────────────┼──────────┼───────────────────────────────┘
                      │          │
          ┌───────────┘          └───────────┐
          │                                  │
          ▼                                  ▼
     ┌─────────────┐              ┌──────────────────┐
     │   Redis     │              │  Django ORM      │
     ├─────────────┤              ├──────────────────┤
     │ 2fa_code:*  │              │ LocalUser Model  │
     │ 2fa_failed:*│              │ (database)       │
     │ 2fa_blocked:│              │                  │
     └─────────────┘              └──────────────────┘
          (5 min TTL)             (persistent)
```

## Registration Flow - Detailed Sequence

```
User                Frontend           Django Backend               Redis              Database
 │                   │                   │                           │                  │
 │─ Fill Form ─────▶ │                   │                           │                  │
 │                   │─ POST /register──▶│                           │                  │
 │                   │                   │─ Validate input ─────────▶│                 │
 │                   │                   │◀─ (check exists)          │                  │
 │                   │                   │─ Create User ────────────────────────────▶ │
 │                   │                   │◀──────────────────────────────────────────  │
 │                   │                   │─ generate_2fa_code ────▶ │ SETEX            │
 │                   │                   │   (123456)             │ 2fa_code:123     │
 │                   │                   │◀─────────────────────────  300s TTL         │
 │                   │                   │─ send_2fa_email ─────────────────────────▶ │
 │                   │                   │   (Console Output)       │                  │
 │                   │◀─ 201 + user_id──│                           │                  │
 │                   │  {status:2fa_pending}                                          │
 │                   │                   │                           │                  │
 │◀─ Show 2FA Form──│                   │                           │                  │
 │                   │                   │                           │                  │
 │ Check Email       │                   │                           │                  │
 │ 📧 Code: 123456   │                   │                           │                  │
 │                   │                   │                           │                  │
 │─ Enter: 123456 ──▶│                   │                           │                  │
 │                   │─ POST /verify────▶│                           │                  │
 │                   │                   │─ GET from Redis ────────▶│ GET              │
 │                   │                   │◀─ "123456" ──────────────  stored code      │
 │                   │                   │─ Compare ✓                │                  │
 │                   │                   │─ Check rate limit ─────▶ │ EXISTS           │
 │                   │                   │◀─ Not blocked ─────────────                 │
 │                   │                   │─ DEL Redis key ────────▶ │ DELETE           │
 │                   │                   │─ Update User ────────────────────────────▶ │
 │                   │                   │   (is_2fa_verified=True) │                  │
 │                   │                   │◀──────────────────────────────────────────  │
 │                   │                   │─ Create Session ─────────────────────────▶ │
 │                   │                   │   (Django session)       │                  │
 │                   │◀─ 200 + user ────│                           │                  │
 │                   │  {status:registered}                                           │
 │◀─ Dashboard ─────│                   │                           │                  │
```

## Rate Limiting State Machine

```
                    ┌──────────────┐
                    │   START      │
                    │ (0 attempts) │
                    └──────┬───────┘
                           │
                    Verify Code
                           │
                    ┌──────┴──────┐
                    │             │
                VALID         INVALID
                    │             │
                    │      Increment Counter
                    │             │
                    │      ┌──────▼──────┐
                    │      │   Is Count  │
                    │      │    >= 3?    │
                    │      └──┬─────┬────┘
                    │         │     │
                    │        NO    YES
                    │         │     │
                    │         │     └──────────────────┐
                    │         │                       │
                    │      ┌──▼──────────┐      ┌──────▼──────────┐
                    │      │ 2-3 attempts│      │  BLOCKED (10m)  │
                    │      │ Try again   │      │  Rate Limited   │
                    │      │ (expires)   │      │  429 Error      │
                    │      └──┬──────────┘      └──────┬──────────┘
                    │         │                       │
         ┌──────────┴─────┐   │     ┌─────────────────┘
         │                │   │     │ (After 10 min)
      ┌──▼──────┐         │   │  ┌──▼────────────┐
      │ DELETE  │         │   │  │ Auto-Clear   │
      │ All Keys│         │   │  │ Redis Block  │
      │ Success │         │   │  └──────────────┘
      └─────────┘         │   │
                          │   │
                  ┌───────┴───┴─┐
                  │    RESET    │
                  │(Loop or End)│
                  └─────────────┘
```

## Error Response Decision Tree

```
Request 
verify-2fa
      │
      ├─ user_id or code missing?
      │  └─ Return 400 (Bad Request)
      │
      ├─ User not found?
      │  └─ Return 404 (Not Found)
      │
      ├─ User already verified?
      │  └─ Return 400 (Already Done)
      │
      ├─ User is blocked (2fa_blocked:*)?
      │  └─ Return 429 (Rate Limited)
      │
      ├─ No 2FA code in Redis (expired)?
      │  └─ Return 400 + "code expired"
      │
      ├─ Code doesn't match?
      │  ├─ Increment failure counter
      │  ├─ Failure count >= 3?
      │  │  ├─ YES: Block user (10 min), Return 429
      │  │  └─ NO:  Show attempts left, Return 400
      │  └─ Return error
      │
      └─ Code matches?
         ├─ Delete Redis key
         ├─ Update DB (is_2fa_verified=True)
         ├─ Create session
         └─ Return 200 + user object
```

## Redis Key Lifecycle

```
Timeline of a Successful Registration:

T=0s   │ POST /register
       │ ├─ SETEX "2fa_code:123" 300 "123456"
       │ └─ SETEX "2fa_failed:123" 600 "0"
       │
T=60s  │ User reads email
       │
T=120s │ POST /verify-2fa (correct code)
       │ ├─ GET "2fa_code:123" → "123456" ✓
       │ ├─ DEL "2fa_code:123"  (prevent reuse)
       │ ├─ DEL "2fa_failed:123" (clear counter)
       │ └─ CREATE Django session
       │
T=180s │ User dashboard loaded
       │ ├─ GET /api/auth/me/
       │ └─ Session retrieved (user authenticated)
       │

Timeline of a Failed Registration (Rate Limited):

T=0s   │ SETEX "2fa_code:456" 300 "654321"
       │ SETEX "2fa_failed:456" 600 "0"
       │
T=30s  │ POST /verify-2fa (wrong code)
       │ └─ INCR "2fa_failed:456" → 1
       │
T=60s  │ POST /verify-2fa (wrong code)
       │ ├─ INCR "2fa_failed:456" → 2
       │ └─ Return "2 attempts remaining"
       │
T=90s  │ POST /verify-2fa (wrong code)
       │ ├─ INCR "2fa_failed:456" → 3
       │ ├─ SETEX "2fa_blocked:456" 600 "1"
       │ └─ Return 429 "Too many attempts"
       │
T=100s │ POST /verify-2fa
       │ ├─ EXISTS "2fa_blocked:456" → 1
       │ └─ Return 429 (Blocked)
       │
T=610s │ Auto-Expire: "2fa_blocked:456" removed
       │ User can now try again
```

## Component Interaction Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                   User Journey                               │
└──────────────────────────────────────────────────────────────┘

┌─ REGISTRATION STAGE ──────────────────────┐
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  RegistrationForm                    │ │  
│  │  Props: onSuccess() callback         │ │
│  │  State: form data, loading, error    │ │
│  │  Action: POST /api/auth/register/    │ │
│  │  Result: { user_id, email }          │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  On Success → Trigger onRegistrationSuccess
│  └─ Pass user_id and email to parent
│                                            │
└────────────────────────────────────────────┘
                    ↓
        [Component State Update]
            stage = '2fa'
            userId = 123
            email = 'user@...'
                    ↓
┌─ VERIFICATION STAGE ──────────────────────┐
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  Verify2FAForm                       │ │
│  │  Props:                              │ │
│  │    - userId: 123                     │ │
│  │    - email: 'user@...'               │ │
│  │    - onSuccess() callback            │ │
│  │                                      │ │
│  │  State:                              │ │
│  │    - code: '123456'                  │ │
│  │    - loading: false                  │ │
│  │    - error: null                     │ │
│  │    - attemptsLeft: null              │ │
│  │                                      │ │
│  │  Actions:                            │ │
│  │    - handleCodeChange(e)             │ │
│  │    - handleVerify(code)              │ │
│  │    - handleResend()                  │ │
│  │                                      │ │
│  │  POST /api/auth/verify-2fa/          │ │
│  │  Response: { status, user, message } │ │
│  │  Session: CREATED                    │ │
│  │                                      │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  On Success → Trigger onVerificationSuccess
│  └─ Pass user object to parent
│                                            │
└────────────────────────────────────────────┘
                    ↓
        [Container Navigation]
            navigate('/dashboard')
            or
            route.push('/game')
```

## Security Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│               Security Checkpoints                          │
└─────────────────────────────────────────────────────────────┘

Input Validation
├─ Field presence checks
├─ Email format validation
├─ Username uniqueness check
└─ Password strength (frontend only)
        ↓
User Creation
├─ Transaction-based creation
├─ Rollback on failure
└─ Default is_2fa_verified=False
        ↓
Code Generation & Storage
├─ Random 6-digit code (0-999999)
├─ Redis storage (not database)
├─ 5-minute TTL (auto-expire)
└─ Encryption at Redis level (if configured)
        ↓
Email Delivery
├─ DjangoSmtpBackend (production)
├─ ConsoleBackend (development)
└─ HTML + plain-text versions
        ↓
Code Verification
├─ Redis key existence check
├─ String comparison (constant-time ideal)
├─ Failure counter management
└─ Rate limiting enforcement
        ↓
Rate Limiting
├─ Track: 2fa_failed:{user_id}
├─ Limit: 3 attempts
├─ Block: 2fa_blocked:{user_id}
├─ Duration: 10 minutes
└─ Auto-clear: Redis TTL
        ↓
Success Path
├─ Delete code (prevent reuse)
├─ Clear failure counter
├─ Update DB (is_2fa_verified=True)
├─ Create Django session
├─ Return session cookie
└─ User authenticated
```

---

Use these diagrams in documentation, onboarding, or team discussions!
