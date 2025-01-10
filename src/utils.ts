function getServerUrl() {
    const url = window.location.origin
    console.log(url)
    if(url.indexOf('onrender.com') > 0) {
        return url
    } else {
        return url.replace(':5173', ':3000')
    }
}

export function getApiUrl(callPoint: string) {
    const url = new URL(`${getServerUrl()}/api/${callPoint}`)
    return url.toString()
}