// Wikidata lookups, called directly from the browser (the API allows CORS with origin=*)

const wikidataApi = 'https://www.wikidata.org/w/api.php'
const timeoutMs = 5000

// Wikidata item (e.g. 'Q165145') of a taxon, from its GBIF taxon id (property P846), or undefined
export const getWikidataFromGbif = async (gbifId: string): Promise<string | undefined> => {
    if (!/^\d+$/.test(gbifId)) return undefined
    const url = new URL(wikidataApi)
    url.search = new URLSearchParams({
        action: 'query',
        list: 'search',
        srsearch: `haswbstatement:P846=${gbifId}`,
        srlimit: '1',
        srprop: '',
        format: 'json',
        origin: '*'
    }).toString()
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
        if (!response.ok) return undefined
        const data = await response.json()
        const title: unknown = data?.query?.search?.[0]?.title
        return typeof title === 'string' && /^Q\d+$/.test(title) ? title : undefined
    } catch (error) {
        console.error('Wikidata lookup failed', error)
        return undefined
    }
}
