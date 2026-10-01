# SuperPay Admin

Next.js 16 + Tailwind CSS v4 admin console for the `superpayment` API.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
```

The API is expected at `http://localhost:3001` (override with `BACKEND_URL`).
Log in with an account from the `user_password` table, e.g. `admin` / `admin`.

## Environment

| Variable         | Default                 | Notes                                        |
| ---------------- | ----------------------- | -------------------------------------------- |
| `BACKEND_URL`    | `http://localhost:3001` | superpayment API; server-side only           |
| `SESSION_SECRET` | dev-only fallback       | **required in production** — signs sessions  |
| `PORT`           | `3000` (`4600` in Docker) |                                            |

## Docker

The image listens on **port 4600**.

```bash
docker build -t superpay-admin .
docker run -p 4600:4600 \
  -e SESSION_SECRET="$(openssl rand -hex 32)" \
  -e BACKEND_URL=http://host.docker.internal:3001 \
  superpay-admin
# → http://localhost:4600
```

Inside a container `localhost` is the container itself, so point `BACKEND_URL`
at the API's reachable address: `host.docker.internal` when the API runs on the
Docker host, or the service name (e.g. `http://superpayment:3001`) on a shared
Docker network.
