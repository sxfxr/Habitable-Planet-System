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
│   ├── schema.sql
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
```

## ⚙️ Setup and Installation

### 1. Clone the repository

```bash
git clone https://github.com/sxfxr/Habitable-Planet-System.git
cd Habitable-Planet-System
```

### 2. Install backend dependencies

```bash
cd Backend
npm install
```

### 3. Create the PostgreSQL database

Create a database named:

```text
habitable_planets
```

Then initialize the tables using the included `schema.sql` file:

```bash
psql -U postgres -d habitable_planets -f schema.sql
```

### 4. Configure environment variables

Create a `.env` file inside the `Backend` directory using `.env.example` as a template:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=habitable_planets
DB_USER=postgres
DB_PASSWORD=your_postgres_password

JWT_SECRET=replace_with_a_long_random_secret
PORT=5000
```

Never commit your real `.env` file or database credentials.

### 5. Start the backend

```bash
node index.js
```

The API will run at `http://localhost:5000`.

### 6. Start the frontend

From the `frontend` directory:

```bash
python -m http.server 5500
```

Then open `http://localhost:5500/za.html` in your browser.

## 🔐 User Roles

The application supports two roles:

- **Viewer** — explore stars, planets and observation data.
- **Researcher** — access protected functionality for adding and updating astronomical data.

Authentication is implemented using JSON Web Tokens (JWT), while passwords are hashed using bcrypt.

## 🧠 Habitability Workflow

```text
Star Data
   ↓
Planet Angular Separation
   ↓
Estimate Orbital Distance
   ↓
Calculate Habitable Zone from Stellar Luminosity
   ↓
Classify Planet
   ↓
Store Observation in PostgreSQL
   ↓
Visualize Result in Three.js
```

## 🔒 Security

Sensitive configuration such as database passwords and JWT secrets is stored using environment variables.

The `.env` file is excluded from version control through `.gitignore`. Only `.env.example`, containing placeholder values, is included in the repository.

## ⚠️ Limitations

- The habitability model is a simplified educational model based primarily on stellar luminosity and estimated orbital distance.
- It does not account for factors such as atmospheric composition, planetary mass, magnetic fields, or detailed climate modelling.
- The project is intended as an interactive full-stack visualization and learning application rather than a professional astronomical analysis tool.

## 👤 Author

**Mohammed Safar**  
B.Tech Computer Science and Engineering  
Rajagiri School of Engineering & Technology

GitHub: [sxfxr](https://github.com/sxfxr)