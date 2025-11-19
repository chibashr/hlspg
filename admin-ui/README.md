# HLSPG Admin UI

React-based administration interface for HLSPG.

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Access at `http://localhost:5173`

The dev server proxies `/api` requests to the Flask backend at `http://localhost:3000`.

## Building for Production

```bash
npm run build
```

Output will be in `dist/` directory.

## Project Structure

```
admin-ui/
├── src/
│   ├── components/      # React components
│   ├── pages/           # Page components
│   ├── App.jsx          # Main app component
│   └── main.jsx         # Entry point
├── index.html
├── package.json
└── vite.config.js
```

## Pages

- **Dashboard** - Overview
- **LDAP Setup** - LDAP configuration and testing
- **Role Management** - Map LDAP groups to roles
- **Site Management** - Manage internal sites
- **User Management** - View and manage users
- **Audit Log** - Security audit events

## License

Copyright (c) 2024 chibashr

