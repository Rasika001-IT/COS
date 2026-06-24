import { Notification, type INotification } from '../models/Notification.js'

// Create a notification for a user (or org broadcast when userId is null).
export async function notify(args: {
  orgId: string
  userId?: string | null
  type: INotification['type']
  title: string
  body: string
  link?: string
}): Promise<void> {
  await Notification.create({
    orgId: args.orgId,
    userId: args.userId ?? null,
    type: args.type,
    title: args.title,
    body: args.body,
    link: args.link,
    read: false,
    createdAt: new Date().toISOString(),
  })
}
