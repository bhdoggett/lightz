import { useState, useEffect } from 'react'

interface UpdateInfo {
  latestVersion: string
  url: string
}

function isNewer(latest: string, current: string): boolean {
  const l = latest.replace(/^v/, '').split('.').map(Number)
  const c = current.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((l[i] ?? 0) > (c[i] ?? 0)) return true
    if ((l[i] ?? 0) < (c[i] ?? 0)) return false
  }
  return false
}

export function useUpdateCheck(currentVersion: string) {
  const [update, setUpdate] = useState<UpdateInfo | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch('https://api.github.com/repos/bhdoggett/lightz/releases/latest')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.tag_name) return
        if (isNewer(data.tag_name, currentVersion)) {
          setUpdate({ latestVersion: data.tag_name.replace(/^v/, ''), url: data.html_url })
        }
      })
      .catch(() => {})
  }, [currentVersion])

  return { update: dismissed ? null : update, dismiss: () => setDismissed(true) }
}
