import express from 'express'
import multer from 'multer'
import axios from 'axios'
import { fileURLToPath } from 'url'
import path from 'path'
import FormData from 'form-data'
import cors from 'cors'
import { json } from 'stream/consumers'

const prod = (process.env.NODE_ENV === 'production')

const instances = ['https://gall.openstreetmap.de', 'https://lambert.openstreetmap.de', 'https://lz4.overpass-api.de', 'https://z.overpass-api.de']
const simpleCache: Record<string, GeoJSON.FeatureCollection> = {} // request url -> feature collection result
// TODO: count cache age and empty old cache

const app = express()

app.use(cors({
    origin: 'http://localhost:5173' // client URL allowed for CORS
}))

// multer config
const memoryStorage = multer.memoryStorage()
const imageFilter = function(req: any, file: any, cb: CallableFunction) {
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

const formatMemoryUsage = (data: number) => `${Math.round(data / 1024 / 1024 * 100) / 100} MB`

const osmToPointFeatureCollection = (elements: any) => {
    const features: Array<GeoJSON.Feature> = []

    try {
        elements.forEach(function(e: any) {
            if(e.type === 'node' && e.hasOwnProperty('tags')) {
                const feature: GeoJSON.Feature = {
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [e.lon, e.lat]
                    },
                    properties: e.tags,
                    id: e.id
                }
                features.push(feature)
            }
        })
    } catch(e) {
        console.error(e)
    }

    const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: features
    }
    return geojson
  }

app.get('/api', (req, res) => {
    console.log('/api')
    const memoryData = process.memoryUsage()
    const memoryUsage = {
        status: 'running',
        rss: `${formatMemoryUsage(memoryData.rss)} -> Resident Set Size - total memory allocated for the process execution`,
        heapTotal: `${formatMemoryUsage(memoryData.heapTotal)} -> total size of the allocated heap`,
        heapUsed: `${formatMemoryUsage(memoryData.heapUsed)} -> actual memory used during the execution`,
        external: `${formatMemoryUsage(memoryData.external)} -> V8 external memory`,
    }
    res.json(memoryUsage)
})

app.get('/api/data', (req, res) => {
    try {
        if (req.query.bounds === undefined || req.query.codename === undefined) {
            res.json({error: 3, message: 'bounds and codename parameters required'})
        } else {
            const instance = instances[Math.floor(Math.random() * instances.length)]

            const codename = req.query.codename
            const bounds = req.query.bounds
            console.log(`/api/data request on ${instance} for codename: ${req.query.codename} and bounds: ${bounds}`)

            const filter = '["natural"~"shrub|tree"]'
            const query = `[out:json][timeout:25];(node${filter}(${bounds}););out body;>;out skel qt;`

            const fullUrl = `${instance}/api/interpreter?data=${encodeURIComponent(query)}`
            //console.log(fullUrl)

            if(simpleCache.hasOwnProperty(query)) {
                console.log('[result in cache]')
                res.json({...simpleCache[query], codename: codename})
            } else {
                axios.get(fullUrl).then((response) => {
                    if (response.data && response.data.elements) {
                        const geojson = osmToPointFeatureCollection(response.data.elements)
                        simpleCache[query] = geojson
                        res.json({...geojson, codename: codename})
                    } else {
                        res.json({
                            codename: codename,
                            error: 4,
                            message: 'no data or bad overpass response'
                        })
                    }
                }).catch((err) => {
                    console.log('error', err.message)
                    res.json({codename: codename, error: 1, message: err.message})
                })
            }
        }
    } catch(err) {
        //console.error(err)
        res.json({error: 2})
    }
})

app.post('/api/plantnet-identify', upload.single('image'), (req, res) => {
    console.log('plantnet-identify')
    try {
        if (!req.body['organs']) throw new Error('organs required')
        if (!req.body['lang']) throw new Error('lang required')
        if (!req['file']) throw new Error('image file required')

        const organs = req.body['organs']
        const lang = req.body['lang']

        console.log(`plantnet identification type ${organs} lang ${lang} for an image of ${req['file'].size}B`)

        // build a plantnet post identify request
        const form = new FormData()
        form.append('organs', organs)
        form.append('images', req['file'].buffer, req['file'].originalname)

        const headers = form.getHeaders()
        headers['Host'] = 'https://osmtree.onrender.com'

        axios.post(
            `https://my-api.plantnet.org/v2/identify/all?api-key=2b10uKobhNtnceQ7cvc3tseye&include-related-images=true&lang=${req.body.lang}`,
            form, {
                headers: form.getHeaders() // 'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`
            }
        ).then((response) => {
            console.log('success, best match: ', response.data.bestMatch)
            res.json({
                sucess: 200,
                results: response.data.results
            })
        }).catch((error) => {
            console.error('plantnet API error')
            if(error.response !== undefined && error.response.data !== undefined) {
                console.error(error.response.data)
                res.json({error: 21, data: error.response.data})
            } else {
                console.error(error)
                res.json({error: 22, data: {message: 'unknown error from plantnet API call'}})
            }
        })
    } catch (error) {
        console.error('plantnet-identify error')
        res.json({error: 20})
    }
})

// serve static client files for production
if (prod) {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const staticDir = path.resolve(__dirname, '../../dist')
    console.log('Serving static files: ' + staticDir)
    app.use(express.static(staticDir))
}

function listRoutes() {
    app._router.stack.forEach((middleware: any) => {
        if (middleware.route) {
            // Routes directes
            console.log(`${Object.keys(middleware.route.methods)} ${middleware.route.path}`)
        } else if (middleware.name === 'router') {
            // Router middleware
            middleware.handle.stack.forEach((handler: any) => {
                if (handler.route) {
                    const path = handler.route.path
                    const methods = Object.keys(handler.route.methods)
                    console.log(`${methods} ${path}`)
                }
            })
        }
    })
}

console.log('API call points are:')
listRoutes()

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})