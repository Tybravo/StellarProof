import { useWizardStore } from '../store/wizard.store';

describe('useWizardStore - IPFS CIDs & upload state', () => {
  beforeEach(() => {
    useWizardStore.getState().resetWizard();
  });

  it('initializes with default IPFS state values', () => {
    const { formData } = useWizardStore.getState();
    expect(formData.content).toBeUndefined();
  });

  it('updates mediaCid and clears error/uploading flags', () => {
    const store = useWizardStore.getState();

    // Set uploading state first
    store.setIpfsUploadState({ isUploading: true, error: 'Previous error' });
    expect(useWizardStore.getState().formData.content?.isIpfsUploading).toBe(true);
    expect(useWizardStore.getState().formData.content?.ipfsError).toBe('Previous error');

    // Setting mediaCid should clear loading & error
    const testCid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
    store.setMediaCid(testCid);

    const updatedContent = useWizardStore.getState().formData.content;
    expect(updatedContent?.mediaCid).toBe(testCid);
    expect(updatedContent?.isIpfsUploading).toBe(false);
    expect(updatedContent?.ipfsError).toBeNull();
  });

  it('updates manifestCid and clears error/uploading flags', () => {
    const store = useWizardStore.getState();

    store.setIpfsUploadState({ isUploading: true });
    const manifestCid = 'bafybeic73yvspc23b24y24h4l32d7y26nf3efuylqabf3oclgtqy55fbzdi';
    store.setManifestCid(manifestCid);

    const updatedContent = useWizardStore.getState().formData.content;
    expect(updatedContent?.manifestCid).toBe(manifestCid);
    expect(updatedContent?.isIpfsUploading).toBe(false);
    expect(updatedContent?.ipfsError).toBeNull();
  });

  it('handles IPFS loading and error states gracefully', () => {
    const store = useWizardStore.getState();

    store.setIpfsUploadState({ isUploading: true });
    expect(useWizardStore.getState().formData.content?.isIpfsUploading).toBe(true);
    expect(useWizardStore.getState().formData.content?.ipfsError).toBeNull();

    store.setIpfsUploadState({ isUploading: false, error: 'Network error occurred during pin' });
    expect(useWizardStore.getState().formData.content?.isIpfsUploading).toBe(false);
    expect(useWizardStore.getState().formData.content?.ipfsError).toBe('Network error occurred during pin');
  });

  it('clears all IPFS state on resetWizard', () => {
    const store = useWizardStore.getState();

    store.setMediaCid('bafy-media-cid');
    store.setManifestCid('bafy-manifest-cid');
    expect(useWizardStore.getState().formData.content?.mediaCid).toBe('bafy-media-cid');
    expect(useWizardStore.getState().formData.content?.manifestCid).toBe('bafy-manifest-cid');

    store.resetWizard();

    expect(useWizardStore.getState().formData.content).toBeUndefined();
  });
});
