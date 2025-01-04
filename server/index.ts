import Koa from 'koa'
import Router from '@koa/router'
import serve from 'koa-static'
import bodyParser from 'koa-bodyparser'
import multer from '@koa/multer'
import cors from '@koa/cors'
import path from 'path'

const prod = (process.env.NODE_ENV === 'production')
const app = new Koa()
const router = new Router()

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop())
  }
})

const fileFilter = (req, file, cb) => {
  // accept only images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('Format de fichier non supporté'), false)
  }
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // max 5MB
  }
})

// API Routes
router.get('/api/hello', async (ctx) => {
  ctx.body = { message: 'Hello from API!' }
})

router.post('/api/plantnet-identify', upload.single('image'), async (ctx) => {
  try {
    if (!ctx.request.body) throw new Error('malformed request')
    if (!ctx.request.body['organs']) throw new Error('organs required')
    if (!ctx.request.body['lang']) throw new Error('lang required')

    const organs = ctx.request.body['organs']
    console.log(`plantnet identification ${organs}`)
    ctx.body = { message: 'identified' }
  } catch (e) {
    ctx.body = { error: e.message }
  }
})

app.use(cors())
app.use(router.routes())
app.use(router.allowedMethods())
app.use(bodyParser())

// serve static client files for production
if (prod) {
  app.use(serve(path.resolve(__dirname, '../../dist/client')))
}

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})