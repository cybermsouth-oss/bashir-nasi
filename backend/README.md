# Backend Blueprint — Bashiri Nasi

## Recommended stack

- PHP 8.2+
- Laravel 11+
- MySQL 8+
- REST API architecture

## System architecture

- Public frontend pages serve static HTML/CSS/JS.
- Laravel handles admin panel, API, authentication, and database.
- API endpoints return JSON data for predictions, mkeka, jackpot, and results.
- Admin panel supports CRUD operations and statistics.

## Backend modules

- Controllers:
  - `AdminController`
  - `TipsterController`
  - `UserController`
  - `PurchaseController`
  - `BlockedTeamController`

- Models:
  - `User`
  - `Tip`
  - `Purchase`

- Middleware:
  - `auth`
  - `admin`
  - `tipster`

- Views:
  - `admin.dashboard`
  - `admin.predictions.index`
  - `admin.mkeka.index`
  - `admin.jackpot.index`
  - `admin.results.index`
  - `admin.users.index`
  - `admin.statistics`

## API endpoints

- `GET /api/tips` — Returns all tips.
- `POST /api/tipster/upload-tip` — Tipster uploads tip.
- `POST /api/user/buy-tip` — User buys tip.
- `GET /api/admin/users` — Admin gets users.
- `GET /api/admin/tipsters` — Admin gets tipsters.

## Admin panel

- View Users
- View Tipsters
- View All Tips

## Deployment notes

1. Create Laravel project.
2. Configure `.env` for database and app URL.
3. Run migrations and seeders.
4. Set file permissions for `storage` and `bootstrap/cache`.
5. Configure web server to point to `public/`.
6. Enable SSL and connect the domain.

## Database migrations

Create migrations for the tables described in `../sql/schema.sql`.
