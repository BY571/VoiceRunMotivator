# Pacemaker Roadmap

## v1.0 — Google Play Store Launch

### Pre-launch (must do)

- [x] Remove duplicate permissions from app.json
- [x] Remove debug UI and console.log statements
- [x] Create privacy policy
- [ ] Host privacy policy at a public URL (push to GitHub, use `https://github.com/BY571/VoiceRunMotivator/blob/main/PRIVACY_POLICY.md`)
- [ ] Take 4–8 screenshots on a real Android device (goal screen, active run, settings)
- [ ] Create a Google Play Developer account ($25 one-time) — https://play.google.com/console/signup
- [ ] Build production AAB: `npx eas build --platform android --profile production`
- [ ] Create app listing in Google Play Console (name, descriptions, category)
- [ ] Complete content rating questionnaire (expected: Everyone)
- [ ] Complete data safety form (location collected, not shared, on-device only)
- [ ] Add privacy policy URL to store listing
- [ ] Upload AAB and submit for review

### Testing before submission

- [ ] Test full run on a real device (start, track, voice feedback, finish)
- [ ] Test background tracking (lock screen, put phone in pocket)
- [ ] Test permission flows on Android 10+ (foreground → background location prompt)
- [ ] Test with poor GPS signal (indoors) — verify the app doesn't crash
- [ ] Test on different screen sizes (phone and tablet if supporting)
- [ ] Test battery usage during a 30+ minute run

---

## v1.1 — Post-launch polish

- [x] Add pause/resume functionality during a run
- [x] Persist run data so it survives app crashes
- [x] Add run history screen (list of past runs with distance, time, pace)
- [x] Support miles as a unit option (in addition to km)
- [x] Add error boundaries with user-friendly messages instead of silent failures
- [x] Update packages to match Expo SDK expectations (`npx expo install --fix`)

---

## v1.2 — Feature expansion

- [ ] Export/share run summary (image or text)
- [ ] Google Fit / Health Connect integration
- [ ] Custom voice feedback phrases (let users write their own)
- [ ] Interval training mode (alternate fast/slow segments)
- [ ] Map view showing the route taken during a run
- [ ] Splits table showing pace per kilometer

---

## v2.0 — Bigger ideas

- [ ] Training plans (e.g. couch to 5K, 10K prep)
- [ ] Audio coaching with pre-recorded or TTS guided workouts
- [ ] Social features (share runs, compare with friends)
- [ ] Apple Watch / Wear OS companion
- [ ] iOS App Store release
- [ ] Offline elevation data for hill-adjusted pace
