# Company Dinner Check-In App

A premium, modern web application for managing guest check-ins at company events.

## Features
- **Split-Screen Scanner**: Camera on the left, guest info on the right.
- **QR Code Recognition**: Scans guest QR codes and retrieves data instantly.
- **Enter Key Shortcuts**: Quick check-in by pressing the Enter key.
- **Admin Panel**: Dashboard for uploading CSV guest lists and monitoring attendance.
- **Dark Mode Design**: High-end aesthetics with glassmorphism effects.

## How to Run

### 1. Start the Backend
```bash
cd server
npm start
```
*The server runs on http://localhost:5000*

### 2. Start the Frontend
```bash
cd client
npm run dev
```
*The app runs on http://localhost:5173*

## CSV Format
Your CSV should have the following headers:
`id, name, department, seating, email`

## Technology Stack
- **Frontend**: Vite + React + html5-qrcode
- **Backend**: Node.js + Express
- **Storage**: JSON-based persistent database (Reliable and portable)
- **Styling**: Vanilla CSS (Premium custom theme)
