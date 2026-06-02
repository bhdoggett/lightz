import { useState } from 'react'
import type { Scene } from '../../shared/types'

interface SaveDialogProps {
  onConfirm: (name: string, fadeDuration: number) => void
  onCancel: () => void
}

function SaveDialog({ onConfirm, onCancel }: SaveDialogProps) {
  const [name, setName] = useState('')
  const [fade, setFade] = useState(0)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#2a2a3e', borderRadius: 8 }}>
      <input
        placeholder="Scene name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #444', background: '#1e1e2e', color: '#fff' }}
      />
      <label style={{ color: '#aaa', fontSize: 12 }}>
        Fade (ms):
        <input
          type="number"
          value={fade}
          min={0}
          step={500}
          onChange={(e) => setFade(Number(e.target.value))}
          style={{ width: 70, marginLeft: 4, padding: '4px 6px', borderRadius: 4, border: '1px solid #444', background: '#1e1e2e', color: '#fff' }}
        />
      </label>
      <button onClick={() => name.trim() && onConfirm(name.trim(), fade)} style={btnStyle('#6366f1')}>Save</button>
      <button onClick={onCancel} style={btnStyle('#444')}>Cancel</button>
    </div>
  )
}

const btnStyle = (bg: string): React.CSSProperties => ({
  padding: '4px 12px', borderRadius: 6, border: 'none', background: bg,
  color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13,
})

interface Props {
  scenes: Scene[]
  activeSceneId: string | null
  onActivate: (id: string) => void
  onSave: (name: string, fadeDuration: number) => void
}

export function ScenesStrip({ scenes, activeSceneId, onActivate, onSave }: Props) {
  const [saving, setSaving] = useState(false)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 16px', background: '#13131f', borderBottom: '1px solid #2a2a3e' }}>
      {scenes.map((scene) => (
        <button
          key={scene.id}
          onClick={() => onActivate(scene.id)}
          style={{
            ...btnStyle(scene.id === activeSceneId ? '#6366f1' : '#2a2a3e'),
            fontWeight: scene.id === activeSceneId ? '700' : '400',
          }}
        >
          {scene.name}
        </button>
      ))}
      {saving ? (
        <SaveDialog
          onConfirm={(name, fade) => { onSave(name, fade); setSaving(false) }}
          onCancel={() => setSaving(false)}
        />
      ) : (
        <button onClick={() => setSaving(true)} style={btnStyle('#374151')}>+ Save Scene</button>
      )}
    </div>
  )
}
