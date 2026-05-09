import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchOracleStatus, VerificationStatus } from '../services/oracleService';
import toast from 'react-hot-toast'; 

interface UseVerificationStatusOptions {
  requestId: string;
  intervalMs?: number;
}

// Fixed: Moved outside the hook to resolve the dependency warning
const TEN_MINUTES_MS = 10 * 60 * 1000;

export const useVerificationStatus = ({ 
  requestId, 
  intervalMs = 5000 
}: UseVerificationStatusOptions) => {
  
  // Fixed: Initialize with 0 to keep the render strictly pure
  const startTimeRef = useRef<number>(0);
  const previousStatusRef = useRef<VerificationStatus | null>(null);
  
  const [hasTimedOut, setHasTimedOut] = useState(false);

  // Fixed: Safely set the start time ONLY after the component has mounted
  useEffect(() => {
    if (startTimeRef.current === 0) {
      startTimeRef.current = Date.now();
    }
  }, []);

  const query = useQuery({
    queryKey: ['verificationStatus', requestId],
    queryFn: () => fetchOracleStatus(requestId),
    retry: 3, 
    refetchInterval: (query) => {
      if (hasTimedOut) return false;
      
      const status = query.state?.data;
      if (status === 'Verified' || status === 'Rejected') {
        return false;
      }
      return intervalMs;
    },
  });

  const currentStatus = query.data;

  // 1. Handle Toast Notifications
  useEffect(() => {
    if (currentStatus && previousStatusRef.current !== currentStatus) {
      if (previousStatusRef.current !== null) {
        toast.success(`Status updated to: ${currentStatus}`);
      }
      previousStatusRef.current = currentStatus;
    }
  }, [currentStatus]);

  // 2. Handle 10-Minute Timeout
  useEffect(() => {
    if (hasTimedOut || currentStatus === 'Verified' || currentStatus === 'Rejected') {
      return;
    }

    const timeoutInterval = setInterval(() => {
      // Safety check to ensure useEffect has set the start time
      if (startTimeRef.current === 0) return;

      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed >= TEN_MINUTES_MS) {
        setHasTimedOut(true);
        toast.error('Verification timed out after 10 minutes.');
      }
    }, 1000); 
    
    return () => clearInterval(timeoutInterval);
  }, [hasTimedOut, currentStatus]);

  return {
    status: hasTimedOut ? 'Timeout' : (currentStatus || 'Pending'),
    isLoading: query.isLoading,
    error: query.error,
    lastChecked: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
  };
};