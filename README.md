# 🚗 RideMate — Smart Carpooling Platform

RideMate is a smart carpooling platform designed to connect people traveling along similar routes. Users can find available rides, share travel costs, and make their daily journeys more affordable, convenient, and sustainable.

## 🌱 Why RideMate?

Rising fuel prices and daily transportation costs can make commuting difficult for students and other regular travelers.

RideMate provides a simple platform where people going in the same direction can discover and join shared rides.

### ✨ Key Benefits

* 🚗 Find rides going your way
* 💰 Share and reduce travel costs
* 🗺️ Search rides by location and date
* 👥 Connect with other riders
* 🛡️ Profile and rating-based trust system
* 🌱 Encourage sustainable transportation
* 📱 Responsive design for different screen sizes

---

## 🖥️ Features

### 🔍 Find a Ride

Users can search for rides using:

* Starting location
* Destination
* Travel date

### 🚘 Offer a Ride

Users can provide their:

* Starting location
* Destination
* Departure date
* Departure time
* Price
* Available seats

### 🤝 Join a Ride

Users can join an available ride and reserve seats.

The available seat count is updated when a booking is created.

### ⭐ Driver Profiles

Ride cards can display:

* Driver name
* Rating
* Number of previous rides
* Route
* Departure time
* Ride price

### 🛡️ Safety & Trust

The platform is designed around verified user information, ratings, and ride history to make shared transportation more transparent.

---

## 🛠️ Tech Stack

### Frontend

* HTML5
* CSS3
* JavaScript

### Backend

* Netlify Functions
* Serverless APIs

### Database

* Netlify Database

### Deployment

* Netlify
* GitHub

---

## 📁 Project Structure

```text
RideMate/
│
├── index.html
├── package.json
├── netlify.toml
│
├── css/
│   └── style.css
│
├── js/
│   └── app.js
│
├── pages/
│   ├── offer-ride.html
│   └── ride-details.html
│
└── netlify/
    └── functions/
        ├── get-rides.js
        ├── search-rides.js
        ├── create-ride.js
        ├── get-ride.js
        ├── join-ride.js
        └── get-bookings.js
```

> The structure may evolve as new features are added.

---

## 🔄 How It Works

```text
User
  │
  ▼
RideMate Website
  │
  │ fetch()
  ▼
Netlify Functions
  │
  ▼
Database
  │
  ├── Users
  ├── Rides
  └── Bookings
```

### Basic Flow

1. User opens RideMate.
2. User searches for a route.
3. Frontend sends the search request to a Netlify Function.
4. The function queries the database.
5. Matching rides are returned.
6. User selects a ride.
7. User can join the ride if seats are available.
8. Booking information is stored in the database.

---

## 🗄️ Database Structure

### Users

| Field       | Description               |
| ----------- | ------------------------- |
| id          | Unique user ID            |
| name        | User's name               |
| email       | User email                |
| phone       | Contact number            |
| rating      | User rating               |
| total_rides | Number of completed rides |
| created_at  | Account creation date     |

### Rides

| Field           | Description        |
| --------------- | ------------------ |
| id              | Unique ride ID     |
| driver_id       | ID of the driver   |
| from_location   | Starting location  |
| to_location     | Destination        |
| departure_date  | Ride date          |
| departure_time  | Departure time     |
| price           | Ride cost          |
| available_seats | Remaining seats    |
| total_seats     | Total seats        |
| status          | Ride status        |
| created_at      | Ride creation date |

### Bookings

| Field        | Description            |
| ------------ | ---------------------- |
| id           | Unique booking ID      |
| ride_id      | Selected ride          |
| passenger_id | Passenger ID           |
| seats        | Number of seats booked |
| status       | Booking status         |
| created_at   | Booking creation date  |

---

## 🔌 API Functions

RideMate uses serverless Netlify Functions instead of connecting the frontend directly to the database.

| Function       | Method | Purpose                    |
| -------------- | ------ | -------------------------- |
| `get-rides`    | GET    | Get available rides        |
| `search-rides` | GET    | Search rides by route/date |
| `create-ride`  | POST   | Create a new ride          |
| `get-ride`     | GET    | Get ride details           |
| `join-ride`    | POST   | Join an available ride     |
| `get-bookings` | GET    | Get user's bookings        |

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/x33khn/RideMate.git
```

### 2. Open the project

```bash
cd RideMate
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run locally

If using Netlify CLI:

```bash
netlify dev
```

The local development server will provide the website and Netlify Functions.

---

## 🔐 Environment Variables

Sensitive database credentials and API keys should **never** be placed directly inside frontend files.

Use Netlify environment variables for sensitive configuration.

Example:

```text
DATABASE_URL=your_database_connection
```

> Actual secrets should not be committed to GitHub.

---

## 🌐 Deployment

RideMate is designed to be deployed using Netlify.

Basic deployment flow:

```text
GitHub Repository
       ↓
     Netlify
       ↓
Netlify Functions
       ↓
   Database
```

Connect the GitHub repository to Netlify and configure the required environment variables.

---

## 🎨 UI Design

RideMate uses a modern dark interface with:

* 🌑 Dark navy background
* 🟢 Green accent color
* ✨ Glassmorphism elements
* 🚗 Car-themed visual design
* 📱 Responsive layout
* 🎯 Simple navigation

The goal is to keep the interface modern while making the core carpooling functionality easy to understand.

---

## 🔮 Future Improvements

Planned improvements can include:

* 🔐 User authentication
* 👤 User profiles
* 📍 Location-based ride matching
* 🗺️ Map integration
* 🔔 Ride notifications
* 💬 Rider/driver communication
* ⭐ Post-ride reviews
* 📊 Ride and cost analytics
* 🧠 Smart route matching
* 📱 Progressive Web App support

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a new branch.

```bash
git checkout -b feature/new-feature
```

3. Make your changes.
4. Commit your changes.

```bash
git commit -m "Add new feature"
```

5. Push the branch.

```bash
git push origin feature/new-feature
```

6. Open a Pull Request.

---

## 📄 License

This project is currently intended for educational and development purposes.

---

## 👩‍💻 Project

**RideMate — Smart Carpooling Platform**

Built with ❤️ using HTML, CSS, JavaScript, Netlify Functions, and database technologies.
