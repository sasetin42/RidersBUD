# RidersBUD 🚗⚡

> **Trusted Car Care Wherever You Are**

A modern, realtime mobile mechanic booking platform built with React, Supabase, and deployed on Vercel.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat&logo=vercel)](https://vercel.com)
[![Powered by Supabase](https://img.shields.io/badge/Powered%20by-Supabase-3ECF8E?style=flat&logo=supabase)](https://supabase.com)
[![Built with Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF?style=flat&logo=vite)](https://vitejs.dev)

---

## ✨ Features

### For Customers
- 🔍 **Find Mechanics** - Browse available mechanics with ratings and specializations
- 📍 **Live Tracking** - Track mechanic location in realtime
- 📅 **Easy Booking** - Book services with just a few taps
- 💬 **AI Assistant** - Get instant help from RiderAI
- 🛒 **Parts Store** - Order genuine parts online
- ⭐ **Reviews** - Rate and review mechanics

### For Mechanics
- 📱 **Job Management** - Accept and manage bookings
- 🗺️ **Navigation** - Get directions to customer locations
- 💰 **Earnings Tracking** - Monitor daily and monthly earnings
- 📊 **Performance Analytics** - View ratings and reviews
- 📸 **Portfolio** - Showcase your work

### For Admins
- 📊 **Dashboard** - Comprehensive analytics and metrics
- 👥 **User Management** - Manage customers and mechanics
- 🛠️ **Service Catalog** - Manage services and parts
- 📢 **Marketing** - Create banners and promotions
- ⚙️ **Settings** - Configure app-wide settings

---

## 🚀 Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Leaflet** - Maps

### Backend & Database
- **Supabase** - Realtime database, authentication, storage
- **PostgreSQL** - Relational database
- **Row Level Security** - Data protection

### Deployment
- **Vercel** - Hosting and CDN
- **GitHub** - Version control

### APIs & Services
- **Google Maps API** - Location services
- **Google Gemini AI** - AI assistant

---

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- Git
- Supabase account
- Vercel account (for deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ridersbud.git
   cd ridersbud
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your credentials:
   ```env
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   ```
   http://localhost:5173
   ```

---

## 🗄️ Database Setup

### Supabase Configuration

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Run the schema**
   - Go to SQL Editor in Supabase Dashboard
   - Copy contents of `supabase/schema.sql`
   - Run the SQL

3. **Create storage buckets**
   - Go to Storage in Supabase Dashboard
   - Create buckets: `avatars`, `vehicles`, `portfolios`, `bookings`, `parts`, `banners`
   - Set all buckets to public

4. **Enable realtime**
   - Go to Database → Replication
   - Enable for: `bookings`, `mechanics`, `notifications`, `orders`

For detailed instructions, see the setup guide in the artifacts.

---

## 🚢 Deployment

### Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

3. **Configure environment variables**
   - Add all variables from `.env.local`
   - Click "Deploy"

4. **Access your live app**
   ```
   https://your-app.vercel.app
   ```

---

## 📁 Project Structure

```
ridersbud/
├── public/                 # Static assets
├── src/
│   ├── components/        # React components
│   ├── context/          # React context providers
│   ├── data/             # Mock data and seeds
│   ├── lib/              # Library configurations
│   │   └── supabase.ts   # Supabase client
│   ├── pages/            # Page components
│   ├── services/         # API services
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
├── supabase/
│   └── schema.sql        # Database schema
├── .env.example          # Environment template
├── vercel.json           # Vercel configuration
└── package.json          # Dependencies
```

---

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | ✅ Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ Yes |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key | ✅ Yes |
| `VITE_APP_ENV` | Environment (development/production) | ⚠️ Optional |

---

## 📱 Features in Detail

### Realtime Updates
- Live mechanic location tracking
- Instant booking status updates
- Real-time notifications
- Multi-tab synchronization

### Authentication
- Email/password authentication
- Session persistence
- Role-based access (Customer, Mechanic, Admin)
- Secure password hashing

### File Storage
- Profile pictures
- Vehicle images
- Mechanic portfolios
- Before/after job photos
- Parts catalog images

### AI Assistant
- Powered by Google Gemini 2.5 Flash
- Natural language understanding
- Service recommendations
- Parts information
- Location-based suggestions

---

**Built with ❤️ by the RidersBUD Team**
