<a id="readme-top"></a>

<br />
<div align="center">
  <a href="https://notificationx.com">
    <img src="https://notificationx.com/wp-content/uploads/2025/02/NotificationX.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">NotificationX E2E Test Automation</h3>

  <p align="center">
    Full admin + frontend Playwright test suite for NotificationX (Free + Pro)
  </p>
</div>

## About The Project

[NotificationX](https://notificationx.com) is a popular WordPress FOMO (Fear of Missing Out) and social proof notification plugin. It displays real-time sales alerts, review popups, download stats, comments, cookie notices, growth alerts, and more — driving conversions through social proof.

This project provides comprehensive end-to-end automation testing for NotificationX using Playwright. It covers admin panel exploration, notification creation via Add New and Quick Builder wizards, frontend display verification, analytics validation, and full CRUD operations across all notification types.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

* [![Node][Node.js]][Node-url]
* [![Playwright][Playwright.js]][Playwright-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started

### Prerequisites

- Node.js version 22 LTS
- npm

### Installation

1. Clone the repo
   ```sh
   git clone <repo-url>
   ```
2. Install NPM packages
   ```sh
   npm install
   ```
3. Create the `.env` file and provide necessary details
   ```sh
   cp .env.example .env
   ```
   Required variables:
   ```env
   BASE_URL=https://your-site.com
   ADMIN_USER=admin@email.com
   ADMIN_PASS=your-password
   ```
4. Install Playwright browsers
   ```sh
   npx playwright install --with-deps
   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Usage

```sh
# Run all tests (headless)
npm test

# Run in headed mode (visible browser)
npm run test:headed

# Run with Playwright UI
npm run test:ui

# Run a specific test file
npx playwright test tests/1-explore-sections.spec.js

# View HTML report
npm run report
```

_For more examples, refer to the [Playwright Documentation](https://playwright.dev)_

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Project Structure

```
notificationx-e2e/
├── .env                                 # Environment variables (BASE_URL, credentials)
├── .gitignore                           # Standard ignores
├── package.json                         # Dependencies & scripts
├── playwright.config.js                 # Playwright configuration
├── README.md                            # This file
├── helpers/
│   └── utils.js                         # Shared utilities (safeGoto, gotoNxPage, etc.)
├── snapshots/                           # Reference screenshots from section exploration
├── tests/
│   ├── auth.setup.js                    # Admin authentication with storage state
│   ├── 1-explore-sections.spec.js       # Explore all NX admin sections & take snapshots
│   ├── 2-add-new-notifications.spec.js  # Create all notification types via Add New wizard
│   ├── 3-quick-builder-notifications.spec.js  # Create all types via Quick Builder
│   └── 4-frontend-check.spec.js         # Frontend display, click, analytics verification
└── playwright/
    └── .auth/                           # Authentication storage states (gitignored)
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Test Flow

Tests are ordered **1 through 4** and designed to run sequentially:

### 1. Explore Sections (`1-explore-sections.spec.js`)
Navigates through every static/settings section in NotificationX admin and takes full-page screenshots for future reference.

**Sections covered:**
- NX Dashboard (All Notifications list)
- NX Settings > Global Settings tabs
- NX Settings > Role Management
- NX Settings > Cache Settings

**Excluded:** Add New wizard, Quick Builder, Analytics (dynamic data), notification creation flows.

### 2. Add New Notifications (`2-add-new-notifications.spec.js`)
Creates every notification type through the **Add New** multi-step wizard:

| Type | Source(s) |
|---|---|
| WooCommerce | Sales Notification, Reviews |
| Growth Alert | Growth Alert |
| Cookie Notice | Cookie Notice |
| eLearning | eLearning |
| Sales Notification | Sales |
| Notification Bar | Notification Bar |
| Contact Form | Contact Form |
| Download Stats | Download Stats |
| Comments | Comments |
| Discount Alert | Discount Alert |
| Donations | Donations |
| Flashing Tab | Flashing Tab |
| Custom Notification | Custom |
| Video | Video |
| Email Subscription | Email Subscription |

**Behaviour settings:** Display The Last → 2000, Display From The Last → 2000 days.

After all are created, **all notifications are deleted**.

### 3. Quick Builder Notifications (`3-quick-builder-notifications.spec.js`)
Same notification types created through the **Quick Builder** flow, with the same behaviour settings. All deleted after creation.

### 4. Frontend Check (`4-frontend-check.spec.js`)
Creates notifications that can display without external data:

- **Comment Notification** (position: left)
- **Cookie Notice** (position: right)
- **Custom Notification** (position: left)
- **Announcement / Notification Bar** (position: top/middle)

Then:
1. Visits the frontend and verifies notifications are visible
2. Clicks on some notifications
3. Returns to admin → Analytics and checks stats
4. Deletes all notifications

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Error Handling & Resilience

| Scenario | How It's Handled |
|---|---|
| **DB Connection Error** | `safeGoto()` detects "Error Establishing a Database Connection", waits 2 minutes, retries once |
| **Email Verification Screen** | `handleEmailVerification()` clicks "The email is correct" if WordPress shows the admin email check |
| **Slow NX Admin Load** | Extended timeouts (120s test, 60s navigation, 30s action) with `networkidle` waits |
| **Missing Notifications** | Delete functions gracefully handle empty lists |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Notification Types Reference

NotificationX (Free + Pro with WooCommerce) supports these notification types:

| Category | Types | Needs External Data? |
|---|---|---|
| WooCommerce | Sales, Reviews | Yes (orders/reviews) |
| Growth Alert | Growth Alert | Yes |
| Cookie Notice | Cookie Notice, GDPR | No |
| eLearning | LearnPress, Tutor LMS | Yes (enrollments) |
| Sales Notification | WooCommerce Sales | Yes (orders) |
| Notification Bar | Announcement Bar | No |
| Contact Form | WPForms, Ninja, Fluent, Gravity, Elementor | Yes (submissions) |
| Download Stats | WordPress.org Downloads | Yes (download data) |
| Comments | WP Comments | No (uses existing) |
| Discount Alert | WooCommerce Discounts | Yes |
| Donations | Give WP, others | Yes |
| Flashing Tab | Browser Tab Flash | No |
| Custom Notification | Manual Data Entry | No |
| Video | Video Embeds | No |
| Email Subscription | MailChimp, ConvertKit, etc. | Yes |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Roadmap

- [ ] Explore all NX admin sections with snapshots
- [ ] Create all notification types via Add New
- [ ] Create all notification types via Quick Builder
- [ ] Frontend notification display verification
- [ ] Frontend notification click tracking
- [ ] Analytics stats verification
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Cross-browser support (Firefox, WebKit)
- [ ] Multi-role testing (editor, subscriber views)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contact

Muammar Shahrear - [@Muammar Shahrear](https://www.linkedin.com/in/muammarshahrear/) - shahrearmuammar@gmail.com

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## About the Author

**Muammar Shahrear** is a software tester and researcher specializing in test automation, AI agents, WordPress plugin testing, and SaaS product quality assurance. He completed his B.Sc. and M.Sc. from the Institute of Information Technology (IIT), Jahangirnagar University (JU), Bangladesh, and also holds an M.Sc. from Technische Hochschule Mittelhessen (THM), Germany.

- [![LinkedIn][LinkedIn-shield]][LinkedIn-url]
- [![Google Scholar][Scholar-shield]][Scholar-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Acknowledgments

* [Playwright](https://playwright.dev)
* [NotificationX](https://notificationx.com)
* [othneildrew/Best-README-Template](https://github.com/othneildrew/Best-README-Template)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[Node.js]: https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white
[Node-url]: https://nodejs.org/
[Playwright.js]: https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white
[Playwright-url]: https://playwright.dev
[LinkedIn-shield]: https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white
[LinkedIn-url]: https://www.linkedin.com/in/muammarshahrear/
[Scholar-shield]: https://img.shields.io/badge/Google_Scholar-4285F4?style=for-the-badge&logo=googlescholar&logoColor=white
[Scholar-url]: https://scholar.google.com/citations?user=nPKujs4AAAAJ
