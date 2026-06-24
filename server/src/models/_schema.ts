// Shared Mongoose options: expose `id` (string) and strip `_id`/`__v` so responses
// match the frontend's `{ id, ... }` shape. `passwordHash` is dropped everywhere.
// NOTE: left untyped (not annotated as SchemaOptions) so it stays structurally
// assignable to each typed Schema<T>'s options generic.
export const baseSchemaOptions = {
  timestamps: false,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform(_doc: unknown, ret: Record<string, unknown>) {
      const id = ret._id as { toString(): string } | undefined
      ret.id = id?.toString()
      delete ret._id
      delete ret.passwordHash
      return ret
    },
  },
}
