# 🍜 Reelbite — Food Delivery, Discovered Through Reels

Reelbite is a full-stack food delivery platform with a twist: instead of browsing a static menu, users discover food through a **TikTok-style short-video feed**, ranked by a custom recommendation engine that blends content filtering, implicit collaborative signals, and cold-start personalization.

Built as a MERN application (MongoDB, Express, React, Node) with real-time delivery tracking, Razorpay payments, and three distinct user roles.

---

## ✨ Features

**Marketplace & ordering**
- Location-aware shop and menu browsing (by city)
- Cart, checkout, and Razorpay-backed payment flow
- Real-time order status and delivery tracking via Socket.IO
- OTP-based delivery confirmation

**Three roles, one app**
- `user` — browses, orders, and watches the reel feed
- `owner` — manages their shop, menu items, and food reels; views earnings/payouts
- `deliveryBoy` — accepts assignments, tracks deliveries, confirms drop-off via OTP

**Reel discovery feed (the core differentiator)**
- Short-form vertical video feed of dishes, scoped by city and diet preference (veg/all)
- A hybrid, heuristic recommendation engine ranks the feed per user — see below
- Like, add-to-cart, and share directly from a reel
- Owners upload reels and link them to an existing menu item or create one inline

**Auth**
- Email/password signup with OTP-based password reset
- Google Sign-In (Firebase)

---

## 🧠 The Recommendation Engine

`GET /api/reels` (`getAllReels` in `backend/controllers/reel.controllers.js`) isn't a plain "most recent" or "most liked" query — it's a multi-stage ranking pipeline:

1. **Hard filters** — city and veg/diet preference narrow the candidate pool first.
2. **Affinity scoring** — a user's last 200 interactions are weighted (cart-add, like/share, high-watch%, skip/negative) and rolled into per-category and per-shop affinity, with **exponential time-decay** so recent behavior matters more than old.
3. **Composite scoring** — `affinity × popularity × recency`, blended differently depending on whether the user has enough history, a stated preference, or neither.
4. **Cold-start handling** — brand-new users can seed their affinity from a short onboarding preference picker (`preferredCuisines`) instead of getting a generic popularity dump.
5. **Exploration diversity** — a softmax-weighted rotation across a user's top affinity categories keeps ~20% of the feed exploratory instead of collapsing into one category.
6. **Session-aware dedup & skip penalty** — the frontend tracks already-seen reels and recently-skipped categories in-memory and passes them as query params (`excludeIds`, `penalizedCategories`), so a scroll session never repeats a reel and self-corrects away from things the user is skipping — all without any server-side session store.

All tunable weights live in one place: [`backend/config/recommendationWeights.js`](backend/config/recommendationWeights.js) — no controller logic needs to change to retune the ranking.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Redux Toolkit, React Router, Tailwind CSS, Vite |
| Backend | Node.js, Express 5, Socket.IO |
| Database | MongoDB + Mongoose |
| Auth | JWT (cookie-based), bcrypt, Firebase (Google Sign-In) |
| Media | Cloudinary (reel video & image uploads), Multer |
| Payments | Razorpay |
| Maps / Geo | Leaflet, React-Leaflet |
| Email | Nodemailer (OTP delivery) |
| Infra | Docker, Docker Compose, Nginx (frontend serving) |

---

## 📁 Project Structure

```
Reelbite-food-delivery/
├── backend/
│   ├── config/            # DB connection + recommendation engine weights
│   ├── controllers/       # Route handlers (auth, user, shop, item, order, reel, payout)
│   ├── middlewares/       # Auth guards, ownership checks, file upload (multer)
│   ├── models/            # Mongoose schemas
│   ├── routes/            # Express routers, mounted under /api/*
│   ├── utils/              # Cloudinary, mail, order-split helpers
│   ├── socket.js          # Socket.IO event handlers (live tracking)
│   ├── index.js           # App entrypoint
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/    # Shared UI (cards, nav, maps, dashboards)
│   │   ├── pages/          # Route-level pages (Reels, Shop, Cart, Checkout, …)
│   │   ├── redux/          # Redux Toolkit slices
│   │   └── hooks/          # Location, city, shop/order data hooks
│   └── Dockerfile
└── docker-compose.yml      # backend + frontend + mongodb, one command
```

---

## 🚀 Getting Started (local, without Docker)

### Prerequisites
- Node.js 18+ and npm
- A MongoDB instance (local or Atlas)
- Cloudinary account (for reel/image uploads)
- Razorpay account (for payments)
- Firebase project (for Google Sign-In)

### 1. Clone
```bash
git clone https://github.com/IpsitaKumarKishan/Reelbite-food-delivery.git
cd Reelbite-food-delivery
```

