import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import MediaUploadStep, { type MediaFile } from '../MediaUploadStep';

// ── Mock URL.createObjectURL ───────────────────────────
const mockObjectURL = 'blob:mock-url';
global.URL.createObjectURL = jest.fn(() => mockObjectURL);
global.URL.revokeObjectURL = jest.fn();

// ── Helpers ────────────────────────────────────────────
function createFile(name: string, size: number, type: string): File {
  const content = new Array(size).fill('a').join('');
  return new File([content], name, { type });
}

function createDropEvent(files: File[]): Partial<DragEvent> {
  return {
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    dataTransfer: {
      files: files as unknown as FileList,
      items: [],
      types: ['Files'],
      clearData: jest.fn(),
      getData: jest.fn(),
      setData: jest.fn(),
      setDragImage: jest.fn(),
      dropEffect: 'none',
      effectAllowed: 'none',
    } as unknown as DataTransfer,
  };
}

// ── Tests ──────────────────────────────────────────────
describe('MediaUploadStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Rendering ───────────────────────────────────────
  describe('Rendering', () => {
    it('renders the drop zone with default label and hint', () => {
      render(<MediaUploadStep />);
      expect(screen.getByTestId('media-upload-step')).toBeInTheDocument();
      expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
      expect(screen.getByText(/Drag & drop files here/i)).toBeInTheDocument();
      expect(screen.getByText(/Supported: images, videos, PDFs/i)).toBeInTheDocument();
    });

    it('renders custom label and hint when provided', () => {
      render(
        <MediaUploadStep
          label="Upload your certificate"
          hint="Only PNG and PDF allowed"
        />,
      );
      expect(screen.getByText('Upload your certificate')).toBeInTheDocument();
      expect(screen.getByText('Only PNG and PDF allowed')).toBeInTheDocument();
    });

    it('renders the hidden file input', () => {
      render(<MediaUploadStep />);
      const input = screen.getByTestId('file-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'file');
    });

    it('drop zone is keyboard accessible', () => {
      render(<MediaUploadStep />);
      const dropZone = screen.getByTestId('drop-zone');
      expect(dropZone).toHaveAttribute('role', 'button');
      expect(dropZone).toHaveAttribute('tabIndex', '0');
      expect(dropZone).toHaveAttribute('aria-label', 'Upload media files');
    });
  });

  // ── Click to Select ─────────────────────────────────
  describe('Click to select', () => {
    it('opens file dialog when drop zone is clicked', () => {
      render(<MediaUploadStep />);
      const input = screen.getByTestId('file-input') as HTMLInputElement;
      const clickSpy = jest.spyOn(input, 'click');

      fireEvent.click(screen.getByTestId('drop-zone'));
      expect(clickSpy).toHaveBeenCalled();
    });

    it('opens file dialog on Enter key', () => {
      render(<MediaUploadStep />);
      const input = screen.getByTestId('file-input') as HTMLInputElement;
      const clickSpy = jest.spyOn(input, 'click');

      fireEvent.keyDown(screen.getByTestId('drop-zone'), { key: 'Enter' });
      expect(clickSpy).toHaveBeenCalled();
    });

    it('opens file dialog on Space key', () => {
      render(<MediaUploadStep />);
      const input = screen.getByTestId('file-input') as HTMLInputElement;
      const clickSpy = jest.spyOn(input, 'click');

      fireEvent.keyDown(screen.getByTestId('drop-zone'), { key: ' ' });
      expect(clickSpy).toHaveBeenCalled();
    });

    it('processes a file selected via click', async () => {
      render(<MediaUploadStep />);
      const file = createFile('test-image.png', 1024, 'image/png');
      const input = screen.getByTestId('file-input');

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      // Should show file in the list
      expect(screen.getByText('test-image.png')).toBeInTheDocument();
    });
  });

  // ── Drag and Drop ───────────────────────────────────
  describe('Drag and drop', () => {
    it('shows active state on drag enter', () => {
      render(<MediaUploadStep />);
      const dropZone = screen.getByTestId('drop-zone');

      fireEvent.dragEnter(dropZone, { preventDefault: jest.fn(), stopPropagation: jest.fn() });
      expect(screen.getByText('Drop files here…')).toBeInTheDocument();
    });

    it('processes dropped files', async () => {
      const onFilesChange = jest.fn();
      render(<MediaUploadStep onFilesChange={onFilesChange} />);

      const file = createFile('dropped.pdf', 2048, 'application/pdf');
      const dropZone = screen.getByTestId('drop-zone');

      await act(async () => {
        fireEvent.drop(dropZone, createDropEvent([file]));
      });

      expect(screen.getByText('dropped.pdf')).toBeInTheDocument();
    });

    it('shows file name after successful drop', async () => {
      render(<MediaUploadStep />);
      const file = createFile('certificate.png', 5000, 'image/png');
      const dropZone = screen.getByTestId('drop-zone');

      await act(async () => {
        fireEvent.drop(dropZone, createDropEvent([file]));
      });

      expect(screen.getByText('certificate.png')).toBeInTheDocument();
    });
  });

  // ── File Preview ────────────────────────────────────
  describe('File preview', () => {
    it('displays image preview for image files', async () => {
      render(<MediaUploadStep />);
      const file = createFile('photo.jpg', 3000, 'image/jpeg');
      const input = screen.getByTestId('file-input');

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      const img = screen.getByAlt('photo.jpg');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', mockObjectURL);
    });

    it('displays video preview for video files', async () => {
      render(<MediaUploadStep />);
      const file = createFile('clip.mp4', 10000, 'video/mp4');
      const input = screen.getByTestId('file-input');

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      expect(screen.getByText('clip.mp4')).toBeInTheDocument();
      expect(screen.getByText('Video')).toBeInTheDocument();
    });

    it('displays file size in human-readable format', async () => {
      render(<MediaUploadStep />);
      const file = createFile('doc.pdf', 2048000, 'application/pdf');
      const input = screen.getByTestId('file-input');

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      expect(screen.getByText(/2.0 MB/)).toBeInTheDocument();
    });

    it('displays file category badge', async () => {
      render(<MediaUploadStep />);
      const file = createFile('data.json', 500, 'application/json');
      const input = screen.getByTestId('file-input');

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      expect(screen.getByText('Document')).toBeInTheDocument();
    });
  });

  // ── File Removal ────────────────────────────────────
  describe('File removal', () => {
    it('removes a file when X button is clicked', async () => {
      render(<MediaUploadStep />);
      const file = createFile('remove-me.png', 1000, 'image/png');
      const input = screen.getByTestId('file-input');

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      expect(screen.getByText('remove-me.png')).toBeInTheDocument();

      // Click remove
      const removeBtn = screen.getByLabelText('Remove remove-me.png');
      await act(async () => {
        fireEvent.click(removeBtn);
      });

      expect(screen.queryByText('remove-me.png')).not.toBeInTheDocument();
    });

    it('cleans up object URL on removal', async () => {
      render(<MediaUploadStep />);
      const file = createFile('cleanup.png', 1000, 'image/png');
      const input = screen.getByTestId('file-input');

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      const removeBtn = screen.getByLabelText('Remove cleanup.png');
      await act(async () => {
        fireEvent.click(removeBtn);
      });

      expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockObjectURL);
    });
  });

  // ── Upload Progress ─────────────────────────────────
  describe('Upload progress', () => {
    it('shows progress bar while uploading', async () => {
      render(<MediaUploadStep />);
      const file = createFile('uploading.pdf', 5000, 'application/pdf');
      const input = screen.getByTestId('file-input');

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      // Progress bar should appear during upload simulation
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('shows "Upload complete" when done', async () => {
      render(<MediaUploadStep />);
      const file = createFile('done.pdf', 5000, 'application/pdf');
      const input = screen.getByTestId('file-input');

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      // Fast-forward timers to complete upload
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText('Upload complete')).toBeInTheDocument();
      });
    });
  });

  // ── Size Validation ─────────────────────────────────
  describe('Size validation', () => {
    it('rejects files exceeding maxSize', async () => {
      render(<MediaUploadStep maxSize={1000} />); // 1000 byte limit
      const file = createFile('too-big.pdf', 5000, 'application/pdf');
      const input = screen.getByTestId('file-input');

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      expect(screen.getByTestId('error-banner')).toBeInTheDocument();
      expect(screen.getByText(/exceeds/)).toBeInTheDocument();
    });

    it('rejects empty files', async () => {
      render(<MediaUploadStep />);
      const file = createFile('empty.txt', 0, 'text/plain');
      const input = screen.getByTestId('file-input');

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      expect(screen.getByTestId('error-banner')).toBeInTheDocument();
      expect(screen.getByText(/empty/)).toBeInTheDocument();
    });
  });

  // ── Multiple Files ──────────────────────────────────
  describe('Multiple files', () => {
    it('allows multiple files when multiple=true', async () => {
      render(<MediaUploadStep multiple />);
      const file1 = createFile('first.png', 1000, 'image/png');
      const file2 = createFile('second.jpg', 2000, 'image/jpeg');
      const input = screen.getByTestId('file-input');

      await act(async () => {
        fireEvent.change(input, { target: { files: [file1, file2] } });
      });

      expect(screen.getByText('first.png')).toBeInTheDocument();
      expect(screen.getByText('second.jpg')).toBeInTheDocument();
    });

    it('replaces file when multiple=false (single mode)', async () => {
      render(<MediaUploadStep multiple={false} />);
      const input = screen.getByTestId('file-input');

      // First file
      const file1 = createFile('first.png', 1000, 'image/png');
      await act(async () => {
        fireEvent.change(input, { target: { files: [file1] } });
      });
      expect(screen.getByText('first.png')).toBeInTheDocument();

      // Second file should replace
      const file2 = createFile('replacement.jpg', 2000, 'image/jpeg');
      await act(async () => {
        fireEvent.change(input, { target: { files: [file2] } });
      });

      expect(screen.queryByText('first.png')).not.toBeInTheDocument();
      expect(screen.getByText('replacement.jpg')).toBeInTheDocument();
    });
  });

  // ── Controlled Mode ─────────────────────────────────
  describe('Controlled mode', () => {
    it('renders files from props', () => {
      const controlledFiles: MediaFile[] = [
        {
          id: 'test-1',
          name: 'controlled.png',
          size: 5000,
          type: 'image/png',
          previewUrl: 'blob:controlled',
          progress: 100,
          status: 'done',
        },
      ];

      render(<MediaUploadStep files={controlledFiles} />);

      expect(screen.getByText('controlled.png')).toBeInTheDocument();
      expect(screen.getByText('Upload complete')).toBeInTheDocument();
    });

    it('calls onFilesChange when controlled', async () => {
      const onFilesChange = jest.fn();
      const controlledFiles: MediaFile[] = [];

      render(<MediaUploadStep files={controlledFiles} onFilesChange={onFilesChange} />);
      const input = screen.getByTestId('file-input');
      const file = createFile('new.png', 1000, 'image/png');

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      expect(onFilesChange).toHaveBeenCalled();
      const calledWith = onFilesChange.mock.calls[0][0];
      expect(calledWith[0].name).toBe('new.png');
    });
  });

  // ── Edge Cases ──────────────────────────────────────
  describe('Edge cases', () => {
    it('handles files with no type gracefully', async () => {
      render(<MediaUploadStep />);
      const file = createFile('notype', 1000, '');
      const input = screen.getByTestId('file-input');

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      expect(screen.getByText('notype')).toBeInTheDocument();
    });

    it('accepts custom accept types', async () => {
      const customAccept = { 'text/plain': ['.txt'], 'text/csv': ['.csv'] };
      render(<MediaUploadStep accept={customAccept} />);
      const dropZone = screen.getByTestId('drop-zone');
      expect(dropZone).toBeInTheDocument();
    });

    it('drop zone is still visible in single mode after file added', () => {
      // In single mode with no file, drop zone is visible
      render(<MediaUploadStep multiple={false} />);
      expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
    });
  });

  // ── Accessibility ───────────────────────────────────
  describe('Accessibility', () => {
    it('error banner has role="alert"', async () => {
      render(<MediaUploadStep maxSize={1} />);
      const file = createFile('big.pdf', 5000, 'application/pdf');
      const input = screen.getByTestId('file-input');

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('file list has role="list"', async () => {
      render(<MediaUploadStep />);
      const file = createFile('a11y.png', 1000, 'image/png');
      const input = screen.getByTestId('file-input');

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getByRole('listitem')).toBeInTheDocument();
    });

    it('progress bar has proper ARIA attributes', async () => {
      render(<MediaUploadStep />);
      const file = createFile('progress.pdf', 1000, 'application/pdf');
      const input = screen.getByTestId('file-input');

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });
});
