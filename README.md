# Request Management Application

A full-stack **Request Management System** built with **Node.js**, **Express.js**, **PostgreSQL**, and **JWT authentication**.

Employees can create requests, managers can approve or reject them, and assigned employees can take action and close the request. All actions are logged for better tracking.

**Please create Managers first. Employees require a Manager assignment during creation.**

**Please allow up to 30 seconds for the first API request. Render’s free-tier server may need time to wake up.**

---

## 🚀 How to Run the Application (Local Setup)

Follow these steps to run the backend locally:

---

### 1️⃣ Install dependencies

```sh
npm install

2️⃣ Create a .env file in the root directory

PORT=3000 // any number of your choice

# Full PostgreSQL connection string (local or cloud)
DATABASE_URL=postgres://username:password@host:5432/dbname

# JWT secrets
ACCESS_TOKEN_SECRET=youraccesstokensecret
REFRESH_TOKEN_SECRET=yourrefreshtokensecret

3️⃣ Start PostgreSQL (local only)

Make sure PostgreSQL is running on your machine if you're using a local DB.


4️⃣ Run database migrations

npm run migrate

This creates all tables and enums required by the backend.

5️⃣ Start the backend server
npm run dev


Your server will now be available at:

http://localhost:3000  // or the port of your choice.
