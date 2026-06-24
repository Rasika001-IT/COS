import { Router, type Request, type Response, type NextFunction } from 'express'
import multer from 'multer'
import { authenticate } from '../../middleware/auth.js'
import { Err } from '../../lib/errors.js'
import { allowedMime, uploadToR2, MAX_UPLOAD_BYTES } from '../../lib/r2.js'

// File uploads → Cloudflare R2 (CONTRACT.md photo fields are plain URL strings;
// this is the only endpoint that turns a browser File into one).
export const uploadsRouter = Router()
uploadsRouter.use(authenticate)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!allowedMime(file.mimetype)) {
      cb(new Error('UNSUPPORTED_MIME'))
      return
    }
    cb(null, true)
  },
})

uploadsRouter.post('/uploads', (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      next(Err.validation('File is too large (max 10MB).', { file: 'Max 10MB' }))
      return
    }
    if (err instanceof Error && err.message === 'UNSUPPORTED_MIME') {
      next(Err.validation('Unsupported file type. Use JPG, PNG, WEBP, or GIF.', { file: 'Unsupported type' }))
      return
    }
    if (err) {
      next(err)
      return
    }
    void handleUpload(req, res, next)
  })
})

async function handleUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file
    if (!file) throw Err.validation('No file provided.', { file: 'Required' })
    const url = await uploadToR2(req.user!.orgId, file.buffer, file.mimetype)
    res.json({ url })
  } catch (e) {
    next(e)
  }
}
