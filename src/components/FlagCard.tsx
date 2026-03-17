import { useEffect, useState } from 'react';
import type { FlagItem } from '../data/flags';
import { resolveAssetPath } from '../utils/assetPath';

type FlagCardProps = {
  flag: FlagItem;
  displayName: string;
  isFocused: boolean;
  isLocked: boolean;
  isCorrectChoice: boolean;
  isWrongChoice: boolean;
  isDimmed: boolean;
  badgeLabel?: string;
  onSelect: () => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
};

export function FlagCard({
  flag,
  displayName,
  isFocused,
  isLocked,
  isCorrectChoice,
  isWrongChoice,
  isDimmed,
  badgeLabel,
  onSelect,
  buttonRef
}: FlagCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [flag.imagePath]);

  return (
    <button
      ref={buttonRef}
      type="button"
      className={[
        'flag-card',
        isFocused ? 'is-focused' : '',
        isCorrectChoice ? 'is-correct' : '',
        isWrongChoice ? 'is-wrong' : '',
        isDimmed ? 'is-dimmed' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onSelect}
      disabled={isLocked}
      aria-label={displayName}
      aria-pressed={isFocused}
      tabIndex={isFocused ? 0 : -1}
    >
      {badgeLabel && <span className="flag-badge">{badgeLabel}</span>}
      <div className="flag-frame" aria-hidden="true">
        {imageFailed ? (
          <div className="flag-fallback">
            <span>{flag.id.toUpperCase()}</span>
          </div>
        ) : (
          <img
            className="flag-image"
            src={resolveAssetPath(flag.imagePath)}
            alt=""
            draggable={false}
            onError={() => setImageFailed(true)}
          />
        )}
      </div>
    </button>
  );
}
