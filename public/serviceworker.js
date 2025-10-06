self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", () => {
    reloadTabs()
    listen()
})

let eventSource
async function listen() {
    eventSource = new EventSource("/api/events",  {
        withCredentials: true
    })

    eventSource.onmessage = async (e) => {
        e.dataJSON = JSON.parse(e.data || "{}")
        if(e.dataJSON?.event == "db") reloadTabs()
    }

    eventSource.onerror = (e) => {
        eventSource.close()
        listen()
    }
}

async function reloadTabs() {
    let windowClients = await self.clients.matchAll({ type: "window" })
    windowClients.forEach(windowClient => {
        windowClient.navigate(windowClient.url)
    })
}