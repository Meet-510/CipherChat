# 💬 CipherChat

A real-time full-stack chat application built with the **MERN stack** and **Socket.io**, enabling instant messaging, online user presence, and secure JWT-based authentication.

🔗 **Live Demo:** [https://devtool-mseq.onrender.com/login](https://devtool-mseq.onrender.com/login)

---

## ✨ Highlights

- 🌟 **Tech Stack:** MERN + Socket.io + TailwindCSS + DaisyUI
- 🎃 **Authentication & Authorization** with JWT
- 👾 **Real-time messaging** with Socket.io
- 🚀 **Online user status** tracking
- 👌 **Global state management** with Zustand
- 🐞 **Error handling** on both server and client

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, TailwindCSS, DaisyUI |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Real-time | Socket.io |
| Auth | JSON Web Tokens (JWT) |
| State Management | Zustand |

---

## 🚀 Features

- **Real-time Messaging** — Instant message delivery powered by Socket.io WebSockets
- **Authentication & Authorization** — Secure signup/login with JWT-based session management
- **Online User Presence** — See which users are currently online in real time
- **Responsive UI** — Clean, mobile-friendly interface built with TailwindCSS and DaisyUI
- **Global State Management** — Lightweight and scalable state handling with Zustand
- **Robust Error Handling** — Comprehensive error handling on both the client and server side

---

## ⚙️ Setup & Installation

### Prerequisites

- Node.js installed
- MongoDB instance (local or Atlas)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/cipherchat.git
cd cipherchat
```

### 2. Install dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=5000
NODE_ENV=development
```

### 4. Run the application

```bash
# Run backend and frontend concurrently (from root)
npm run dev
```

The app will be available at `http://localhost:3000`

### 5. Build for production

```bash
npm run build
npm start
```





## 🌐 Deployment

This project is deployed on **Render**. To deploy your own instance:

1. Push your code to a GitHub repository
2. Connect the repo to [Render](https://render.com)
3. Set your environment variables in the Render dashboard
4. Deploy!

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to open a pull request or file an issue.

---
