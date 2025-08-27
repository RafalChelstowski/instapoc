# Project Progress Update

## Video Capture and Instagram Messaging Integration

- Implemented webcam video capture and recording in the React webapp.
- Added functionality in the React app to send recorded video as multipart/form-data to the backend API.
- Updated backend webhook (`api/webhook.js`) to parse multipart form data using `busboy`.
- Backend uploads received video to Instagram's media endpoint and sends it as a video message attachment.
- Preserved existing text message sending and Instagram webhook event handling.
- Added new dependencies: `busboy` and `form-data`.
- Environment variables required: `ACCESS_TOKEN`, `VERIFY_TOKEN`, `IG_BUSINESS_ID`.

## Share Button Implementation Plan

- **OAuth Flow**: Add Instagram OAuth to obtain `access_token` with `instagram_basic` and `pages_show_list` scopes.
- **Video Upload API**: Create a new backend endpoint (`POST /api/instagram/upload`) that accepts video URL or file, calls Graph API to create & publish media, returns shortcode/permalink.
- **Frontend Button Component**: In React, add a “Share to Instagram” button that triggers the upload flow and then opens `https://www.instagram.com/p/<shortcode>/` in a new tab or via native share dialog on mobile.
- **State Management & UX**: Show loading indicator while uploading; handle errors gracefully; confirm success with a toast.
- **Permissions Check**: Ensure user is authenticated; if not, redirect to login page before sharing.
- **Testing**: Write unit tests for the upload API and integration test for button click flow.

This plan will enable users to share their video content directly from the webapp with one click.

This update reflects the current state of the project as of August 5, 2025.
