# Spotistics Development Plan

This document outlines the step-by-step plan to build the Spotify Data Analytics App based on the requirements in `context.md`.

## Project Overview
Build a Spotify Data Analytics App using Next.js that combines:
- Spotify Web API for recent listening data
- User-uploaded Spotify data export for complete history
- Interactive dashboard with visualizations and insights

---

## Phase 1: Project Setup & Foundation

### Step 1.1: Environment Configuration
- [ ] Create `.env.local` file for environment variables
- [ ] Set up Spotify App in Spotify Developer Dashboard
- [ ] Configure environment variables:
  - `SPOTIFY_CLIENT_ID`
  - `SPOTIFY_CLIENT_SECRET`
  - `SPOTIFY_REDIRECT_URI`
  - `NEXTAUTH_SECRET` (for session management)
  - `NEXTAUTH_URL` (app URL)

### Step 1.2: Install Core Dependencies
- [ ] Install Spotify Web API client: `spotify-web-api-node`
- [ ] Install authentication library: `next-auth` (or custom OAuth2 implementation)
- [ ] Install data processing: Consider client-side processing or API routes
- [ ] Install charting library: `recharts` or `chart.js` with `react-chartjs-2`
- [ ] Install file upload handling: `formidable` or `multer` for Next.js API routes
- [ ] Install date utilities: `date-fns` or `dayjs`
- [ ] Install CSV/JSON parsing: `papaparse` for user data export

