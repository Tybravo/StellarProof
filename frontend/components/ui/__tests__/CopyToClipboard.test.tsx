import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CopyToClipboard, { copyTextToClipboard } from '../CopyToClipboard';

const HASH = '0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';

describe('CopyToClipboard', () => {
  const originalClipboard = navigator.clipboard;

  afterEach(() => {
    Object.assign(navigator, { clipboard: originalClipboard });
    jest.useRealTimers();
  });

  function mockClipboard(writeText: jest.Mock) {
    Object.assign(navigator, { clipboard: { writeText } });
  }

  it('copies the exact string and shows confirmation', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);

    render(<CopyToClipboard value={HASH} label="content hash" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy content hash' }));
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(HASH);
    expect(screen.getByRole('status')).toHaveTextContent('Copied content hash');
  });

  it('clears the confirmation after the feedback duration', async () => {
    jest.useFakeTimers();
    mockClipboard(jest.fn().mockResolvedValue(undefined));

    render(<CopyToClipboard value={HASH} feedbackDurationMs={1000} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy value' }));
    });
    expect(screen.getByRole('status')).toHaveTextContent('Copied value');

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('reports failure when neither clipboard path works', async () => {
    mockClipboard(jest.fn().mockRejectedValue(new Error('denied')));
    document.execCommand = jest.fn().mockReturnValue(false);

    render(<CopyToClipboard value={HASH} label="CID" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy CID' }));
    });

    expect(screen.getByRole('status')).toHaveTextContent('Could not copy CID');
  });

  it('falls back to execCommand when the Clipboard API is unavailable', async () => {
    Object.assign(navigator, { clipboard: undefined });
    document.execCommand = jest.fn().mockReturnValue(true);

    await expect(copyTextToClipboard(HASH)).resolves.toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('is disabled when there is nothing to copy', () => {
    render(<CopyToClipboard value="" label="signature" />);
    expect(screen.getByRole('button', { name: 'Copy signature' })).toBeDisabled();
  });
});
