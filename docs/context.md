# Project Overview
This project is a **Spotify Data Analytics App** that allows users to retrieve and analyze their full listening history. The goal is to give users meaningful insights into their music habits using both **Spotify’s official API** and the **complete playback history export** available through the user’s Spotify account data download.

# Core Features
- **Spotify Authentication:** Secure OAuth2 login to connect each user’s Spotify account.
- **Data Sources:**
  1. **Spotify API** — for recent listening data, top artists/tracks, playlists, and profile info.
  2. **Spotify User Data Export** — for complete lifetime listening history, uploaded by the user.
- **Data Analysis & Visualization:**
  - Listening frequency over time (by day, month, or year)
  - Most-played songs, artists, and genres
  - Time-of-day and weekday listening patterns
  - Custom insights (e.g., mood trends, seasonal patterns)
- **Dashboard Interface:** Interactive and responsive dashboard to explore metrics visually (built with Flask + Tailwind CSS or another front-end framework).
- **User Privacy:** All data is analyzed locally or within the user’s own account context — no public sharing without consent.

# Tech Stack
- **Backend:** Python (Flask)
- **Frontend:** HTML + Tailwind CSS
- **APIs:** Spotify Web API
- **Data Handling:** Pandas for data processing and aggregation
- **Auth:** Spotify OAuth2 for secure login and token management
- **Deployment:** Render / Vercel (TBD)

# Key Goals
- Combine **Spotify API** and **user-provided full history data** into a unified analytical dataset.
- Deliver visually engaging and data-driven insights.
- Maintain privacy, transparency, and ease of use.
