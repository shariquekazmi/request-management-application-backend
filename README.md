✅ How to Run the Application
## 🚀 How to Run the Application

Follow these steps to run the backend locally:

### 1️⃣ Install dependencies
```bash
npm install

2️⃣ Create a .env file in the root directory
PORT=5000
HOST=localhost
PSQL_PORT=5432
USERNAME=postgres
PASSWORD=postgres
DB_NAME=req-db

ACCESS_TOKEN_SECRET=youraccesstokensecret
REFRESH_TOKEN_SECRET=yourrefreshtokensecret

3️⃣ Start PostgreSQL Server


4️⃣ Run database migrations (create tables)
npm run migrate

5️⃣ Start the backend server
npm run dev


Your server will now be running at: http://localhost:5000


# Request Management Application

A full-stack Request Management system whose backend built with **Node.js**, **Express**, **PostgreSQL**, and **JWT authentication**.  
Employees can create requests assigned to another employee, and managers can approve or reject them.  
Once approved, the assigned employee can take action and close the request.

This project demonstrates:

✔ Backend architecture  
✔ Business rule enforcement  
✔ Authentication & Authorization  
✔ Clean code, validations, logging  
✔ REST APIs  
✔ Basic frontend integration

---

## 🚀 Features

### 👤 Authentication
- User Signup (Employee / Manager)
- Login
- JWT Access Token + Refresh Token
- Role-based access control

### 📝 Request Workflow
- Employee creates request → assigned to another employee
- Assigned employee’s **manager** approves or rejects
- Employee can **ACTION** and **CLOSE** the request after approval
- Request history is logged for every action

### 🔐 Role Permissions
| Role | Permissions |
|------|-------------|
| **Manager** | Approve/Reject requests under them |
| **Employee** | Create requests, perform ACTION and CLOSE |

### 📊 Data Access Rules
- Employees can view:  
  - Requests **they created**  
  - Requests **assigned to them**  
- Managers can view:  
  - Requests under their supervision

---

## 🛠️ Tech Stack

### Backend
- Node.js
- Express.js
- PostgreSQL
- JWT Auth
- Joi Validation
- Custom Logger
- bcrypt
