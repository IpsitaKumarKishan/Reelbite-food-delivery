import express from "express"
import dotenv from "dotenv"
dotenv.config()
import connectDb from "./config/db.js"
import cookieParser from "cookie-parser"
import authRouter from "./routes/auth.routes.js"
import cors from "cors"
import userRouter from "./routes/user.routes.js"
import itemRouter from "./routes/item.routes.js"
import shopRouter from "./routes/shop.routes.js"
import orderRouter from "./routes/order.routes.js"
import reelRouter from "./routes/reel.routes.js"
import payoutRouter from "./routes/payout.routes.js"
import http from "http"
import { Server } from "socket.io"
import { socketHandler } from "./socket.js"
import rateLimit from "express-rate-limit"
import mongoose from "mongoose"
import { ensureIndexes } from "./config/indexes.js"

const app=express()
const server=http.createServer(app)

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:80",
  "http://localhost:5000",
  "http://localhost",
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
};

const io = new Server(server, {
  cors: corsOptions
})

app.set("io", io)

const port = process.env.PORT || 5000
app.use(cors(corsOptions))
app.use(express.json({ limit: "10mb" }))
app.use(cookieParser())
app.use(express.static("public"))

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many attempts, please try again after 15 minutes." }
})

const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { message: "Too many OTP requests, please try again after 5 minutes." }
})

app.use("/api/auth/signin", authLimiter)
app.use("/api/auth/signup", authLimiter)
app.use("/api/auth/send-otp", otpLimiter)
app.use("/api/order/send-delivery-otp", otpLimiter)

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptime: process.uptime()
  })
})

app.use("/api/auth",authRouter)
app.use("/api/user",userRouter)
app.use("/api/shop",shopRouter)
app.use("/api/item",itemRouter)
app.use("/api/order",orderRouter)
app.use("/api/reels",reelRouter)
app.use("/api/payouts",payoutRouter)

socketHandler(io)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.url}:`, err.message || err)
  const status = err.status || 500
  res.status(status).json({
    message: process.env.NODE_ENV === "production"
      ? "Internal Server Error"
      : (err.message || "An unexpected error occurred")
  })
})

const start = async () => {
  try {
    await connectDb()
    await ensureIndexes()
    server.listen(port, () => {
      console.log(`server started at ${port}`)
    })
  } catch (error) {
    console.error("Failed to initialize server:", error)
    process.exit(1)
  }
}

start()