### Step 1.3: Project Structure Setup
- [ ] Create folder structure:
  ```
  src/
  ├── app/
  │   ├── api/
  │   │   ├── auth/
  │   │   │   └── spotify/
  │   │   ├── spotify/
  │   │   └── upload/
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

---

## Phase 2: Authentication System

### Step 2.1: Spotify OAuth2 Setup
- [ ] Create Spotify OAuth2 configuration
- [ ] Implement authorization URL generation
- [ ] Set up callback handler (`/api/auth/spotify/callback`)
- [ ] Handle token exchange (authorization code → access token)
- [ ] Implement token refresh mechanism
- [ ] Store tokens securely (cookies or session storage)

### Step 2.2: Session Management
- [ ] Implement session storage (cookies with httpOnly flag)
- [ ] Create session validation middleware
- [ ] Build logout functionality
- [ ] Add token refresh on API calls

### Step 2.3: Protected Routes
- [ ] Create authentication middleware/utility
- [ ] Protect dashboard and upload routes
- [ ] Implement redirect to login if not authenticated
- [ ] Create login page UI

---

## Phase 3: Spotify API Integration

### Step 3.1: Spotify API Client Setup
- [ ] Create Spotify API client wrapper (`src/lib/spotify/client.ts`)
- [ ] Implement methods for:
  - Get user profile
  - Get recently played tracks
  - Get top artists (short/medium/long term)
  - Get top tracks (short/medium/long term)
  - Get user playlists
  - Get track/artist details (audio features, genres)

### Step 3.2: API Route Handlers
- [ ] Create `/api/spotify/profile` endpoint
- [ ] Create `/api/spotify/recent-tracks` endpoint
- [ ] Create `/api/spotify/top-artists` endpoint
- [ ] Create `/api/spotify/top-tracks` endpoint
- [ ] Create `/api/spotify/playlists` endpoint
- [ ] Implement error handling and rate limiting

### Step 3.3: Data Fetching on Frontend
- [ ] Create React hooks for fetching Spotify data
- [ ] Implement loading states
- [ ] Handle error states
- [ ] Add data caching strategy

---

## Phase 4: User Data Export Upload

### Step 4.1: File Upload System
- [ ] Create upload page UI (`/upload`)
- [ ] Implement file input component
- [ ] Add file validation (JSON format, size limits)
- [ ] Create upload API route (`/api/upload`)
- [ ] Handle file parsing (JSON from Spotify export)

### Step 4.2: Data Processing
- [ ] Parse Spotify export JSON structure
- [ ] Extract listening history data
- [ ] Normalize data format (unify with API data structure)
- [ ] Store processed data (client-side storage or API route processing)
- [ ] Create data processing utilities (`src/lib/data-processing/`)

### Step 4.3: Data Storage Strategy
- [ ] Decide on storage approach:
  - Option A: Client-side (IndexedDB/localStorage)
  - Option B: Server-side (database or file storage)
  - Option C: Hybrid (process on server, store metadata)
- [ ] Implement chosen storage solution
- [ ] Add data merge logic (combine API + export data)

---

## Phase 5: Data Analysis & Processing

### Step 5.1: Data Aggregation Functions
- [ ] Create time-based aggregations:
  - Daily listening frequency
  - Monthly listening frequency
  - Yearly listening frequency
- [ ] Create top content aggregations:
  - Most-played songs
  - Most-played artists
  - Most-played genres
- [ ] Create pattern analysis:
  - Time-of-day patterns
  - Weekday patterns
  - Seasonal patterns

### Step 5.2: Advanced Insights
- [ ] Implement mood trend analysis (if genre/mood data available)
- [ ] Create listening streak calculations
- [ ] Add discovery metrics (new artists/tracks over time)
- [ ] Calculate listening diversity metrics

### Step 5.3: Data Utilities
- [ ] Create date/time formatting utilities
- [ ] Build data filtering functions
- [ ] Implement data transformation helpers
- [ ] Add data validation functions

---

## Phase 6: Dashboard UI Components

### Step 6.1: Layout & Navigation
- [ ] Create dashboard layout component
- [ ] Build navigation sidebar/header
- [ ] Add user profile section
- [ ] Implement responsive design
- [ ] Create loading skeletons

### Step 6.2: Chart Components
- [ ] Create listening frequency chart (line/area chart)
- [ ] Create top artists chart (bar chart)
- [ ] Create top tracks chart (bar/horizontal bar chart)
- [ ] Create time-of-day heatmap
- [ ] Create weekday pattern chart
- [ ] Create genre distribution chart (pie/donut chart)

### Step 6.3: Stat Cards & Metrics
- [ ] Create stat card component
- [ ] Display total listening time
- [ ] Display total tracks played
- [ ] Display unique artists count
- [ ] Display listening streak
- [ ] Display average daily listening time

### Step 6.4: Dashboard Pages
- [ ] Create main dashboard overview page
- [ ] Create detailed analytics page
- [ ] Create insights/trends page
- [ ] Add date range filters
- [ ] Implement data refresh functionality

---

## Phase 7: Data Visualization

### Step 7.1: Chart Integration
- [ ] Set up chart library (Recharts or Chart.js)
- [ ] Create reusable chart wrapper components
- [ ] Implement responsive chart sizing
- [ ] Add chart interactivity (tooltips, zoom, etc.)
- [ ] Style charts to match app theme

### Step 7.2: Interactive Features
- [ ] Add date range picker
- [ ] Implement chart filtering
- [ ] Add export functionality (export charts as images)
- [ ] Create drill-down capabilities (click chart → detailed view)

### Step 7.3: Visual Polish
- [ ] Apply consistent color scheme
- [ ] Add animations/transitions
- [ ] Implement dark mode support
- [ ] Ensure accessibility (ARIA labels, keyboard navigation)

---

## Phase 8: User Experience Enhancements

### Step 8.1: Onboarding Flow
- [ ] Create welcome/onboarding page
- [ ] Add instructions for getting Spotify data export
- [ ] Guide users through first-time setup
- [ ] Create tutorial/help tooltips

### Step 8.2: Data Management
- [ ] Add "Re-upload data" functionality
- [ ] Implement data refresh from Spotify API
- [ ] Add data export feature (download user's processed data)
- [ ] Create data deletion option

### Step 8.3: Error Handling & Feedback
- [ ] Implement comprehensive error handling
- [ ] Create user-friendly error messages
- [ ] Add success notifications
- [ ] Implement loading states throughout app
- [ ] Add empty states for missing data

---

## Phase 9: Privacy & Security

### Step 9.1: Data Privacy
- [ ] Ensure all data processing is client-side or user-scoped
- [ ] Add privacy policy page
- [ ] Implement data retention policies
- [ ] Add clear data usage explanations

### Step 9.2: Security Measures
- [ ] Secure API routes (validate tokens, check sessions)
- [ ] Implement CSRF protection
- [ ] Add rate limiting to API routes
- [ ] Secure file uploads (validate, sanitize)
- [ ] Ensure HTTPS in production

---

## Phase 10: Testing & Optimization

### Step 10.1: Testing
- [ ] Test authentication flow
- [ ] Test Spotify API integration
- [ ] Test file upload and processing
- [ ] Test data visualization accuracy
- [ ] Test responsive design on multiple devices
- [ ] Test error scenarios

### Step 10.2: Performance Optimization
- [ ] Optimize data processing (lazy loading, pagination)
- [ ] Implement code splitting
- [ ] Optimize chart rendering performance
- [ ] Add caching strategies
- [ ] Optimize bundle size

### Step 10.3: Accessibility
- [ ] Ensure keyboard navigation
- [ ] Add screen reader support
- [ ] Test color contrast
- [ ] Add alt text to images/charts

---

## Phase 11: Deployment Preparation

### Step 11.1: Production Configuration
- [ ] Update environment variables for production
- [ ] Configure production Spotify app redirect URIs
- [ ] Set up production build process
- [ ] Configure error tracking (optional: Sentry)

### Step 11.2: Deployment
- [ ] Choose deployment platform (Vercel recommended for Next.js)
- [ ] Set up CI/CD pipeline
- [ ] Configure domain and SSL
- [ ] Deploy and test production build

---

## Phase 12: Documentation & Polish

### Step 12.1: Documentation
- [ ] Update README with setup instructions
- [ ] Document API endpoints
- [ ] Create user guide
- [ ] Add code comments where needed

### Step 12.2: Final Polish
- [ ] Review and refine UI/UX
- [ ] Add favicon and app metadata
- [ ] Implement SEO optimization
- [ ] Final testing and bug fixes

---

## Recommended Implementation Order

**Week 1-2: Foundation**
- Phase 1 (Setup)
- Phase 2 (Authentication)
- Phase 3 (Spotify API Integration)

**Week 3-4: Core Features**
- Phase 4 (Data Upload)
- Phase 5 (Data Processing)
- Phase 6 (Dashboard UI)

**Week 5-6: Visualization & Polish**
- Phase 7 (Data Visualization)
- Phase 8 (UX Enhancements)
- Phase 9 (Privacy & Security)

**Week 7-8: Launch**
- Phase 10 (Testing)
- Phase 11 (Deployment)
- Phase 12 (Documentation)

---

## Key Technical Decisions Needed

1. **Data Storage**: Client-side (IndexedDB) vs Server-side (Database)
   - Recommendation: Start with client-side for privacy, consider server-side for advanced features

2. **Data Processing**: Client-side vs Server-side
   - Recommendation: Hybrid - heavy processing on server, display on client

3. **Chart Library**: Recharts vs Chart.js
   - Recommendation: Recharts (React-native, easier integration with Next.js)

4. **Authentication**: NextAuth.js vs Custom OAuth2
   - Recommendation: Custom OAuth2 for more control over Spotify-specific flow

---

## Notes

- Adapt Flask-specific mentions in context.md to Next.js API routes
- Consider using Next.js Server Actions for data processing
- Use Next.js App Router features (server components, streaming)
- Keep user privacy as top priority - process data locally when possible

