type ReplayButtonProps = {
  label: string;
  onReplay: () => void;
};

export function ReplayButton({ label, onReplay }: ReplayButtonProps) {
  return (
    <button type="button" className="replay-button" onClick={onReplay}>
      {label}
    </button>
  );
}