### 2. Backend setup
```bash
cd backend
npm install
```
Create `backend/.env`:
```env
PORT=5000
MONGODB_URL=mongodb://localhost:27017/reelbite
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

EMAIL=your_smtp_email
PASS=your_smtp_app_password
```
```bash
npm run dev
```

### 3. Frontend setup
```bash
cd ../frontend
npm install
```
Create `frontend/.env`:
```env
VITE_SERVER_URL=http://localhost:5000
VITE_GEOAPIKEY=your_geoapify_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id

VITE_FIREBASE_APIKEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```
```bash
npm run dev
```

The app will be running at `http://localhost:5173` (frontend) and `http://localhost:5000` (backend API).

---

## 🐳 Getting Started (Docker Compose)

A one-command setup is included, running MongoDB, the backend, and an Nginx-served frontend build together.

```bash
# from the repo root, with backend/.env already created (see above)
docker compose up --build
```

- Frontend → `http://localhost` (port 80)
- Backend API → `http://localhost:5000`
- MongoDB → internal to the Docker network only (not exposed to host by default)

The compose file reads `backend/.env` directly for backend secrets, and overrides `MONGODB_URL` to point at the containerized Mongo service. Frontend Firebase/Razorpay/Geoapify keys are passed as build args — set them as environment variables before running `docker compose up`, or edit the defaults in `docker-compose.yml`.

---

## 📡 API Reference

All routes are prefixed with `/api`. Routes marked 🔒 require authentication (JWT cookie).

### Auth — `/api/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/signup` | Create account |
| POST | `/signin` | Email/password login |
| GET | `/signout` | Clear session |
| POST | `/send-otp` | Send password-reset OTP |
| POST | `/verify-otp` | Verify OTP |
| POST | `/reset-password` | Reset password |
| POST | `/google-auth` | Google Sign-In |

### User — `/api/user` 🔒
| Method | Path | Description |
|---|---|---|
| GET | `/current` | Get logged-in user |
| POST | `/update-location` | Update geolocation |
| PUT | `/diet-preference` | Set veg/all preference |
| PATCH | `/preferences` | Save onboarding `preferredCuisines` |
| GET | `/cuisine-categories` | Distinct food categories (for onboarding) |
| GET / POST / PUT / DELETE | `/cart/*` | Cart CRUD |

### Shop — `/api/shop` 🔒
| Method | Path | Description |
|---|---|---|
| POST | `/create-edit` | Create/update owner's shop |
| GET | `/get-my` | Get the logged-in owner's shop |
| GET | `/get-by-city/:city` | Browse shops in a city |

### Items — `/api/item` 🔒
| Method | Path | Description |
|---|---|---|
| POST | `/add-item` | Add a menu item |
| POST | `/edit-item/:itemId` | Edit a menu item |
| GET | `/get-by-id/:itemId` | Get item detail |
| GET | `/delete/:itemId` | Delete item |
| GET | `/get-by-city/:city` | Items available in a city |
| GET | `/get-by-shop/:shopId` | Items for a shop |
| GET | `/search-items` | Search |
| POST | `/rating` | Rate an item |

### Reels — `/api/reels`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | optional | Personalized/ranked reel feed (see engine above) |
| GET | `/owner/:ownerId` | — | Reels for a given owner (dashboard, unranked) |
| POST | `/` | 🔒 owner | Upload a reel |
| PATCH | `/:id/like` | 🔒 | Like/unlike a reel |
| POST | `/:id/interaction` | 🔒 | Log a watch/skip/like/cart interaction |
| DELETE | `/:id` | 🔒 owner | Delete own reel |

### Orders — `/api/order` 🔒
| Method | Path | Description |
|---|---|---|
| POST | `/place-order` | Place an order |
| POST | `/verify-payment` | Verify Razorpay payment |
| GET | `/my-orders` | User's order history |
| GET | `/get-current-order` | Active order |
| GET | `/get-order-by-id/:orderId` | Order detail |
| GET | `/get-assignments` | Delivery boy's assignments |
| GET | `/get-today-deliveries` | Delivery boy's deliveries today |
| GET | `/accept-order/:assignmentId` | Delivery boy accepts an order |
| POST | `/send-delivery-otp` / `/verify-delivery-otp` | Delivery confirmation |
| POST | `/update-status/:orderId/:shopId` | Update order status |

### Payouts — `/api/payouts` 🔒
| Method | Path | Description |
|---|---|---|
| GET | `/owner` | Owner earnings summary |
| POST | `/settle` | Manual settlement |

---

## 🗺 Roadmap

The recommendation engine currently uses heuristic, rule-based scoring (no ML). Planned upgrades include exposure-normalized affinity, content embeddings for "more like this" similarity, and precomputed affinity profiles for scale — see the engine config file for current tunables.

---

## 📄 License

No license file is currently included in this repository.
