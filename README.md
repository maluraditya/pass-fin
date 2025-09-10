# Startup Vault

A secure password and credential management system for startups built with Next.js 13 and Supabase.

## Features

- 🔐 Secure authentication with Supabase Auth
- 🛡️ Encrypted credential storage
- 🔗 Secure credential sharing with time-limited links
- 📱 Responsive design with Tailwind CSS
- 🚀 Deployed on Vercel

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file in the root directory with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

3. **Set up Supabase database:**
   You'll need to create the following tables in your Supabase database:
   - `tools` - for storing tool information
   - `credentials` - for storing encrypted credentials
   - `share_tokens` - for managing credential sharing
   - `user_access` - for managing user access to tools

4. **Run the development server:**
   ```bash
   npm run dev
   ```

## Project Structure

```
├── components/          # Reusable UI components
│   ├── AuthGuard.js    # Authentication guard component
│   └── Layout.js       # Main layout component
├── lib/                # Utility libraries
│   ├── supabaseClient.js    # Supabase client configuration
│   └── supabaseAdmin.js     # Supabase admin client
├── pages/              # Next.js pages
│   ├── api/            # API routes
│   │   ├── credentials.js
│   │   ├── renewals.js
│   │   └── share.js
│   ├── s/              # Sharing pages
│   │   └── [token].js
│   ├── tool/           # Tool management pages
│   │   └── [id].js
│   ├── _app.js         # App wrapper
│   ├── dashboard.js    # Main dashboard
│   ├── index.js        # Landing page
│   ├── login.js        # Login page
│   └── signup.js       # Signup page
├── styles/             # Global styles
│   └── globals.css
├── crypto.js           # Encryption utilities
├── package.json
├── tailwind.config.js
└── postcss.config.js
```

## Deployment

This project is configured for deployment on Vercel. Make sure to set the environment variables in your Vercel dashboard.

## Security Notes

- Credentials are encrypted before storage (currently using placeholder encryption)
- Sharing links are time-limited and can be one-time use
- All API routes require authentication
- Row Level Security (RLS) should be enabled on Supabase tables
