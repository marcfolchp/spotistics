# Spotistics

A Spotify Data Analytics App that allows users to retrieve and analyze their full listening history using both Spotify's official API and user-provided data exports.

## Features

- **Spotify Authentication:** Secure OAuth2 login to connect each user's Spotify account
- **Data Sources:**
  1. **Spotify API** — for recent listening data, top artists/tracks, playlists, and profile info
  2. **Spotify User Data Export** — for complete lifetime listening history, uploaded by the user
- **Data Analysis & Visualization:**
  - Listening frequency over time (by day, month, or year)
  - Most-played songs, artists, and genres
  - Time-of-day and weekday listening patterns
  - Custom insights (e.g., mood trends, seasonal patterns)
- **Dashboard Interface:** Interactive and responsive dashboard to explore metrics visually
- **User Privacy:** All data is analyzed locally or within the user's own account context

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **APIs:** Spotify Web API
- **Data Handling:** Client-side processing with utility functions
- **Charts:** Recharts
- **Auth:** Spotify OAuth2 for secure login and token management

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Spotify Developer account and app

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd spotistics
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Spotify App**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new app
   - Add `http://localhost:3000/api/auth/spotify/callback` as a redirect URI

4. **Configure environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/spotify/callback
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   ```

   Generate `NEXTAUTH_SECRET` using:
   ```bash
   openssl rand -base64 32
   ```

5. **Run the development server**
```bash
npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── spotify/
│   │   └── spotify/
│   ├── dashboard/
│   ├── login/
│   └── upload/
├── components/
│   ├── charts/
│   ├── dashboard/
│   └── ui/
├── lib/
│   ├── spotify/
│   ├── data-processing/
│   └── utils/
└── types/
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## License

MIT
