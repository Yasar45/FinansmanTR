# Infrastructure Diagrams

## Application Topology

```mermaid
flowchart LR
  subgraph Vercel[Next.js on Vercel]
    App[App Router / API Routes]
  end

  subgraph Worker[Worker Runtime]
    Tick[Tick Engine Worker]
    Oracle[Pricing Oracle Worker]
    Notifications[Notification Dispatcher]
  end

  subgraph Data[Managed Services]
    DB[(PostgreSQL)]
    Redis[(Redis / Upstash)]
    Storage[(S3-Compatible Storage)]
  end

  subgraph Observability[Observability]
    Logflare[(Logflare)]
    Metrics[(Metrics Scraper)]
  end

  App -->|Prisma| DB
  Tick -->|Prisma| DB
  Oracle -->|Prisma| DB
  App -->|BullMQ| Redis
  Tick -->|BullMQ| Redis
  Oracle -->|BullMQ| Redis
  Notifications -->|BullMQ| Redis
  App -->|S3 SDK| Storage
  Tick -->|Uploads| Storage
  App -->|Logs| Logflare
  Tick -->|Logs| Logflare
  Metrics -->|HTTP| App
  Metrics -->|HTTP| Worker
```

## Deployment Pipeline

```mermaid
graph TD
  Dev[Developer]
  GitHub[GitHub]
  CI[GitHub Actions CI]
  Vercel[Vercel Deploy]
  WorkerDeploy[Worker Deploy (Fly/Render/Railway)]

  Dev -->|git push| GitHub
  GitHub --> CI
  CI -->|build & test| CI
  CI -->|vercel --prod| Vercel
  CI -->|docker build/push| WorkerDeploy
```

