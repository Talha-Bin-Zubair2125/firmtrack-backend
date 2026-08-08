# NutroAttend

**A full-stack Employee Attendance & Payroll Deduction Management System**, built for **Nutro Jenix**.

🔗 **Live:** [nutroattend.vercel.app](https://nutroattend.vercel.app/)

NutroAttend replaces manual attendance tracking with a QR-based digital system. Admins manage the workforce and payroll rules from a web dashboard, while employees mark attendance and track their own status through a dedicated mobile app.

This was a collaborative build:
- 🖥️ **Web Application & Backend** — built by **[Talha Bin Zubair](https://github.com/Talha-Bin-Zubair2125)**
- 📱 **Mobile Application** — built by **[Sheikh Muhammad Tahir](https://github.com/sheikhnuml)**

---

## 🧩 System Overview

NutroAttend is split into two connected applications sharing one backend:

| App | Users | Platform | Built By |
|---|---|---|---|
| **Admin Web Portal** | Admin / HR | Web (React) | Talha Bin Zubair |
| **Employee App** | Employees | Mobile | Sheikh Muhammad Tahir |

---

## ✨ Features

### 👨‍💼 Admin Web Portal
- Onboard employees — auto-assigns Employee ID and a default password
- Edit / delete employee records
- **Deduction Rules Engine** — define deduction amounts for Absent, Half-Day, Late, and Leave; deducted automatically from base salary
- **QR Code Generator** for daily attendance
- Live dashboard — Present, Absent, Late, Half-Day, On Leave counts (today + previous day summary)
- Employee directory with designation & joining date
- Per-employee detailed history (attendance log, leave count, punctuality)
- **Monthly Reports** exportable as PDF (jsPDF)
- Admin profile management

### 📱 Employee App
- Secure login with assigned Employee ID & password
- Mark attendance by scanning the admin-generated QR code
- View daily attendance status
- Apply for leave & track remaining leave balance
- Monthly attendance via an interactive calendar view

---

## 🛠️ Tech Stack

**Frontend**
- React (Vite)
- CSS (custom theming)

**Backend**
- Node.js + Express.js
- MongoDB Atlas (cloud database)
- MVC structure — Controllers, Models, Routes, Middlewares

**Key Libraries / Tools**
- `jsPDF` — monthly report generation
- `qrcode` — attendance QR generation
- `Joi` — request/schema validation
- Cookie-based session authentication
- Custom auth & cron middlewares for scheduled attendance tasks

**Deployment**
- Vercel (frontend and backend deployed as separate projects)

---

## 🏗️ Architecture

```
nutroattend/
├── frontend/                # Admin Web Portal (React + Vite)
│   ├── src/
│   │   ├── pages/            # AddEmployee, DeductionSettings, ViewAttendance, Reports, etc.
│   │   ├── stylings/          # Per-page CSS
│   │   ├── context/           # authContext
│   │   └── api/
│   └── ...
│
└── backend/                 # REST API (Node + Express)
    ├── controllers/          # Admin, Attendance, Deduction, Employee, QR
    ├── models/                # Admin, Attendance, Deduction, Employee, QR
    ├── routes/
    ├── middlewares/           # auth, cron
    └── server.js / db.js
```

Both apps are deployed independently on Vercel and communicate over a REST API.

---

## 🚀 Getting Started

### Backend
```bash
cd backend
npm install
# add your .env (DB connection string, JWT/cookie secret, etc.)
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 📌 Roadmap
- Push notifications for leave approval/rejection
- Analytics dashboard for attendance trends
- Role-based access for multiple admins

---

## 🤝 Contributors

| Name | Role | GitHub |
|---|---|---|
| **Talha Bin Zubair** | Web Application & Backend (React, Node.js, Express, MongoDB Atlas) | [@Talha-Bin-Zubair2125](https://github.com/Talha-Bin-Zubair2125) |
| **Sheikh Muhammad Tahir** | Mobile Application | [@sheikhnuml](https://github.com/sheikhnuml) |

---

## 👤 Author

**Talha Bin Zubair**
Full-Stack MERN Developer
[LinkedIn](https://linkedin.com) · [Portfolio](https://talha-bin-zubair2125.github.io/my-portfolio/)

---

*Built for Nutro Jenix to digitize attendance and payroll deduction workflows.*
