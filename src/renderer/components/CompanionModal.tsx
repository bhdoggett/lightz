import { useState, useEffect, useCallback } from 'react'
import type { Scene } from '../../shared/types'
import styles from './CompanionModal.module.css'

interface Props {
  scenes: Scene[]
  port: number
  devicePath: string
  ports: string[]
  onPortChange: (port: number) => void
  onDevicePathChange: (path: string) => void
  onClose: () => void
}

export function CompanionModal({ scenes, port, devicePath, ports, onPortChange, onDevicePathChange, onClose }: Props) {
  const [draftPort, setDraftPort] = useState(String(port))
  const [draftPath, setDraftPath] = useState(devicePath)
  const [detectedPorts, setDetectedPorts] = useState<string[]>(ports)
  const base = `http://localhost:${port}`

  const copyToClipboard = (text: string) => navigator.clipboard?.writeText(text)

  const refreshPorts = useCallback(async () => {
    if (!window.electronAPI?.listPorts) return
    const found = await window.electronAPI.listPorts()
    setDetectedPorts(found)
  }, [])

  useEffect(() => {
    refreshPorts()
  }, [refreshPorts])

  return (
    <div className={styles.backdrop}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>Settings</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>DMX Device Path</h3>
          {detectedPorts.length > 0 ? (
            <div className={styles.portList}>
              {detectedPorts.map((p) => (
                <button
                  key={p}
                  className={styles.portOption}
                  onClick={() => setDraftPath(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          ) : (
            <p className={styles.noPorts}>No USB serial devices detected — plug in the device and refresh.</p>
          )}
          <button className={styles.refreshBtn} onClick={refreshPorts}>↺ Refresh</button>
          <div className={styles.portRow}>
            <input
              type="text"
              className={styles.pathInput}
              value={draftPath}
              onChange={(e) => setDraftPath(e.target.value)}
              placeholder="/dev/tty.usbserial-XXXXX"
              spellCheck={false}
            />
            <button className={styles.savePortBtn} onClick={() => onDevicePathChange(draftPath.trim())}>
              Connect
            </button>
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Companion HTTP Port</h3>
          <div className={styles.portRow}>
            <input
              type="number"
              className={styles.portInput}
              value={draftPort}
              onChange={(e) => setDraftPort(e.target.value)}
            />
            <button className={styles.savePortBtn} onClick={() => onPortChange(Number(draftPort))}>
              Save
            </button>
          </div>
          <p className={styles.portHint}>Restart the app after changing the port.</p>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Scene Endpoints</h3>
          {scenes.length === 0 && <p className={styles.emptyScenes}>No scenes saved yet.</p>}
          {scenes.map((scene) => (
            <div key={scene.id} className={styles.sceneRow}>
              <div>
                <span className={styles.sceneName}>{scene.name}</span>
                <code className={styles.sceneUrl}>POST {base}/scenes/{scene.id}/activate</code>
              </div>
              <button
                className={styles.copyBtn}
                onClick={() => copyToClipboard(`${base}/scenes/${scene.id}/activate`)}
              >
                Copy
              </button>
            </div>
          ))}
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>How to Configure Companion</h3>
          <ol className={styles.steps}>
            <li>In Companion, add a button and choose <strong>Generic HTTP</strong></li>
            <li>Set method to <strong>POST</strong></li>
            <li>Paste the scene URL from above into the URL field</li>
            <li>Save — pressing the button will now fire that scene</li>
          </ol>
        </section>
      </div>
    </div>
  )
}
