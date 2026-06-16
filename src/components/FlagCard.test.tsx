import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FlagCard } from './FlagCard';
import type { FlagItem } from '../data/flags';

const TEST_FLAG: FlagItem = {
  id: 'cz',
  czechName: 'Cesko',
  englishName: 'Czechia',
  imagePath: '/flags/cz.png',
  audioPath: '/audio/names/cz.mp3',
  audioPathEn: '/audio/names-en/cz.mp3'
};

describe('FlagCard', () => {
  it('renders the provided badge and calls onSelect when enabled', () => {
    const onSelect = vi.fn();

    render(
      <FlagCard
        flag={TEST_FLAG}
        displayName="Flag: Czechia"
        isFocused
        isLocked={false}
        isCorrectChoice={false}
        isWrongChoice={false}
        isDimmed={false}
        badgeLabel="Correct"
        onSelect={onSelect}
        buttonRef={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Flag: Czechia' }));

    expect(screen.getByText('Correct')).toBeInTheDocument();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('shows a text fallback when the image fails to load', () => {
    const { container } = render(
      <FlagCard
        flag={TEST_FLAG}
        displayName="Flag: Czechia"
        isFocused={false}
        isLocked={false}
        isCorrectChoice={false}
        isWrongChoice={false}
        isDimmed={false}
        onSelect={() => undefined}
        buttonRef={() => undefined}
      />
    );

    const image = container.querySelector('img');
    expect(image).not.toBeNull();

    fireEvent.error(image as HTMLImageElement);

    expect(screen.getByText('CZ')).toBeInTheDocument();
  });

  it('stays disabled and does not trigger selection when locked', () => {
    const onSelect = vi.fn();

    render(
      <FlagCard
        flag={TEST_FLAG}
        displayName="Flag: Czechia"
        isFocused={false}
        isLocked
        isCorrectChoice={false}
        isWrongChoice={false}
        isDimmed={false}
        onSelect={onSelect}
        buttonRef={() => undefined}
      />
    );

    const button = screen.getByRole('button', { name: 'Flag: Czechia' });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
