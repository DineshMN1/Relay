# Relay

A crowd-sourced parcel delivery platform. Senders post delivery requests; travellers passing through the same route pick them up and earn money.

---

## How it works

1. **Sender** posts a parcel with pickup and drop locations
2. System fetches the route from OSRM and checks all active traveller trips for a corridor match
3. **Traveller** posts their trip, sees matched parcels along their route, and accepts one
4. Delivery is confirmed at both ends with a 4-digit OTP
5. Carrier's wallet is credited on successful delivery

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL via Prisma ORM |
| Auth | Email OTP + JWT (HttpOnly cookie) |
| Email | Resend |
| Routing | OSRM (open-source, free) |
| Geospatial | Turf.js |
| Geocoding | Nominatim (OpenStreetMap) |
| Icons | Lucide React |
| Styling | Tailwind CSS |
| PWA | @ducanh2912/next-pwa |

---

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Resend account (free tier at resend.com)

---

## Setup

**1. Clone and install**

```bash
git clone <repo-url>
cd relay
npm install
```

**2. Configure environment**

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://user:password@host:port/dbname"
JWT_SECRET="your-random-secret-min-32-chars"
RESEND_API_KEY="re_your_resend_api_key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**3. Push database schema**

```bash
npm run db:push
```

**4. Start development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens (min 32 chars) |
| `RESEND_API_KEY` | Yes | API key from resend.com |
| `NEXT_PUBLIC_APP_URL` | Yes | Base URL of the app |

---

## Available scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run db:push      # Sync schema to database (no migration history)
npm run db:migrate   # Run migrations (production)
npm run db:studio    # Open Prisma Studio (DB GUI)
npm run db:generate  # Regenerate Prisma client
```

---

## Project structure

```
app/
├── api/
│   ├── auth/
│   │   ├── send-otp/      # Send OTP to email
│   │   ├── verify-otp/    # Verify OTP, issue JWT cookie
│   │   ├── logout/        # Clear session cookie
│   │   └── me/            # Get current user
│   ├── trips/
│   │   ├── route.ts       # GET list, POST create trip
│   │   └── [id]/          # GET, PATCH (edit time), DELETE (cancel)
│   ├── parcels/
│   │   ├── route.ts       # GET list, POST create parcel
│   │   └── [id]/
│   │       ├── accept/    # Carrier accepts parcel
│   │       ├── pickup/    # Confirm pickup via OTP
│   │       └── deliver/   # Confirm delivery via OTP + credit wallet
│   ├── location/          # Update carrier's live location
│   ├── geocode/           # Location search via Nominatim
│   └── profile/           # GET profile + transactions, PATCH update name
├── dashboard/             # Home screen
├── login/                 # Email OTP auth
├── send/                  # Post a parcel
├── travel/                # Post a trip
├── trips/[id]/            # Trip detail, edit, cancel
├── parcels/[id]/          # Parcel detail + OTP actions
└── profile/               # User profile, wallet, ratings

components/
├── Navbar.tsx             # Top bar + mobile bottom nav
└── LocationSearch.tsx     # Geocoding search input

lib/
├── prisma.ts              # Prisma client singleton
├── auth.ts                # JWT sign/verify, session helpers, OTP generator
├── resend.ts              # Transactional email
├── route-match.ts         # OSRM route fetch + Turf.js corridor matching
└── utils.ts               # cn(), formatCurrency(), formatDate()

prisma/
└── schema.prisma          # DB schema
```

---

## API reference

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/send-otp` | Send OTP to email |
| POST | `/api/auth/verify-otp` | Verify OTP, set session cookie |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Current authenticated user |

### Trips

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/trips` | Create a trip (fetches OSRM route) |
| GET | `/api/trips` | List active trips |
| GET | `/api/trips/:id` | Trip detail with accepted parcels |
| PATCH | `/api/trips/:id` | Edit departure time |
| DELETE | `/api/trips/:id` | Cancel trip |

### Parcels

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/parcels` | Create parcel (auto-matches with active trips) |
| GET | `/api/parcels?role=sender` | Sender's own parcels |
| GET | `/api/parcels?role=carrier` | Available parcels for carriers |
| POST | `/api/parcels/:id/accept` | Carrier accepts a parcel |
| POST | `/api/parcels/:id/pickup` | Confirm pickup with OTP |
| POST | `/api/parcels/:id/deliver` | Confirm delivery with OTP, credit wallet |

### Other

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/location` | Update carrier's current coordinates |
| GET | `/api/geocode?q=query` | Search locations via Nominatim |
| GET | `/api/profile` | User profile, wallet, transactions, ratings |
| PATCH | `/api/profile` | Update display name |

---

## Parcel lifecycle

```
POSTED → MATCHED → ACCEPTED → PICKED_UP → DELIVERED
                ↘ CANCELLED
                ↘ EXPIRED
```

- **POSTED** — created, no carrier assigned
- **MATCHED** — a traveller route overlaps, awaiting acceptance
- **ACCEPTED** — carrier accepted, waiting for pickup OTP
- **PICKED_UP** — pickup OTP verified, in transit
- **DELIVERED** — drop OTP verified, carrier wallet credited

---

## Route matching

When a parcel is posted, the system checks all active trips:

1. Each trip stores its full route geometry (GeoJSON LineString from OSRM)
2. Turf.js checks if the parcel's pickup point is within **1.5 km** of the route
3. Turf.js checks if the drop point is also within **1.5 km** and comes **after** the pickup along the route direction
4. First matching trip is linked to the parcel

---

## OTP verification flow

```
Sender creates parcel
  → receives pickupOtp + dropOtp

At pickup:
  Sender shows pickupOtp → Carrier enters it → Status: PICKED_UP

At drop:
  Recipient shows dropOtp → Carrier enters it → Status: DELIVERED
                                               → Carrier wallet credited
```

---

## PWA

The app is installable as a PWA on Android and iOS.

- Service worker is generated automatically on `npm run build`
- Service worker is **disabled in development** to avoid caching issues
- To test PWA install: run `npm run build && npm run start`, then open on mobile

---

## Notes for development

- In development, OTP emails are not sent. The OTP is returned directly in the API response and auto-filled in the login form.
- To send real emails in production, verify a domain at resend.com and update the `from` address in `lib/resend.ts`.
- OSRM public instance (`router.project-osrm.org`) is used for routing. For production with high traffic, consider self-hosting OSRM or using a paid routing API.
