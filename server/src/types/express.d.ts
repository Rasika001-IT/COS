import 'express'

declare global {
  namespace Express {
    interface Request {
      // Populated by the authenticate middleware from the verified access token.
      user?: {
        id: string
        orgId: string
        role: string
        name: string
        impersonatorId?: string
      }
    }
  }
}

export {}
