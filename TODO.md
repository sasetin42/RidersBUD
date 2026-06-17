# Call System Enhancement TODO

## Phase 1: Core CallContext Enhancements ✅
- [x] Add TURN servers for better NAT traversal
- [x] Add call duration tracking
- [x] Add network quality monitoring
- [x] Add reconnection logic
- [x] Add call history support

## Phase 2: Enhanced CallUI Components ✅
- [x] Full-screen video call modal
- [x] Call timer display
- [x] Network quality indicator
- [x] Camera flip controls
- [x] Improved call controls

## Phase 3: New Support Components ✅
- [x] SupportCallButton - for customer to call Live Support
- [x] AdminCallButton - for admin to call mechanics/customers
- [x] CallHistoryModal - view past calls (CallHistoryButton)

## Phase 4: Page Updates ✅
- [x] SupportChatScreen.tsx - add Call button to chat
- [ ] AdminDashboardScreen.tsx - add call buttons to mechanics list (future)
- [ ] MechanicProfileScreen - add call to mechanic (future)

## Phase 5: Testing & Refinement
- [ ] Test all call flows work
- [ ] Test cross-network connectivity
- [ ] Test audio/video quality

---

**Status:** COMPLETED - Core implementation done
**Features Implemented:**
1. WebRTC with STUN + TURN servers for cross-network calls
2. Real-time call duration timer
3. Network quality monitoring
4. Full-screen video call modal
5. SupportCallButton for customer → Live Support
6. AdminCallButton for admin → customer/mechanic
7. MechanicCallButton for mechanic → customer/support
8. Call history tracking

**Last Updated:** Auto-generated
