type ScoreBoardProps = {
  score: number;
  roundNumber: number;
  scoreLabel: string;
  roundLabel: string;
};

export function ScoreBoard({ score, roundNumber, scoreLabel, roundLabel }: ScoreBoardProps) {
  return (
    <div className="score-board" aria-live="polite">
      <div className="score-item">
        {roundLabel}: {roundNumber}
      </div>
      <div className="score-item">
        {scoreLabel}: {score}
      </div>
    </div>
  );
}
