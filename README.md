# Multiplayer Number Guessing Game

A real-time multiplayer game where players compete to guess the winning number (1-9) within a time limit. Built with Next.js, Supabase, and TypeScript.

## 🎮 Game Overview

Players join active game sessions and select a number between 1-9.

When the session timer expires, a random winning number is generated, and all players who chose that number are declared winners. The game features real-time updates, leaderboards, and session management.

## 🏗️ Technical Architecture

### Frontend (Next.js 14)

-   **App Router**: Modern Next.js routing with server/client components
-   **TypeScript**: Full type safety throughout the application
-   **Tailwind CSS**: Utility-first styling for responsive design
-   **Real-time Updates**: Polling-based session synchronization every 2 seconds

### Backend (Supabase)

-   **PostgreSQL Database**: Relational data storage with RLS policies
-   **Edge Functions**: Serverless API endpoints for game logic
-   **Service Role**: Bypass RLS for administrative operations

### Authentication Strategy

-   **JWT-like Tokens**: Base64 encoded user sessions containing user ID, username, and timestamp
-   **Stateless Auth**: No server-side session storage, tokens contain all necessary information
-   **Username-based**: Simple login system without passwords for easy access

## 📊 Database Schema

### Tables

-   **users**
    -   `id` (UUID, Primary Key)
    -   `username` (TEXT, Unique)
    -   `total_games` (INTEGER, Default: 0)
    -   `total_wins` (INTEGER, Default: 0)
    -   `total_losses` (INTEGER, Default: 0)
    -   `created_at` (TIMESTAMP)
-   **game_sessions**
    -   `id` (UUID, Primary Key)
    -   `status` (TEXT: ‘active’ | ‘finished’)
    -   `current_players` (INTEGER, Default: 0)
    -   `max_players` (INTEGER, Default: 10)
    -   `session_duration` (INTEGER, Default: 60 seconds)
    -   `winning_number` (INTEGER, 1-9)
    -   `started_at` (TIMESTAMP)
    -   `ended_at` (TIMESTAMP)
-   **session_participants**
    -   `id` (UUID, Primary Key)
    -   `session_id` (UUID, Foreign Key → game_sessions)
    -   `user_id` (UUID, Foreign Key → users)
    -   `chosen_number` (INTEGER, 1-9)
    -   `is_winner` (BOOLEAN, Default: false)
    -   `is_starter` (BOOLEAN, Default: false)
    -   `joined_at` (TIMESTAMP)

## 🔧 Edge Functions

### Authentication

-   `auth-login`: User registration/login with username validation
-   `auth-logout`: Session cleanup (placeholder for future enhancements)

### Game Logic

-   `game-current-session`: Retrieve active session data with real-time updates
-   `game-join-session`: Join existing sessions or create new ones (10 player limit)
-   `game-my-session`: Get user’s personal session participation status
-   `game-select-number`: Submit number choice for active sessions
-   `game-leave-session`: Exit current session before completion
-   `game-leaderboard`: Statistics with time-based filtering (all-time, daily, weekly, monthly)

## ⚙️ Key Features

### Session Management

-   **Auto-Creation**: New sessions start automatically when no active sessions exist
-   **Player Limits**: Configurable max players per session (default: 10, set via `MAX_SESSION_PLAYERS` env var)
-   **Time Management**: 60-second countdown with automatic session finishing
-   **Real-time Sync**: Live player count and session state updates

### Game Flow

-   **Join Phase**: Players join active sessions or trigger new session creation
-   **Selection Phase**: Players choose numbers 1-9 within the time limit
-   **Resolution Phase**: Random winning number generated, winners determined
-   **Results Phase**: Winners announced, statistics updated, 90-second results display

### Leaderboard System

-   **All-time Statistics**: Total games, wins, losses, win rate
-   **Time-filtered Views**: Daily, weekly, monthly performance tracking
-   **Real-time Updates**: Statistics update immediately after each game
-   **Ranking System**: Sorted by wins with username tiebreaker

## 🚀 Real-time Updates

The game uses a polling-based approach for real-time synchronization:

-   **Session Updates**: Every 2 seconds via `game-current-session`
-   **Player Counts**: Live participant tracking and display
-   **Game State**: Active session detection and automatic transitions
-   **Results Display**: 90-second window for post-game results viewing

## 🔒 Security & Data Integrity

### Row Level Security (RLS)

-   Users can only modify their own data
-   Session data protected from unauthorized changes
-   Service Role bypasses RLS for administrative operations

### Input Validation

-   Number selection limited to 1-9 range
-   Username requirements (minimum 3 characters)
-   Session capacity limits enforced
-   Token validation on all authenticated endpoints

## 🌐 Environment Configuration

### Required Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
MAX_SESSION_PLAYERS=10
```

### Edge Function Secrets

-   `SUPABASE_URL`: Database connection URL
-   `SUPABASE_SERVICE_ROLE_KEY`: Administrative database access

## 🏃‍♂️ Getting Started

1. **Clone and Install**
    ```bash
    npm install
    ```
2. **Configure Environment**
    - Set up Supabase project and obtain credentials
    - Configure environment variables in `.env`
3. **Deploy Edge Functions**
    - Use Supabase CLI to deploy all edge functions
    - Configure function secrets with your Supabase credentials
4. **Run Development Server**
    ```bash
    npm run dev
    ```
5. **Access Application**
    - Navigate to http://localhost:3000
    - Enter username to start playing

## 🔮 Future Enhancements

### Planned Features

-   **WebSocket Integration**: Replace polling with real-time WebSocket connections
-   **Private Rooms**: Custom game sessions with invite codes
-   **Tournament Mode**: Bracket-style competitions with multiple rounds
-   **Power-ups**: Special abilities and game modifiers
-   **Social Features**: Friend lists, chat, and team formations

### Technical Improvements

-   **Caching Layer**: Redis integration for improved performance
-   **Rate Limiting**: API protection and abuse prevention
-   **Analytics**: Detailed game metrics and user behavior tracking
-   **Mobile App**: React Native companion application

## 📝 Development Notes

### Architecture Decisions

-   **Service Role Usage**: Chosen for simplified RLS bypass in game logic
-   **Polling over WebSockets**: Simpler implementation for MVP phase
-   **Stateless Authentication**: Reduces server complexity and scaling concerns
-   **Edge Functions**: Serverless approach for automatic scaling

### Performance Considerations

-   **Database Indexing**: Optimized queries for session and leaderboard operations
-   **Function Cold Starts**: Minimized by keeping functions lightweight
-   **Frontend Optimization**: Efficient polling intervals balance real-time feel with resource usage
    –
