# Portfolio CMS Admin Setup Guide

## Quick Start

1. **Create Admin User in Firebase Console:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project: `portfolio-mine-5ee1c`
   - Navigate to **Authentication** → **Users**
   - Click **Add User**
   - Enter your email and a secure password

2. **Update Firestore Rules:**
   - Go to **Firestore Database** → **Rules**
   - Replace `YOUR_ADMIN_EMAIL@example.com` with your actual email in `firestore.rules`
   - Copy the rules and paste into the console
   - Click **Publish**

3. **Access Admin Panel:**
   - Start the server: `npx serve -l 3000`
   - Navigate to: `http://localhost:3000/admin/login.html`
   - Login with your Firebase Auth credentials

## Files Structure

```
portfolio/
├── admin/
│   ├── login.html      # Login page
│   ├── dashboard.html  # CMS dashboard
│   ├── admin.js        # Dashboard logic
│   └── admin.css       # Admin styles
├── js/
│   ├── firebase.js     # Shared Firebase config
│   └── api.js          # CRUD operations
├── firestore.rules     # Security rules
└── index.html          # Public site (unchanged)
```

## Features

| Section | Capabilities |
|---------|-------------|
| Profile | Edit name, headline, summary, links |
| Experience | Add/Edit/Delete work history |
| Projects | Add/Edit/Delete/Reorder projects |
| Skills | Add/Edit/Delete by category |
| Achievements | Add/Edit/Delete achievements |

## Security

- **Public site:** Read-only access
- **Admin panel:** Requires Firebase Auth login
- **Firestore rules:** Only your email can write

## Troubleshooting

**Login fails:**
- Verify user exists in Firebase Auth console
- Check email/password are correct

**Cannot save data:**
- Ensure Firestore rules are published
- Verify your email matches the rule

**CORS errors:**
- Add `localhost:3000` to Firebase Auth authorized domains
