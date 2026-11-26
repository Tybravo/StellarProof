import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MediaUploadStep from '../MediaUploadStep';
import { hashFile } from '@/utils/hashing';

jest.mock('@/utils/hashing', () => ({
  hashFile: jest.fn(),
}));

global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

const mockedHashFile = jest.mocked(hashFile);
const HASH = 'deadbeef'.repeat(8);

function createPdf(name = 'note.pdf'): File {
  return new File(['hello world'], name, { type: 'application/pdf' });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function selectFile(file: File) {
  const input = screen.getByTestId('file-input');
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
}

describe('MediaUploadStep - SHA-256 hash preview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedHashFile.mockReset();
  });

  it('shows a calculating state and holds the upload until hashing finishes', async () => {
    const pending = deferred<string>();
    mockedHashFile.mockReturnValue(pending.promise);

    render(<MediaUploadStep />);
    await selectFile(createPdf());

    expect(screen.getByText(/Calculating SHA-256/)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/Uploading/)).not.toBeInTheDocument();

    await act(async () => {
      pending.resolve(HASH);
    });

    expect(await screen.findByText(HASH)).toBeInTheDocument();
    expect(screen.queryByText(/Calculating SHA-256/)).not.toBeInTheDocument();
  });

  it('displays the locally computed hash for the selected file', async () => {
    mockedHashFile.mockResolvedValue(HASH);
    const file = createPdf();

    render(<MediaUploadStep />);
    await selectFile(file);

    expect(await screen.findByText(HASH)).toBeInTheDocument();
    expect(screen.getByText('SHA-256')).toBeInTheDocument();
    expect(mockedHashFile).toHaveBeenCalledTimes(1);
    expect(mockedHashFile).toHaveBeenCalledWith(file, expect.any(Function));
  });

  it('reports hashing progress while the digest is being calculated', async () => {
    const pending = deferred<string>();
    mockedHashFile.mockImplementation((_file, onProgress) => {
      onProgress?.(40);
      return pending.promise;
    });

    render(<MediaUploadStep />);
    await selectFile(createPdf());

    expect(screen.getByText(/Calculating SHA-256… 40%/)).toBeInTheDocument();
  });

  it('shows a non-blocking error when hashing fails and still lets the upload run', async () => {
    mockedHashFile.mockRejectedValue(new Error('boom'));

    render(<MediaUploadStep />);
    await selectFile(createPdf());

    expect(await screen.findByText(/Could not calculate the SHA-256 hash/)).toBeInTheDocument();
    expect(screen.getByText('note.pdf')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(await screen.findByText(/Uploading/)).toBeInTheDocument();
  });

  it('copies the hash to the clipboard', async () => {
    mockedHashFile.mockResolvedValue(HASH);
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<MediaUploadStep />);
    await selectFile(createPdf());
    await screen.findByText(HASH);

    const copyButton = screen.getByRole('button', { name: 'Copy SHA-256 hash for note.pdf' });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(writeText).toHaveBeenCalledWith(HASH);
  });
});
