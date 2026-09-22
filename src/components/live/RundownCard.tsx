import React from 'react';
import { RundownItem, RundownItemType } from '../../store/features/presentation/types';
import { GripVerticalIcon } from '../common/Icons';

interface RundownCardProps {
  item: RundownItem;
  isSelected: boolean;
  hasLive: boolean;
  isDragging: boolean;
  isOver: boolean;
  dropPosition: 'above' | 'below' | null;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export const RundownCard: React.FC<RundownCardProps> = ({
  item,
  isSelected,
  hasLive,
  isDragging,
  isOver,
  dropPosition,
  onClick,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}) => {
  const getTypeClass = (type: RundownItemType) => {
    switch (type) {
      case 'LOOP':
        return 'type-loop';
      case 'VIDEO':
        return 'type-video';
      case 'SONG':
        return 'type-song';
      case 'SERMON':
        return 'type-sermon';
      case 'PPT':
        return 'type-ppt';
      case 'CANVA':
        return 'type-canva';
      case 'IMAGE':
        return 'type-image';
      default:
        return 'type-song';
    }
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`rundown-item-card ${isSelected ? 'selected' : ''} ${
        hasLive ? 'has-live' : ''
      } ${isDragging ? 'is-dragging' : ''} ${
        isOver && dropPosition ? `drop-target-${dropPosition}` : ''
      }`}
      onClick={onClick}
      title="Click to select • Drag to rearrange order"
    >
      <div className="rundown-accent-bar" />
      <div className="rundown-card-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="card-drag-handle" title="Drag to rearrange order">
            <GripVerticalIcon size={13} />
          </span>
          <span className="rundown-time">{item.time}</span>
        </div>
        <span className={`rundown-type-pill ${getTypeClass(item.type)}`}>
          {item.type}
        </span>
      </div>
      <h4 className="rundown-item-title">{item.title}</h4>
      <p className="rundown-item-subtitle">{item.subtitle}</p>
    </div>
  );
};