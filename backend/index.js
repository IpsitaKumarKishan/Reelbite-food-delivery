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
      callback(null, true);
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
app.use(express.json())
app.use(cookieParser())
app.use(express.static("public"))
app.use("/api/auth",authRouter)
app.use("/api/user",userRouter)
app.use("/api/shop",shopRouter)
app.use("/api/item",itemRouter)
app.use("/api/order",orderRouter)
app.use("/api/reels",reelRouter)
app.use("/api/payouts",payoutRouter)

socketHandler(io)
server.listen(port,()=>{
    connectDb()
    console.log(`server started at ${port}`)
})

