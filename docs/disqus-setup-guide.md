# Disqus Comments Setup Guide

This guide explains how to set up Disqus comments for the sn-magazine project.

## 1. Disqus Registration

1. Go to https://disqus.com/
2. Sign up for a free account
3. Verify your email

## 2. Site Setup

1. In Disqus admin (disqus.com/admin), click "Sites" > "Add Disqus To Site"
2. Choose "Universal Code" (for custom React app)
3. Fill in:
   - Website Name: e.g., "your-site-name"
   - Website URL: https://your-site.com (full URL)
   - Category: Culture (or Entertainment)
   - Description: "Book and manga review blog"
   - Comment Policy Summary: "Users are responsible for their comments. Offensive content may be moderated or deleted."
   - Language: Hungarian
   - Comment Settings: Balanced (allows images/links, moderates flagged/toxic comments)

## 3. Configuration

1. After setup, note the shortname (e.g., "your-shortname") from the install code
2. In Disqus admin > Settings > General:
   - Add trusted domains: fotelvandor.hu, netlify.app (for previews)
   - Enable ads (required for free plan)
3. In the app's `src/config.json`, add:
   ```json
   "disqusShortname": "your-shortname"
   ```

## 4. App Usage

1. The Disqus widget is `manual-plugin-disqus.js`
2. Place it in page layouts via SenseNet admin (as "manual-plugin-disqus" widget)
3. For production, set environment variable: `REACT_APP_DISQUS_SHORTNAME=your-shortname`
4. For Netlify deployment, add env var in Netlify dashboard > Site settings > Environment variables

## 5. Moderation

1. Log in to disqus.com/admin
2. Go to your site > Moderation
3. Approve/delete comments, manage spam
4. Settings > Moderation for rules

## Troubleshooting

- Comments not loading: Check domain whitelist, shortname match
- Admin UI not visible: Ensure logged in as moderator
- Free plan: Ads must be enabled and visible

For issues, check Disqus troubleshooting guide or contact support.