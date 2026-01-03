# Project Context

## Purpose
**Spotify Playlist Manager** - A comprehensive web application for managing Spotify playlists with advanced features including:
- Playlist creation, editing, and organization
- CSV import/export for bulk track management
- Track search with Spotify integration
- Playlist recommendations based on listening history
- Track annotations (color coding, comments)
- Column customization and reordering
- Duplicate detection and prevention

**Goals:**
1. Separate Spotify playlist management from the existing Track Mix Electron app
2. Create a standalone web application accessible from anywhere
3. Convert entire codebase from JavaScript to TypeScript for better type safety
4. Deploy as a public web service for multiple users

## Tech Stack

### Frontend
- **Framework:** React 18
- **Language:** TypeScript (migrating from JavaScript)
- **UI Library:** Material-UI (MUI) v6
- **Data Grid:** MUI X-Data-Grid
- **Styling:** CSS + Emotion (MUI's styling solution)
- **HTTP Client:** Axios
- **Routing:** React Router v6
- **Drag & Drop:** @dnd-kit, @hello-pangea/dnd
- **CSV Parsing:** PapaCSV
- **State Management:** React Hooks (useState, useEffect, custom hooks)
- **Build Tool:** React Scripts (Create React App) - considering Vite for TS migration

### Backend
- **Runtime:** Node.js
- **Language:** TypeScript (migrating from JavaScript)
- **Framework:** Express.js
- **HTTP Client:** Axios (for Spotify API)
- **Rate Limiting:** Bottleneck
- **Web Scraping:** Puppeteer (for track analysis)
- **Environment:** dotenv
- **CORS:** cors middleware

### External APIs
- **Spotify Web API** - Primary data source
  - Authentication (OAuth 2.0)
  - Playlist management
  - Track search and details
  - User library access
  - Audio features analysis

### Current Architecture
- **Desktop:** Electron wrapper (to be removed)
- **Frontend Port:** 3000 (development)
- **Backend Port:** 3001 (development)
- **Communication:** REST API with proxy configuration

## Project Conventions

### Code Style
- **Language Target:** TypeScript with strict mode
- **Components:** Functional components with hooks (no class components)
- **File Naming:**
  - Components: PascalCase (e.g., `TrackTable.tsx`)
  - Hooks: camelCase with "use" prefix (e.g., `usePlaylist.ts`)
  - Utils/Services: camelCase (e.g., `api.ts`)
- **Import Order:**
  1. React and external libraries
  2. Internal components
  3. Hooks
  4. Services
  5. Types
  6. Styles
- **Async/Await:** Preferred over .then() chains
- **Error Handling:** Try-catch blocks with user-friendly error messages
- **Comments:** JSDoc for functions, inline comments for complex logic

### TypeScript Conventions
- **Strict Mode:** Enabled
- **Type Definitions:**
  - Separate `types/` directories for frontend and backend
  - Shared types between client/server where applicable
  - Explicit return types for functions
  - No `any` type unless absolutely necessary
- **Interfaces vs Types:** Prefer interfaces for object shapes, types for unions/intersections
- **File Extensions:** `.ts` for logic, `.tsx` for React components

### Architecture Patterns

#### Frontend
- **Component Structure:**
  ```
  components/
    ├── playlist/      # Playlist-related components
    ├── track/         # Track management components
    ├── csv/           # CSV import/export
    ├── recommendations/ # Recommendation features
    ├── common/        # Shared/reusable components
    └── layout/        # Layout components
  ```
- **Custom Hooks:** Separate business logic from UI
- **State Management:** Local state with hooks, considering Context API for global state
- **API Calls:** Centralized in `services/api.ts`
- **Error Boundaries:** Wrap main components for graceful error handling

#### Backend
- **Modular Structure:** Separate routes, controllers, services
- **Middleware:** Authentication, error handling, rate limiting
- **Service Layer:** Business logic separated from route handlers
- **Caching:** Track details cached to minimize Spotify API calls
- **Rate Limiting:** Bottleneck to respect Spotify API limits

### Testing Strategy
- **Current:** No automated tests (to be added)
- **Planned:**
  - Jest for unit tests
  - React Testing Library for component tests
  - E2E tests with Playwright (future consideration)
  - Test coverage target: 70%+

### Git Workflow
- **Current:** Direct commits to main branch
- **Planned for new web app:**
  - Feature branches: `feature/feature-name`
  - Bug fixes: `bugfix/bug-description`
  - Commit messages: Conventional commits format
    - `feat:` New features
    - `fix:` Bug fixes
    - `refactor:` Code refactoring
    - `docs:` Documentation
    - `chore:` Maintenance tasks

## Domain Context

### Spotify Playlist Management
- **Playlists:** Collections of tracks with metadata (name, description, public/private)
- **Tracks:** Individual songs with rich metadata (artist, album, duration, audio features)
- **Liked Songs:** Special system playlist (ID: 'liked-songs') with unique behavior
- **Track URIs:** Spotify format `spotify:track:{id}` used for API operations
- **Pagination:** Spotify API returns data in pages (typically 50-100 items)
- **Rate Limits:** Spotify enforces rate limiting (handled by Bottleneck)

### Key Features
1. **CSV Import/Export:**
   - Format: Artist, Title, Label (optional)
   - Duplicate detection (within CSV and existing playlist)
   - Public/private playlist creation
   - Progress tracking during import

2. **Track Annotations:**
   - Color coding for visual organization
   - Comments for notes
   - Stored in localStorage (needs database for multi-user)

3. **Column Customization:**
   - Show/hide columns
   - Reorder columns via drag-and-drop
   - Settings persisted in localStorage

4. **Playlist Operations:**
   - Create, rename, delete playlists
   - Add/remove tracks
   - Reorder tracks
   - Unlike tracks from Liked Songs

## Important Constraints

### Technical Constraints
1. **Spotify API Limits:**
   - OAuth 2.0 authentication required
   - Rate limiting (handled by Bottleneck)
   - Maximum 100 tracks per API call for adding to playlist
   - Token expiration (1 hour for access tokens)

2. **Browser Limitations:**
   - localStorage size limits (~5-10MB)
   - CORS restrictions for API calls

3. **TypeScript Migration:**
   - Must maintain feature parity during migration
   - No breaking changes to user experience
   - Gradual migration approach (file by file)

### Business Constraints
- **Multi-User Support:** New requirement for web deployment
  - Need user authentication
  - Separate user data/sessions
  - Database for user-specific settings

### Deployment Constraints
1. **HTTPS Required:** Spotify OAuth requires HTTPS in production
2. **Redirect URIs:** Must be whitelisted in Spotify Developer Dashboard
3. **Environment Variables:** Secure storage of secrets (not in git)
4. **Session Management:** Need persistent storage (Redis/PostgreSQL)
5. **Caching:** File-based cache won't work on serverless platforms

## External Dependencies

### Spotify Web API
- **Documentation:** https://developer.spotify.com/documentation/web-api
- **Authentication:** OAuth 2.0 with authorization code flow
- **Scopes Required:**
  - `playlist-read-private` - Read private playlists
  - `playlist-modify-private` - Modify private playlists
  - `playlist-modify-public` - Modify public playlists
  - `user-library-read` - Access Liked Songs
  - `user-library-modify` - Unlike tracks
  - `user-read-recently-played` - Recommendations
- **Rate Limits:** ~180 requests per minute per user
- **Token Management:**
  - Access tokens expire after 1 hour
  - Refresh tokens are long-lived
  - Need to handle token refresh

### NPM Packages
**Frontend:**
- `@mui/material` - UI components
- `@mui/x-data-grid` - Data tables
- `axios` - HTTP client
- `papaparse` - CSV parsing
- `react-router-dom` - Routing
- `@dnd-kit/*` - Drag and drop

**Backend:**
- `express` - Web framework
- `axios` - HTTP client
- `bottleneck` - Rate limiting
- `puppeteer` - Web scraping (for track analysis)
- `cors` - CORS middleware
- `dotenv` - Environment variables

### Deployment Services (Planned)
- **Frontend:** Vercel / Netlify
- **Backend:** Railway / Render / Heroku
- **Database:** PostgreSQL (for user data and tokens)
- **Cache:** Redis (for track details cache)
- **SSL:** Let's Encrypt (free certificates)

## Migration Path

### Phase 1: Project Separation
1. Create new directory structure
2. Copy Spotify-related files
3. Remove Electron dependencies
4. Set up independent frontend/backend

### Phase 2: TypeScript Migration
1. Add TypeScript configurations
2. Create type definitions
3. Convert files incrementally:
   - Services/Utils first (easiest)
   - Hooks second
   - Components last (most complex)

### Phase 3: Deployment Preparation
1. Implement user authentication
2. Add database for user data
3. Update Spotify OAuth for production
4. Add session management
5. Configure CORS for production
6. Set up environment-specific configs

### Phase 4: Deployment
1. Deploy backend to hosting service
2. Deploy frontend to static hosting
3. Configure DNS and SSL
4. Register production app with Spotify
5. Test multi-user scenarios

## Current Status
- **Development:** Fully functional Electron desktop app
- **Features:** Complete playlist management suite
- **Tech Debt:** JavaScript codebase, single-user design
- **Next Steps:** Separate from Mix app, convert to TypeScript, prepare for deployment
