# PLAN: Registration Assistance Flow

This document details the multi-step implementation plan for the vehicle registration assistance service in both Customer and Admin portals.

## Phase 1: Customer Portal Configuration
1. Customize `LiaisonBookingFlow.tsx` to handle the `'registration-assistance'` slug dynamically.
2. Shorten/adjust wizard to a 6-step flow (Intro, Info Form, Document Upload, Schedule selection, Review summary, Submission).
3. Connect form state and file upload fields to Firestore databases.
4. Set status initial state as `'Pending Admin Review'`.

## Phase 2: Live Reminders & Tracker
1. Modify `RemindersScreen.tsx` to read the live Firestore record.
2. Render a step progress indicator showing:
   `Pending Admin Review` -> `For Verification` -> `For Processing` -> `Assigned` -> `In Progress` -> `Completed`
3. Trigger realtime updates via `onSnapshot` inside `DatabaseContext`.

## Phase 3: Admin Review Dashboard
1. Update `AdminBookingsScreen.tsx` to show Registration requests.
2. Enable admin actions: Verify Documents, Assign Liaison Staff, Change Status.
3. Log updates in real-time.
