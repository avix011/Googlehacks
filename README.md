# SurveyLens Dashboard

**Real-time Survey Analytics Platform with Firebase Cloud Integration**

A modern, responsive web application for collecting, analyzing, and visualizing community survey data with volunteer coordination. Built with Vanilla JavaScript and Firebase Realtime Database.

---

## Features

### 📊 Data Collection
- **Survey Entry Form**: Collect respondent data with validation
- **Volunteer Registration**: Register volunteers and track availability
- **Issue Tracking**: Multi-select issues with emoji categorization
- **Real-time Persistence**: Data synced to cloud and localStorage

### 📈 Analytics & Visualization
- **6 Interactive Charts**: Doughnut, Line, Polar Area, Radar charts
- **Issue Distribution**: See which issues are most common
- **Demographics Analysis**: Age groups, gender, education distribution
- **Trends Over Time**: Track survey responses by date
- **Pattern Recognition**: Identify correlations and patterns in data

### 🗂️ Data Management
- **Advanced Filtering**: Filter by location, issue, education level
- **Sortable Tables**: Click column headers to sort data
- **Global Search**: Find records across all fields
- **Data Export**: View complete dataset in organized tables
- **Record Deletion**: Remove individual records with confirmation

### 👥 Volunteer Management
- **Registration System**: Multi-field volunteer registration
- **Availability Tracking**: Full-time, Part-time, Weekends, On-call
- **Issue Specialization**: Match volunteers to specific issues
- **Experience Levels**: Track volunteer qualifications
- **Volunteer Cards**: Display all registered volunteers with profiles

### 🔄 Real-time Sync
- **Cloud Storage**: Firebase Realtime Database integration
- **Instant Updates**: Changes appear across all devices in real-time
- **Offline Support**: Continue working offline with localStorage fallback
- **Automatic Sync**: Data syncs to cloud when connection restored

### 📱 User Experience
- **Responsive Design**: Works on desktop, tablet, mobile
- **Dark Theme**: Easy on the eyes, modern aesthetics
- **Smooth Animations**: Professional transitions and interactions
- **Toast Notifications**: User feedback for all actions
- **Sidebar Navigation**: Quick access to all sections

---

## Project Structure

```
googlehacks/
├── index.html           # Main HTML entry point
├── app.js              # Original working app (localStorage only)
├── app-firebase.js     # Firebase-integrated version (new)
├── data.js             # Shared data utilities and validators
├── firebase-config.js  # Firebase initialization and configuration
├── index.css           # Styling (dark theme, responsive)
├── FIREBASE-SETUP.md   # Firebase project setup instructions
├── DEPLOYMENT.md       # Deployment guide for production
└── README.md           # This file
```

### File Descriptions

| File | Purpose | Status |
|------|---------|--------|
| `index.html` | UI structure, forms, sections | ✅ Production-ready |
| `app-firebase.js` | Main app logic with Firebase sync | ✅ Production-ready |
| `firebase-config.js` | Firebase credentials & initialization | ⚠️ Needs configuration |
| `data.js` | Data validation & utilities | ✅ Production-ready |
| `index.css` | All styling (no changes needed) | ✅ Production-ready |
| `app.js` | Legacy version (reference only) | ⚠️ Keep for fallback |

---

## Installation & Setup

### 1. Local Development (No Firebase)

To run the app **without Firebase** (using localStorage only):

1. **Clone or download** the project files
2. **Open in browser**: Double-click `index.html` or use a local server
3. **Start using**: Navigate to "Add Survey" and submit data
4. Data is saved in browser's localStorage (persists across sessions)

```bash
# If you prefer using a local server (recommended)
python -m http.server 8000
# Then visit: http://localhost:8000
```

### 2. With Firebase Integration

To enable cloud storage and real-time sync:

1. **Follow Firebase Setup**: Read [`FIREBASE-SETUP.md`](./FIREBASE-SETUP.md)
   - Create Firebase project
   - Enable Realtime Database
   - Get your API credentials
   
