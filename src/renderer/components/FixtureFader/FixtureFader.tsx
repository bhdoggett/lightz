import { RawFader } from '../RawFader'
import { FaderFooter } from '../FaderFooter'
import type { DragHandleProps } from '../../hooks/useDragReorder'
import styles from './FixtureFader.module.css'

interface Props {
  channel: number
  universe?: 0 | 1
  name: string
  value: number
  onChange: (value: number) => void
  onRename?: (name: string) => void
  groupColor?: string
  groupMultiplier?: number
  isEditing?: boolean
  selected?: boolean
  onSelect?: (e: React.MouseEvent) => void
  dragHandleProps?: DragHandleProps
}

export function FixtureFader({
  channel, universe, name, value, onChange, onRename, groupColor, groupMultiplier,
  isEditing, selected, onSelect, dragHandleProps,
}: Props) {
  return (
    <div className={styles.wrapper}>
      <RawFader
        channel={channel}
        universe={universe}
        value={value}
        label={name}
        onChange={onChange}
        onRename={onRename}
        fillColor={groupColor}
        groupMultiplier={groupMultiplier}
        isEditing={isEditing}
        selected={selected}
        onSelect={onSelect}
        dragHandleProps={dragHandleProps}
      />
      <FaderFooter variant="filler" />
    </div>
  )
}
