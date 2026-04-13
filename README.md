# DocFlow

DocFlow is a professional academic document management platform built for institutions that need secure workflows, role-based access, deadline tracking, and AI-assisted document handling.

## Live Demo

Production URL: https://doc-flow-zeta.vercel.app/

## Overview

DocFlow helps administrators and students manage documents, reviews, submissions, and workflows in one place. The current build includes:

- A public SaaS-style landing page
- Role-based authentication and routing
- Admin and student dashboards
- Document upload and analysis flows
- Timeline, messaging, and workflow tools
- Supabase-backed data and authentication

## Tech Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- React Router
- Framer Motion

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm

### Install dependencies

```sh
npm install
```

### Run locally

```sh
npm run dev
```

### Build for production

```sh
npm run build
```

### Preview the production build

```sh
npm run preview
```

### Run lint checks

```sh
npm run lint
```

### Run tests

```sh
npm run test
```

## Environment Variables

Create a local `.env` file if your setup requires Supabase credentials or other runtime values. Use `.env.example` as the reference for the expected variables.

## Deployment

Deploy the app to Vercel and update the live URL above once the final domain is ready.

Recommended deployment flow:

1. Push the latest code to GitHub.
2. Import the repository into Vercel.
3. Add the required environment variables.
4. Deploy and replace the placeholder URL in this README.

## Project Structure

- `src/pages` - application pages and landing page
- `src/components` - reusable UI and layout components
- `src/contexts` - authentication and app state providers
- `src/integrations` - Supabase client and related setup
- `supabase` - database migrations and edge functions

## Notes

- The repository is maintained as a standalone project.
- The README intentionally avoids platform-specific boilerplate so it can serve as the main project reference.
