import { useState, useEffect, useCallback } from 'react'
import type { Scene } from '../../shared/types'
import { Modal } from './Modal'
import { useApi } from '../api/context'
import styles from './CompanionModal.module.css'

interface Props {
  scenes: Scene[]
  port: number
  devicePath: string
  ports: string[]
  dmxOutputPort: 0 | 1 | 2
  onPortChange: (port: number) => void
  onDevicePathChange: (path: string) => void
  onDmxOutputPortChange: (port: 0 | 1 | 2) => void
  onClose: () => void
}

export function CompanionModal({ scenes, port, devicePath, ports, dmxOutputPort, onPortChange, onDevicePathChange, onDmxOutputPortChange, onClose }: Props) {
  const api = useApi()
  const [draftPort, setDraftPort] = useState(String(port))
  const [draftPath, setDraftPath] = useState(devicePath)
  const [detectedPorts, setDetectedPorts] = useState<string[]>(ports)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const base = `http://localhost:${port}`

  const copyToClipboard = (text: string) => navigator.clipboard?.writeText(text)

  const refreshPorts = useCallback(async () => {
    setRefreshError(null)
    try {
      const found = await api.listPorts()
      const enttec = found.find((p) => /cu\.usbserial-EN/.test(p))
      const sorted = enttec ? [enttec, ...found.filter((p) => p !== enttec)] : found
      setDetectedPorts(sorted)
      if (enttec) setDraftPath(enttec)
      if (found.length === 0) setRefreshError('No USB serial devices found in /dev')
    } catch (e) {
      setRefreshError(String(e))
    }
  }, [])

  useEffect(() => {
    refreshPorts()
  }, [refreshPorts])

  return (
    <Modal title="Settings" onClose={onClose} minWidth="520px" maxWidth="640px">
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>DMX Device</h3>
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
            <p className={styles.noPorts}>
              {refreshError ?? 'No USB serial devices detected — plug in the device and refresh.'}
            </p>
          )}
          <button className={styles.refreshBtn} onClick={refreshPorts}>↺ Refresh</button>
          <div className={styles.portRow}>
            <input
              type="text"
              className={styles.pathInput}
              value={draftPath}
              onChange={(e) => setDraftPath(e.target.value)}
              placeholder="/dev/cu.usbserial-XXXXX"
              spellCheck={false}
            />
            <button className={styles.savePortBtn} onClick={() => onDevicePathChange(draftPath.trim())}>
              Connect
            </button>
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Output Port</h3>
          <select
            className={styles.routingSelect}
            value={dmxOutputPort}
            onChange={(e) => onDmxOutputPortChange(Number(e.target.value) as 0 | 1 | 2)}
          >
            <option value={0}>Output 1</option>
            <option value={1}>Output 2</option>
            <option value={2}>Output 3</option>
          </select>
          <p className={styles.portHint}>Match this to the output selected in QLC+.</p>
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
    </Modal>
  )
}
