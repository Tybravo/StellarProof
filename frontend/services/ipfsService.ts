// frontend/services/ipfsService.ts

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || '';

export interface IpfsUploadResponse {
  success: boolean;
  cid?: string;
  error?: string;
}

/**
 * Uploads a media file to IPFS via Pinata.
 * 
 * @param file - The File object to upload.
 * @returns A promise that resolves to the upload response containing the CID.
 */
export const uploadFileToIPFS = async (file: File): Promise<IpfsUploadResponse> => {
  if (!PINATA_JWT) {
    console.error('IPFS upload failed: Pinata JWT is missing from environment variables.');
    return { success: false, error: 'Storage configuration error.' };
  }

  try {
    const formData = new FormData();
    formData.append('file', file);

    const metadata = JSON.stringify({ name: file.name });
    formData.append('pinataMetadata', metadata);

    const options = JSON.stringify({ cidVersion: 1 });
    formData.append('pinataOptions', options);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.details || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      cid: data.IpfsHash,
    };
  } catch (error) {
    console.error('Error uploading media to IPFS:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred during IPFS upload';

    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Uploads a Manifest JSON object to IPFS via Pinata.
 * 
 * @param manifest - The generated manifest object.
 * @param filename - Optional filename for the Pinata dashboard.
 * @returns A promise that resolves to the upload response containing the CID.
 */
export const uploadManifestToIPFS = async (
  manifest: Record<string, unknown>,
  filename: string = 'manifest.json'
): Promise<IpfsUploadResponse> => {
  if (!PINATA_JWT) {
    console.error('IPFS upload failed: Pinata JWT is missing from environment variables.');
    return { success: false, error: 'Storage configuration error.' };
  }

  try {
    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: 'application/json',
    });

    const formData = new FormData();
    formData.append('file', blob, filename);

    const metadata = JSON.stringify({ name: filename });
    formData.append('pinataMetadata', metadata);

    const options = JSON.stringify({ cidVersion: 1 });
    formData.append('pinataOptions', options);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.details || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      cid: data.IpfsHash,
    };
  } catch (error) {
    console.error('Error uploading manifest to IPFS:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred during IPFS upload';

    return {
      success: false,
      error: errorMessage,
    };
  }
};

export { uploadMediaWithFallback, uploadToCloudinary } from './cloudinaryFallback';
