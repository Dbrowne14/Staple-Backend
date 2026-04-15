# 📦 Staple Backend

A Node.js + Express backend written in TypeScript, connected to a PostgreSQL database using `pg`. The project supports development with hot reload and production builds using compiled JavaScript.

---

## 🚀 Tech Stack

- Node.js
- Express
- TypeScript
- PostgreSQL (`pg`)
- node-cron (scheduled tasks)
- CORS

---

## 📁 Project Structure

[App Structure](./public/StapleAppStructure.png)

---

## 📥 Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd staple_backend
```

### 2.Install dependencies

```bash
npm install
```
Production dependencies

```bash
npm install express cors pg node-cron
```

Development dependencies

```bash
npm install -D typescript tsx ts-node @types/node @types/express @types/cors @types/pg
```

### 3.Running the Project

Development

```bash
npm run dev
```

```bash
npm run build
npm start
```