import { useState } from 'react'
import type { Scene } from '../../shared/types'
import styles from './CompanionModal.module.css'

interface Props {
  scenes: Scene[]
  port: number
  onPortChange: (port: number) => void
  onClose: () => void
}

export function CompanionModal({ scenes, port, onPortChange, onClose }: Props) {
  const [draftPort, setDraftPort] = useState(String(port))
  const base = `http://localhost:${port}`

  const copyToClipboard = (text: string) => navigator.clipboard?.writeText(text)

  return (
    <div className={styles.backdrop}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>Bitfocus Companion Setup</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>HTTP Port</h3>
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
