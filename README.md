# 🍜 Reelbite — Food Delivery, Discovered Through Reels

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.0-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.IO-Realtime-010101?style=flat&logo=socket.io&logoColor=white)](https://socket.io/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Reelbite** is a next-generation full-stack food delivery platform with a game-changing twist: instead of scrolling through static, boring menus, users discover culinary delights through an **immersive, TikTok-style short-video reel feed**, ranked in real-time by a custom heuristic recommendation engine blending content filtering, implicit collaborative signals, and cold-start personalization.

Built as an enterprise-grade MERN application with real-time delivery tracking, Razorpay payment processing, and three distinct user roles with dedicated dashboards.

---

## ✨ Core Highlights & Features

### 🎬 TikTok-Style Food Discovery (Reels Feed)
- **Unified Vertical Ratio (9:16):** Seamless smartphone-ratio container on desktop and native view on mobile screens.
- **One Reel at a Time:** Intersection-observer-backed snap scrolling ensuring only the single active video plays at any time, saving bandwidth and battery.
- **Interactive Action Overlay:** Heart-reaction animations, one-tap add-to-cart, share sheet, and direct navigation to restaurant menus.
- **Diet & City Filtering:** Instantly filter reels by veg/all dietary preferences and current delivery city.
- **Creator Studio for Owners:** Restaurant owners can upload vertical dish videos directly with Cloudinary media processing and link them to menu items.

### 🧠 The Recommendation Engine
The reel discovery algorithm (`GET /api/reels` via `backend/controllers/reel.controllers.js`) is an adaptive, multi-stage pipeline:
1. **Hard Filters:** First partitions candidates by current city and veg/non-veg dietary preference.
2. **Affinity Scoring:** Evaluates user interaction history (cart adds, likes, shares, watch duration percentage, skip penalties) with **exponential time decay**.
3. **Composite Scoring:** Dynamic blending of `affinity × popularity × recency`.
4. **Cold-Start Onboarding:** New users seed their affinity profile via a cuisine preference selector (`preferredCuisines`) instead of a generic popularity feed.
5. **Exploration Diversity:** Softmax-weighted rotation across affinity categories prevents filter bubbles (~20% intentional serendipity).
6. **Session-Aware In-Memory Deduplication:** Client session passes `excludeIds` and `penalizedCategories` so users never see duplicate reels in a session.
7. **Tunable Weights:** Centralized weight configuration in [`backend/config/recommendationWeights.js`](backend/config/recommendationWeights.js).

### 👥 Three Dedicated User Roles
- **Customer (`user`):**
  - Location-aware shop and menu discovery (by city & GPS coordinates).
  - Reel feed browsing with instant carting and order placement.
  - Razorpay payment gateway integration with signature verification.
  - Live order progress and driver map tracking via Socket.IO.
- **Restaurant Owner (`owner`):**
  - Shop registration, branding, and location configuration.
  - Full menu catalog management (dishes, pricing, categories, veg/non-veg flags).
  - Reel video management (upload, preview, delete).
  - Real-time incoming order notifications, order state transitions (Pending $\rightarrow$ Preparing $\rightarrow$ Out for Delivery).
  - Payout & earnings dashboard with settlement tracking.
- **Delivery Partner (`deliveryBoy`):**
  - Available assignment pool in their operational city.
  - Assignment acceptance and route guidance.
  - Secure **OTP-based delivery confirmation** before completing drop-off.
  - Daily delivery performance metrics and history.

### 🔐 Authentication & Security Hardening
- Secure cookie-based JWT authentication with `httpOnly`, `sameSite`, and production `secure` flags.
- Dual authentication options: Standard email/password (with Nodemailer OTP password reset) and Firebase Google OAuth.
- Strict authorization middleware (`isAuth`, `isOwner`, `isDeliveryBoy`) enforcing endpoint protection.
- Zero hardcoded secrets; full environment variable isolation.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Redux Toolkit, React Router 7, Tailwind CSS, Vite |
| **Backend** | Node.js, Express 5, Socket.IO |
| **Database** | MongoDB + Mongoose ODM |
| **Authentication** | JWT (HTTP-only cookies), bcryptjs, Firebase Auth |
| **Media Handling** | Cloudinary API, Multer (memory storage) |
| **Payments** | Razorpay Node SDK & Checkout Webhook / Verification |
| **Mapping & Geo** | Leaflet, React-Leaflet, Geoapify API |
| **Mailing** | Nodemailer (SMTP OTP delivery) |
| **Deployment & Containers** | Docker, Docker Compose, Nginx |

---

## 📁 Repository Structure

```
Reelbite-food-delivery/
├── backend/
│   ├── config/            # DB connection & recommendation scoring weights
│   ├── controllers/       # Business logic (auth, user, shop, item, order, reel, payout)
│   ├── middlewares/       # Auth guards, role checks, file upload
│   ├── models/            # Mongoose schemas (User, Shop, Item, Order, Reel, Rating)
│   ├── routes/            # REST API routers mounted under /api/*
│   ├── utils/             # Cloudinary upload, email transport, split payout helpers
│   ├── socket.js          # Real-time WebSocket handlers for delivery tracking
│   ├── index.js           # Server bootstrap
│   └── Dockerfile
├── frontend/
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # Reusable UI components (Navbar, Reels, Maps, Cart, Cards)
│   │   ├── pages/         # Route pages (Home, Reels, Shop, Orders, Checkout, Dashboards)
│   │   ├── redux/         # Redux Toolkit store and feature slices
│   │   └── hooks/         # Geolocation, current order, and shop custom hooks
│   ├── firebase.js        # Firebase Client SDK initialization
│   └── Dockerfile
├── docker-compose.yml     # Multi-container orchestration (App + Mongo + Nginx)
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher) and `npm`
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas URI)
- [Cloudinary](https://cloudinary.com/) Account (Cloud name, API Key, API Secret)
- [Razorpay](https://razorpay.com/) Account (Test Key ID and Secret)
- [Firebase](https://console.firebase.google.com/) Project (for Google Authentication)

---

### Local Setup

#### 1. Clone the repository
```bash
git clone https://github.com/IpsitaKumarKishan/Reelbite-food-delivery.git
cd Reelbite-food-delivery
```

#### 2. Configure Backend
```bash
cd backend
npm install
```
Create a `.env` file inside `backend/`:
```env
PORT=5000
MONGODB_URL=mongodb://localhost:27017/reelbite
JWT_SECRET=your_super_secret_jwt_key
FRONTEND_URL=http://localhost:5173

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Nodemailer SMTP
EMAIL=your_email@gmail.com
PASS=your_email_app_password
```
Run the backend development server:
```bash
npm run dev
```

#### 3. Configure Frontend
Open a new terminal tab and navigate to `frontend`:
```bash
cd frontend
npm install
```
Create a `.env` file inside `frontend/`:
```env
VITE_SERVER_URL=http://localhost:5000
VITE_GEOAPIKEY=your_geoapify_api_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id

# Firebase Client
VITE_FIREBASE_APIKEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```
Start the frontend development server:
```bash
npm run dev
```
Visit `http://localhost:5173` in your browser.

---

### 🐳 Docker Compose Setup

Run the entire stack (MongoDB, Backend, and Nginx-served Frontend) with a single command:

```bash
docker compose up --build
```
- **Frontend:** `http://localhost` (Port 80)
- **Backend API:** `http://localhost:5000`
- **MongoDB:** Internal container network

---

## 📡 REST API Overview

All routes are mounted under `/api`. Routes with 🔒 require valid JWT session cookie.

| Module | Method | Endpoint | Access | Description |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/auth/signup` | Public | Register new user account |
| | `POST` | `/api/auth/signin` | Public | Login with email and password |
| | `GET` | `/api/auth/signout` | Public | Clear JWT authentication cookie |
| | `POST` | `/api/auth/google-auth` | Public | Google OAuth login/signup |
| | `POST` | `/api/auth/send-otp` | Public | Send password reset OTP |
| | `POST` | `/api/auth/verify-otp` | Public | Validate received OTP |
| | `POST` | `/api/auth/reset-password` | Public | Set new password |
| **Reels** | `GET` | `/api/reels` | Public/Optional | Get ranked personalized reel feed |
| | `POST` | `/api/reels` | 🔒 Owner | Upload and publish a dish reel |
| | `PATCH` | `/api/reels/:id/like` | 🔒 User | Toggle like on a reel |
| | `POST` | `/api/reels/:id/interaction` | 🔒 User | Log watch duration / interaction signals |
| | `DELETE` | `/api/reels/:id` | 🔒 Owner | Delete own reel |
| **Shop** | `POST` | `/api/shop/create-edit` | 🔒 Owner | Create or update restaurant shop profile |
| | `GET` | `/api/shop/get-my` | 🔒 Owner | Get current owner's restaurant profile |
| | `GET` | `/api/shop/get-by-city/:city` | 🔒 User | Get restaurants in specific city |
| **Items** | `POST` | `/api/item/add-item` | 🔒 Owner | Add dish to restaurant menu |
| | `POST` | `/api/item/edit-item/:itemId`| 🔒 Owner | Edit menu item details |
| | `GET` | `/api/item/get-by-city/:city`| 🔒 User | Get menu items by city |
| | `GET` | `/api/item/search-items` | 🔒 User | Search menu items |
| | `POST` | `/api/item/rating` | 🔒 User | Submit rating & review for dish |
| **Orders**| `POST` | `/api/order/place-order` | 🔒 User | Create new order and Razorpay order |
| | `POST` | `/api/order/verify-payment` | 🔒 User | Verify Razorpay payment signature |
| | `GET` | `/api/order/my-orders` | 🔒 User | Get customer order history |
| | `GET` | `/api/order/get-assignments`| 🔒 Delivery | Get active assignments for delivery partner |
| | `POST` | `/api/order/send-delivery-otp`| 🔒 Delivery | Dispatch drop-off confirmation OTP |
| | `POST` | `/api/order/verify-delivery-otp`| 🔒 Delivery | Verify OTP and complete delivery |
| **Payouts**| `GET` | `/api/payouts/owner` | 🔒 Owner | Get owner earnings overview |
| | `POST` | `/api/payouts/settle` | 🔒 Owner | Request payout settlement |

---

## 👨‍💻 Author

**Ipsita Kumar Kishan**
- GitHub: [@IpsitaKumarKishan](https://github.com/IpsitaKumarKishan)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
