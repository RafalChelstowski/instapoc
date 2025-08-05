# TikTok Integration POC Research and Plan

## Overview
This document summarizes research into TikTok API capabilities for sending Direct Messages (DMs) programmatically, and outlines a plan for a proof-of-concept (POC) to send TikTok users a DM containing a link to a webapp, pass the user ID to the webapp, and send a video in the DM.

## Research Findings

- TikTok's official developer APIs do not provide public endpoints for sending DMs or user-to-user messaging.
- The main TikTok APIs focus on content posting, user login, research, display, and advertising.
- No official or community-supported GitHub repositories or code examples exist for TikTok DM automation.
- Developer forums and Stack Overflow searches are limited due to CAPTCHA and access restrictions.
- Google automated searches for TikTok DM API capabilities are blocked or redirected.
- TikTok for Business or advertising APIs may have some messaging capabilities, but these are not publicly documented or accessible for general developer use.

## Limitations

- No public TikTok API for sending DMs programmatically.
- No documented way to send videos via DM through an API.
- TikTok's platform restricts automated user-to-user messaging to prevent spam and abuse.

## Alternative Approaches

- Use TikTok's Share Kit to enable users to share links or videos within the TikTok app manually.
- Direct users to the webapp via profile bio links, video captions, or comments.
- Explore TikTok for Business or advertising APIs for possible messaging or notification features.
- Accept TikTok user ID as a query parameter in the webapp URL for tracking and personalization.
- Implement video recording and upload functionality in the webapp.
- Backend can receive and store videos but cannot send them via TikTok DM.
- Consider manual or semi-automated messaging workflows if feasible.

## Next Steps

- Implement the webapp to accept TikTok user ID as a query parameter.
- Reuse existing video recording and upload code from Instagram POC.
- Update backend to receive and store uploaded videos.
- Document the TikTok API limitations and alternative approach in this file.
- Monitor TikTok API updates for any future messaging capabilities.

---

*This document will be updated as new information becomes available.*
