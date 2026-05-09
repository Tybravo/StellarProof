import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useVerificationStatus } from './useVerificationStatus';
import { fetchOracleStatus } from '../services/oracleService';
import toast from 'react-hot-toast';

// Mock the external dependencies
jest.mock('../services/oracleService');
jest.mock('react-hot-toast');

const mockedFetchOracleStatus = fetchOracleStatus as jest.Mock;
const mockedToastSuccess = toast.success as jest.Mock;
const mockedToastError = toast.error as jest.Mock;

describe('useVerificationStatus Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Reset mocks and timers before each test
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Create a fresh QueryClient for each test to avoid cache pollution
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable retries for cleaner testing
        },
      },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should initialize with a Pending status', async () => {
    mockedFetchOracleStatus.mockResolvedValue('Pending');

    const { result } = renderHook(() => useVerificationStatus({ requestId: 'req-123' }), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    expect(result.current.status).toBe('Pending');
    expect(mockedToastSuccess).not.toHaveBeenCalled(); // No toast on initial load
  });

  it('should trigger a success toast when status changes to Verified', async () => {
    // First call returns Pending, second call returns Verified
    mockedFetchOracleStatus
      .mockResolvedValueOnce('Pending')
      .mockResolvedValueOnce('Verified');

    const { result } = renderHook(() => useVerificationStatus({ requestId: 'req-123', intervalMs: 5000 }), { wrapper });

    // Wait for the initial 'Pending' state
    await waitFor(() => expect(result.current.status).toBe('Pending'));

    // Fast-forward time by 5 seconds to trigger the next polling interval
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Wait for the status to update to 'Verified'
    await waitFor(() => expect(result.current.status).toBe('Verified'));

    expect(mockedToastSuccess).toHaveBeenCalledWith('Status updated to: Verified');
  });

  it('should timeout after 10 minutes and stop polling', async () => {
    mockedFetchOracleStatus.mockResolvedValue('Pending');

    const { result } = renderHook(() => useVerificationStatus({ requestId: 'req-123' }), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('Pending'));

    // Fast-forward exactly 10 minutes (600,000 ms)
    act(() => {
      jest.advanceTimersByTime(10 * 60 * 1000);
    });

    await waitFor(() => expect(result.current.status).toBe('Timeout'));
    expect(mockedToastError).toHaveBeenCalledWith('Verification timed out after 10 minutes.');
  });
});