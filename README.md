# RailConnect — Railway Booking & Management Platform

A full-stack railway booking, delay tracking, and in-train food ordering platform. RailConnect supports both **local (Mumbai suburban)** and **express** trains with an integrated smart AI assistant.

---

## 🚀 Key Features

1. **User Authentication & Dashboard**
   - Secure sign-up/login (JWT-based).
   - Personal passenger dashboard to view ticket history, cancel bookings, and look up active PNRs.

2. **Train Search & Instant Booking**
   - Search trains between stations for a selected date.
   - Choose travel classes (Sleeper, 3AC, 2AC, 1AC, or General).
   - Instantly generates passenger PNRs, coach allocations, and seat numbers.

3. **Live Timetable & Delay Tracking**
   - Browse schedules of all trains.
   - Live color-coded status indicators (Green: On-time, Yellow: Moderate delay, Red: Major delay).

4. **In-Train Food Ordering**
   - Browse partner restaurants and food vendors located at upcoming stations.
   - Order food items (breakfast, lunch, snacks, veg/non-veg) delivered directly to your coach and seat.

5. **Smart AI Travel Assistant**
   - Interactive chatbot bubble on the page to search trains, get live delays, check menu items, or view cancellation/refund policies.

6. **Admin Dashboard**
   - Manage active trains, adjust schedules, and post live delay updates.

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | [Next.js 14](https://nextjs.org/) (App Router) + TypeScript | Modern React framework for routing and UI |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + Lucide Icons | Responsive styling and custom designs |
| **Backend** | [Node.js](https://nodejs.org/) + [Express.js](https://expressjs.com/) | REST API server |
| **Database** | [SQLite](https://www.sqlite.org/) via [Prisma ORM](https://www.prisma.io/) | Light-weight schema modeling and query handling |
| **Auth** | JSON Web Tokens (JWT) | Secure stateless session management |

---

## 📁 Project Structure

```text
rail/
├── frontend/                  # Next.js Web App
│   ├── app/                   # App Router pages (auth, booking, dashboard, timetable, etc.)
│   ├── components/            # UI components (AI Assistant, Train cards, forms)
│   └── lib/                   # API client layer and auth helpers
│
└── backend/                   # Express REST API
    ├── prisma/                # SQLite database schema, migration files, and seed scripts
    └── src/
        ├── routes/            # Routes (Auth, Trains, Bookings, Timetable, Food, AI Assistant)
        ├── middleware/        # JWT auth and rate limiting middlewares
        └── index.ts           # App entry point
```

---

## ⚙️ Running Locally

### 1. Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the environment:
   - Create a `.env` file in `/backend` (if it does not exist) and add:
     ```env
     DATABASE_URL="file:./railway.db"
     JWT_SECRET="your_jwt_secret_key"
     PORT=4000
     ```
4. Setup the database and seed it with mock train data:
   ```bash
   npm run db:reset
   ```
5. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The server runs on http://localhost:4000.*

---

### 2. Frontend Setup
1. Open another terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the environment:
   - Create a `.env.local` file in `/frontend` (if it does not exist) and add:
     ```env
     NEXT_PUBLIC_API_URL="http://localhost:4000/api"
     ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *The frontend runs on http://localhost:3000.*
