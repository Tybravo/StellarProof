export interface ContactFormData {
  fullName: string;
  email: string;
  subject: string;
  message: string;
  attachment?: File | null;
}

export interface ContactSubmissionResult {
  success: boolean;
  message: string;
}

export interface ContactService {
  submitInquiry(data: ContactFormData): Promise<ContactSubmissionResult>;
}

async function submitInquiry(
  data: ContactFormData
): Promise<ContactSubmissionResult> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Mock validation: reject if message contains "error" for testing
  if (data.message.toLowerCase().includes("simulate-error")) {
    return {
      success: false,
      message:
        "We were unable to submit your enquiry. Please try again later.",
    };
  }

  return {
    success: true,
    message:
      "Your enquiry has been submitted successfully. We will get back to you within 24-48 hours.",
  };
}

export const contactService: ContactService = {
  submitInquiry,
};