2. **Configure credentials**: Edit `firebase-config.js`
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     // ... other fields
   };
   ```

3. **Verify configuration**: 
   - Open DevTools (F12) → Console
   - No Firebase errors should appear
   - Submit a survey and check Firebase Console

4. **Monitor data**: 
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project → Realtime Database
   - See data appear under `/surveys` and `/volunteers` paths

### 3. Production Deployment

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for:
- Firebase Hosting setup
- Database security rules configuration
- Performance optimization
- CI/CD integration

---

## Data Structure

### Survey Record
```javascript
{
  id: "survey_1234567890",
  name: "Rajesh Kumar",
  age: 34,
  gender: "Male",
  location: "DELHI",
  date: "2024-04-26",
  education: "12th Pass",
  issue: "Health, Education, Water",
  notes: "Prefers morning visits",
  createdAt: 1714089600000  // Timestamp in Firebase
}
```

### Volunteer Record
```javascript
{
  id: "vol_1234567890",
  name: "Priya Sharma",
  age: 28,
  gender: "Female",
  phone: "9876543210",
  email: "priya@example.com",
  area: "DELHI",
  availability: "Part-time",
  experience: "3-5 years",
  qualification: "B.Ed",
  issues: "Health, Education, Sanitation",
  bio: "Social worker focused on health awareness",
  registeredOn: 1714089600000  // Timestamp
}
```

---

## Usage Guide

### 📋 Adding Surveys

1. Click **"Add Survey"** in sidebar
2. Fill survey form:
   - Personal info (name, age, gender)
   - Location and survey date
   - Select one or more issues
   - Add optional notes
3. Click **"Save Entry"**
4. See success notification
5. Data saved to localStorage + Firebase (if configured)

### 👥 Registering Volunteers

1. Click **"Volunteer"** in sidebar
2. Fill volunteer form:
   - Personal info (name, age, gender, phone, email)
   - Service area (location)
   - Availability (Full-time/Part-time/etc)
   - Issues they can handle (multi-select)
   - Experience and qualification
   - Optional bio
3. Click **"Register Volunteer"**
4. See registered volunteers list on right panel

### 📊 Viewing Analytics

1. Click **"Analyze Data"** in sidebar
2. See 6 interactive charts:
   - **Doughnut**: Issue frequency distribution
   - **Line**: Survey responses over time
   - **Polar Area**: Education level distribution
   - **Radar**: Age group demographics
3. Use filters to focus on specific locations/issues

### 🔍 Filtering & Searching

#### Using Filters (Data Table)
1. Go to **"View Data"** section
2. Use dropdowns: Location, Issue, Education
3. Click **"Clear Filters"** to reset

#### Global Search
1. Use search box in top bar (all sections)
2. Search by any field: name, location, issue, phone, etc.

#### Sorting
1. Click column headers in tables to sort
2. Click again to reverse sort order

### 🔄 Assignment Workflow

1. Go to **"Assignments"** section
2. See tabs: "Unassigned Issues" and "Assigned Issues"
3. Drag volunteers to issues to create assignments (future feature)
4. Track volunteer workload

---

## Browser Compatibility

| Browser | Status | Version |
|---------|--------|---------|
| Chrome | ✅ Full support | 90+ |
| Firefox | ✅ Full support | 88+ |
| Safari | ✅ Full support | 14+ |
| Edge | ✅ Full support | 90+ |
| IE 11 | ❌ Not supported | - |

**Note**: ES6 modules require modern browsers. For IE11 support, use `app.js` instead of `app-firebase.js`.

---

## Data Persistence

### localStorage (Default)
- ✅ Works offline
- ✅ No configuration needed
- ❌ Limited to ~5MB
- ❌ Not shared across devices
- ❌ Lost if browser cache cleared

### Firebase Realtime Database (Cloud)
- ✅ Unlimited storage
- ✅ Real-time sync across devices
- ✅ Automatic backups
- ❌ Requires internet connection
- ❌ Requires Firebase configuration

**Recommended**: Use both (localStorage for offline, Firebase for cloud)

---

## API & Integration

### Importing Data Functions

```javascript
// data.js exports these functions
import { 
  loadSurveyData, 
  saveSurveyData, 
  addSurveyRecord,
  deleteSurveyRecord,
  loadVolunteerData,
  saveVolunteerData,
  addVolunteerRecord,
  deleteVolunteerRecord
} from './data.js';
```

### Firebase Integration

```javascript
// app-firebase.js provides Firebase sync
import { database } from './firebase-config.js';

// Push survey to Firebase
import { ref, push } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js';

const surveysRef = ref(database, 'surveys');
await push(surveysRef, surveyData);
```

---

## Troubleshooting

### Issue: Data not saving
**Solution**: Check browser console (F12). Ensure all form fields are filled. Try clearing browser cache.

### Issue: Firebase not working
**Solution**: Open `firebase-config.js`. Verify all credentials are filled. Check Firebase Console for errors.

### Issue: Charts not displaying
**Solution**: Ensure Chart.js loads correctly. Check that you have survey data. Refresh page and try again.

### Issue: Volunteer form not working
**Solution**: Verify all required fields are filled (marked with *). Check browser console for errors.

### Issue: Search not finding records
**Solution**: Search is case-insensitive. Try searching partial names or numbers.

---

## Performance Tips

1. **Limit records in view**: Use filters to reduce loaded records
2. **Archive old data**: Periodically move old surveys to archive
3. **Optimize database**: Set Firebase database indexes for common queries
4. **Clear cache**: Periodically clear localStorage to free space

---

## Security Notes

### Development Mode
- Test mode allows all reads/writes
- Good for development and testing
- **NOT safe for production**

### Production Deployment
- Update Firebase security rules
- Implement user authentication
- Enable HTTPS only
- See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for details

---

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Frontend | Vanilla JavaScript | ES6+ |
| Database | Firebase Realtime DB | v10.7.0 |
| Charts | Chart.js | 4.4.1 |
| CSS | Vanilla CSS3 | - |
| Fonts | Google Fonts (Inter) | - |
| Hosting | Firebase Hosting | - |

---

## Development Roadmap

### Current Features ✅
- Survey data collection and storage
- Volunteer registration system
- Real-time analytics dashboard
- Data filtering and sorting
- Global search functionality

### Upcoming Features 🚀
- **User Authentication**: Firebase Auth integration
- **Advanced Analytics**: ML-based pattern detection
- **Export/Import**: CSV and PDF export
- **Mobile App**: React Native version
- **Offline-first**: Full offline mode with IndexedDB
- **Real-time Collaboration**: Live editing and sync
- **Role-based Access**: Admin, Editor, Viewer roles
- **Audit Logs**: Track all data changes

---

## Contributing

To improve this project:

1. Report bugs via issue tracker
2. Suggest features with use cases
3. Submit pull requests with improvements
4. Add tests for new functionality

---

## License

This project is open source. Feel free to use, modify, and distribute.

---

## Support & Resources

- **Firebase Console**: https://console.firebase.google.com/
- **Firebase Docs**: https://firebase.google.com/docs/database
- **Chart.js Docs**: https://www.chartjs.org/
- **MDN Web Docs**: https://developer.mozilla.org/

---

## Quick Start Command Reference

```bash
# Start local server
python -m http.server 8000

# Access app
open http://localhost:8000

# View logs
open DevTools (F12) → Console
```

---

**Version**: 2.0 (Firebase Integration)  
**Last Updated**: April 26, 2024  
**Maintainer**: SurveyLens Team
