import Koa from 'koa'
import Router from '@koa/router'
import serve from 'koa-static'
import multer from '@koa/multer'
import axios from 'axios'
import path from 'path'
import FormData from 'form-data'

const prod = (process.env.NODE_ENV === 'production')

const app = new Koa()
const router = new Router()

// multer config
const memoryStorage = multer.memoryStorage()
const imageFilter = function(req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG)$/)) { // plantnet accepts only png and jpeg files
        req.fileValidationError = 'Only image files are allowed'
        return cb(new Error('Only image files are allowed!'), false)
    }
    cb(null, true);
}
const upload = multer({
    storage: memoryStorage,
    limits: {
        fileSize: 12 * 1024 * 1024 // max file size 12MB
    },
    fileFilter: imageFilter
})

if (prod) {
  app.use(async (ctx, next) => {
    ctx.set('Access-Control-Allow-Origin', '*');
    ctx.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    ctx.set('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
    await next();
  })
}

router.post('/api/plantnet-identify', upload.single('image'), async (ctx) => {
  try {
    if (!ctx.request.body) throw new Error('malformed request')
    if (!ctx.request.body['organs']) throw new Error('organs required')
    if (!ctx.request.body['lang']) throw new Error('lang required')
    if (!ctx.file) throw new Error('image file required')

    const organs = ctx.request.body['organs']
    const lang = ctx.request.body['lang']

    console.log(`plantnet identification type ${organs} lang ${lang} for an image of ${ctx.file.size}B`)

    // build a plantnet post identify request
    const form = new FormData()
    form.append('organs', organs)
    const blob = new Blob([ctx.file.buffer], { type: ctx.file.mimetype })
    form.append('images', blob, ctx.file.originalname)

    axios.post(
      `https://my-api.plantnet.org/v2/identify/all?api-key=2b10uKobhNtnceQ7cvc3tseye&include-related-images=true&lang=${lang}`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Host': 'https://osmtree.onrender.com/'
        }
      }
    ).then((response) => {
      console.log('success')
      console.log('success, best match: ', response.data.bestMatch)
      ctx.body = {
        sucess: 200,
        results: response.data.results
      }
    }).catch((error) => {
      console.error('plantnet API error')
      if(error.response && error.response.data) {
        console.error(error.response.data)
        ctx.body = {error: 21, data: error.response.data}
      } else {
        console.error(error)
        ctx.body = {error: 22, data: {message: 'unknown error from plantnet API call'}}
      }
    })
  } catch (e) {
    console.log(e)
    ctx.body = { error: -1, data: {message: e.message} }
  }
})

app.use(router.routes())
app.use(router.allowedMethods())

// serve static client files for production
if (prod) {
  app.use(serve(path.resolve(__dirname, '../../dist/client')))
}

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})