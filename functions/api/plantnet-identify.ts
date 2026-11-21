// Cloudflare Pages Function: POST /api/plantnet-identify
// Relays an identification request to the Pl@ntNet API so that the API key stays server-side.
// Response contract (unchanged from the former Express server):
//   success -> {results}
//   error   -> {error: 20 (bad request) | 21 (Pl@ntNet API error) | 22 (network/unknown error), data?}

interface Env {
    PLANTNET_API_KEY: string
}

const MAX_FILE_SIZE = 12 * 1024 * 1024 // 12 MB
const IMAGE_NAME_REGEX = /\.(jpe?g|png)$/i // Pl@ntNet accepts only png and jpeg files

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
    if (!env.PLANTNET_API_KEY) {
        console.error('PLANTNET_API_KEY is not set')
        return Response.json({ error: 22, data: { message: 'server misconfiguration' } })
    }

    let organs: string, lang: string, image: File
    try {
        const body = await request.formData()
        const organsValue = body.get('organs')
        const langValue = body.get('lang')
        const imageValue = body.get('image')
        if (typeof organsValue !== 'string' || organsValue === '') throw new Error('organs required')
        if (typeof langValue !== 'string' || langValue === '') throw new Error('lang required')
        if (!(imageValue instanceof File)) throw new Error('image file required')
        if (!IMAGE_NAME_REGEX.test(imageValue.name)) throw new Error('only jpeg and png images are allowed')
        if (imageValue.size > MAX_FILE_SIZE) throw new Error('image too large')
        organs = organsValue
        lang = langValue
        image = imageValue
    } catch (error) {
        console.error('plantnet-identify bad request:', error)
        return Response.json({ error: 20 })
    }

    console.log(`plantnet identification type ${organs} lang ${lang} for an image of ${image.size}B`)

    const form = new FormData()
    form.append('organs', organs)
    form.append('images', image, image.name)

    const url = new URL('https://my-api.plantnet.org/v2/identify/all')
    url.searchParams.set('api-key', env.PLANTNET_API_KEY)
    url.searchParams.set('include-related-images', 'true')
    url.searchParams.set('lang', lang)

    try {
        const response = await fetch(url, { method: 'POST', body: form })
        const data = await response.json<{ results?: unknown, bestMatch?: string }>().catch(() => undefined)
        if (!response.ok || data === undefined) {
            console.error('plantnet API error', response.status, data)
            return Response.json({ error: 21, data: data ?? { message: `HTTP ${response.status}` } })
        }
        console.log('success, best match:', data.bestMatch)
        return Response.json({ results: data.results })
    } catch (error) {
        console.error('plantnet API call failed', error)
        return Response.json({ error: 22, data: { message: 'unknown error from plantnet API call' } })
    }
}
