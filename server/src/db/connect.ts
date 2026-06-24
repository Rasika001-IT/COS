import mongoose from 'mongoose'
import dns from 'node:dns'

export async function connectDb(uri: string): Promise<typeof mongoose> {
  // mongodb+srv:// needs DNS SRV/TXT lookups. Some local resolvers refuse Node's
  // (c-ares) SRV queries even when the OS resolves them — pin a public resolver so
  // the SRV lookup succeeds. Harmless for non-srv URIs.
  if (uri.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1'])
    } catch {
      /* ignore — fall back to system resolver */
    }
  }
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri)
  return mongoose
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect()
}
