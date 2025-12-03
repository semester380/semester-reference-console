# Semester Reference Console (SRC)

An enterprise-grade reference management system integrated with Google Workspace.

## Project Structure

- `/src` - React frontend (TypeScript + Tailwind CSS)
- `/gas` - Google Apps Script backend
- `/public` - Static assets

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Google Apps Script (V8 Runtime)
- **Database**: Google Sheets
- **AI**: Google Gemini API
- **Storage**: Google Drive

## Development

### Prerequisites

- Node.js 18+
- Google Account with Apps Script access
- clasp CLI (`npm install -g @google/clasp`)

### Setup

1. Install dependencies:
```bash
npm install
```

2. Configure Google Apps Script:
```bash
clasp login
clasp create --type webapp --title "Semester Reference Console"
```

3. Start development server:
```bash
npm run dev
```

### Deployment

Deploy to Google Apps Script:
```bash
clasp push
clasp deploy
```

## Design System: "Nano Banana"

- **Primary Color**: Semester Blue (#0052CC)
- **Neutral Palette**: Cool grays
- **Typography**: Inter font family
- **Aesthetic**: Ultra-minimalist, high information density

## Features

- ✅ Automated candidate consent workflow
- ✅ AI-powered sentiment analysis
- ✅ Smart chase emails with optimal timing
- ✅ Anomaly detection and quality control
- ✅ Audit trail and compliance
- ✅ Dynamic template engine

## Status

Sprint 0 (Project Setup) - ✅ Complete

Next: Sprint 1 (Core Workflow Implementation)
