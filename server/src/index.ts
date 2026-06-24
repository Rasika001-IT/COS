import { env } from './config/env.js'
import { connectDb } from './db/connect.js'
import { createApp } from './app.js'

async function main() {
  await connectDb(env.mongoUrl)
  const app = createApp()
  app.listen(env.port, () => {
    console.log(`[constructos] API on http://localhost:${env.port}  (env: ${env.nodeEnv})`)
  })
}

main().catch((err) => {
  console.error('[constructos] failed to start:', err)
  process.exit(1)
})
