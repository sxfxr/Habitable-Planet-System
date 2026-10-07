@'
# 🌌 Habitable Planet System

An interactive full-stack web application for exploring stars, planetary systems, and planetary habitability through a 3D space visualization.

The project combines an interactive **Three.js frontend** with a **Node.js/Express REST API**, **PostgreSQL database**, and **JWT-based authentication**.

## 🚀 Features

- Interactive 3D visualization of stars and planetary systems
- Explore planets associated with different stars
- Planet habitability classification
- Researcher and viewer user roles
- User registration and authentication
- JWT-based protected routes
- Add and update astronomical data through the researcher interface
- PostgreSQL-backed storage
- REST API for stars, planets and observations

## 🪐 Habitability Classification

The system performs a simplified habitable-zone assessment using stellar luminosity and planetary orbital distance.

Planets are classified into categories such as:

- 🌿 Inside Habitable Zone
- 🔥 Too Hot
- ❄️ Too Cold

This is intended as an educational visualization and simplified habitability assessment rather than a complete astrophysical habitability model.

## 🛠️ Tech Stack

### Frontend
- HTML
- CSS
- JavaScript
- Three.js
- Tailwind CSS

### Backend
- Node.js
- Express.js
- REST API
- JWT Authentication
- bcrypt

### Database
- PostgreSQL

## 📁 Project Structure

```text
Habitable-Planet-System/
├── Backend/
│   ├── db.js
│   ├── index.js
│   ├── package.json
│   ├── package-lock.json
│   └── .env.example
│
├── frontend/
│   ├── login.html
│   ├── researcher.html
│   └── za.html
│
├── .gitignore
└── README.md