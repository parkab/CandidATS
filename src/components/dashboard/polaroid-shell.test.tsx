import { render, screen } from '@testing-library/react';
import PolaroidShell from '@/components/dashboard/polaroid-shell';

describe('PolaroidShell', () => {
  it('applies tilt style and default tilt classes when useTilt is enabled', () => {
    render(
      <PolaroidShell angle={5}>
        <p>Card content</p>
      </PolaroidShell>,
    );

    const content = screen.getByText('Card content');
    const shell = content.closest('article');

    expect(shell).not.toBeNull();
    expect(shell?.getAttribute('style')).toContain('--tilt: 5deg;');
    expect(shell?.className).toContain('transform-[rotate(var(--tilt))]');
    expect(shell?.className).toContain(
      'hover:transform-[translateY(-0.25rem)_rotate(var(--tilt))]',
    );
  });

  it('does not apply tilt style/class and uses non-tilt hover class when useTilt is false', () => {
    render(
      <PolaroidShell angle={5} useTilt={false}>
        <p>Flat card</p>
      </PolaroidShell>,
    );

    const content = screen.getByText('Flat card');
    const shell = content.closest('article');

    expect(shell).not.toBeNull();
    expect(shell?.getAttribute('style')).toBeNull();
    expect(shell?.className).not.toContain('transform-[rotate(var(--tilt))]');
    expect(shell?.className).toContain('hover:-translate-y-1');
  });

  it('uses hoverClassName when provided instead of default hover class', () => {
    render(
      <PolaroidShell angle={5} hoverClassName="hover:scale-105">
        <p>Override hover</p>
      </PolaroidShell>,
    );

    const content = screen.getByText('Override hover');
    const shell = content.closest('article');

    expect(shell).not.toBeNull();
    expect(shell?.className).toContain('hover:scale-105');
    expect(shell?.className).not.toContain(
      'hover:transform-[translateY(-0.25rem)_rotate(var(--tilt))]',
    );
  });
});
