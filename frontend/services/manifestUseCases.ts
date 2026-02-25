export type Category = "All" | "Creative" | "Business" | "Identity" | "Legal" | "Academic";

export interface ManifestTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: Exclude<Category, "All">;
  fields: string[];
}

export interface ManifestUseCase {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: Exclude<Category, "All">;
  template: ManifestTemplate;
}

const MOCK_USE_CASES: ManifestUseCase[] = [
  {
    id: "digital-art",
    title: "Digital Art",
    description:
      "Certify ownership and provenance of digital artwork, illustrations, and generative creations on the Stellar blockchain.",
    icon: "Palette",
    category: "Creative",
    template: {
      id: "digital-art-template",
      title: "Digital Art Manifest",
      description: "Template for digital art provenance",
      icon: "Palette",
      category: "Creative",
      fields: ["title", "creator", "creationDate", "medium", "dimensions", "fileHash", "edition"],
    },
  },
  {
    id: "music",
    title: "Music & Audio",
    description:
      "Protect your original compositions, recordings, and audio productions with immutable on-chain proof of authorship.",
    icon: "Music",
    category: "Creative",
    template: {
      id: "music-template",
      title: "Music & Audio Manifest",
      description: "Template for music and audio works",
      icon: "Music",
      category: "Creative",
      fields: ["title", "artist", "album", "releaseDate", "genre", "duration", "isrc", "fileHash"],
    },
  },
  {
    id: "photography",
    title: "Photography",
    description:
      "Register your photographs with verifiable metadata including location, camera settings, and licensing terms.",
    icon: "Camera",
    category: "Creative",
    template: {
      id: "photography-template",
      title: "Photography Manifest",
      description: "Template for photography works",
      icon: "Camera",
      category: "Creative",
      fields: ["title", "photographer", "captureDate", "location", "camera", "license", "fileHash"],
    },
  },
  {
    id: "video-media",
    title: "Video & Media",
    description:
      "Anchor your video content, films, and broadcasts to the blockchain to ensure authenticity and chain of custody.",
    icon: "Video",
    category: "Creative",
    template: {
      id: "video-media-template",
      title: "Video & Media Manifest",
      description: "Template for video and media works",
      icon: "Video",
      category: "Creative",
      fields: ["title", "director", "productionDate", "duration", "resolution", "format", "fileHash"],
    },
  },
  {
    id: "supply-chain",
    title: "Supply Chain",
    description:
      "Track goods from origin to destination with tamper-proof records that verify authenticity at every stage.",
    icon: "Package",
    category: "Business",
    template: {
      id: "supply-chain-template",
      title: "Supply Chain Manifest",
      description: "Template for supply chain records",
      icon: "Package",
      category: "Business",
      fields: ["productName", "manufacturer", "batchId", "origin", "certifications", "timestamp", "checkpoints"],
    },
  },
  {
    id: "contract",
    title: "Business Contract",
    description:
      "Record the existence and hash of business agreements, NDAs, and service contracts without exposing sensitive content.",
    icon: "Briefcase",
    category: "Business",
    template: {
      id: "contract-template",
      title: "Business Contract Manifest",
      description: "Template for business contracts",
      icon: "Briefcase",
      category: "Business",
      fields: ["contractTitle", "parties", "effectiveDate", "expiryDate", "jurisdiction", "documentHash"],
    },
  },
  {
    id: "identity",
    title: "Digital Identity",
    description:
      "Anchor verifiable claims and credentials to a decentralised identity, enabling self-sovereign authentication.",
    icon: "User",
    category: "Identity",
    template: {
      id: "identity-template",
      title: "Digital Identity Manifest",
      description: "Template for digital identity claims",
      icon: "User",
      category: "Identity",
      fields: ["did", "displayName", "claimType", "issuedAt", "expiresAt", "attestations"],
    },
  },
  {
    id: "credentials",
    title: "Professional Credentials",
    description:
      "Issue and verify professional licences, certificates, and qualifications that are instantly verifiable worldwide.",
    icon: "Award",
    category: "Identity",
    template: {
      id: "credentials-template",
      title: "Professional Credentials Manifest",
      description: "Template for professional credentials",
      icon: "Award",
      category: "Identity",
      fields: ["holderName", "credentialType", "issuingBody", "issueDate", "expiryDate", "credentialHash"],
    },
  },
  {
    id: "legal-document",
    title: "Legal Document",
    description:
      "Notarise legal documents, affidavits, and court filings on-chain to establish an undeniable timestamp of existence.",
    icon: "Scale",
    category: "Legal",
    template: {
      id: "legal-document-template",
      title: "Legal Document Manifest",
      description: "Template for legal documents",
      icon: "Scale",
      category: "Legal",
      fields: ["documentTitle", "parties", "jurisdiction", "filingDate", "caseNumber", "documentHash"],
    },
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    description:
      "Create verifiable prior art records and protect patents, trademarks, and trade secrets with on-chain evidence.",
    icon: "Lightbulb",
    category: "Legal",
    template: {
      id: "intellectual-property-template",
      title: "Intellectual Property Manifest",
      description: "Template for intellectual property",
      icon: "Lightbulb",
      category: "Legal",
      fields: ["ipTitle", "inventor", "filingDate", "ipType", "jurisdiction", "claimsHash", "documentHash"],
    },
  },
  {
    id: "research-paper",
    title: "Research Paper",
    description:
      "Establish priority for academic discoveries and preprints with an immutable proof of existence before peer review.",
    icon: "BookOpen",
    category: "Academic",
    template: {
      id: "research-paper-template",
      title: "Research Paper Manifest",
      description: "Template for research papers",
      icon: "BookOpen",
      category: "Academic",
      fields: ["title", "authors", "institution", "submissionDate", "doi", "abstract", "documentHash"],
    },
  },
  {
    id: "academic-certificate",
    title: "Academic Certificate",
    description:
      "Issue tamper-proof diplomas, degrees, and academic transcripts that students can share and employers can verify instantly.",
    icon: "GraduationCap",
    category: "Academic",
    template: {
      id: "academic-certificate-template",
      title: "Academic Certificate Manifest",
      description: "Template for academic certificates",
      icon: "GraduationCap",
      category: "Academic",
      fields: ["studentName", "institution", "degree", "major", "graduationDate", "gpa", "certificateHash"],
    },
  },
];

export const CATEGORIES: Category[] = ["All", "Creative", "Business", "Identity", "Legal", "Academic"];

export interface ManifestUseCaseService {
  getAll(): Promise<ManifestUseCase[]>;
  getById(id: string): Promise<ManifestUseCase | undefined>;
  getByCategory(category: Category): Promise<ManifestUseCase[]>;
  search(query: string): Promise<ManifestUseCase[]>;
}

function createManifestUseCaseService(): ManifestUseCaseService {
  return {
    async getAll() {
      return MOCK_USE_CASES;
    },
    async getById(id) {
      return MOCK_USE_CASES.find((uc) => uc.id === id);
    },
    async getByCategory(category) {
      if (category === "All") return MOCK_USE_CASES;
      return MOCK_USE_CASES.filter((uc) => uc.category === category);
    },
    async search(query) {
      const q = query.toLowerCase().trim();
      if (!q) return MOCK_USE_CASES;
      return MOCK_USE_CASES.filter(
        (uc) =>
          uc.title.toLowerCase().includes(q) ||
          uc.description.toLowerCase().includes(q) ||
          uc.category.toLowerCase().includes(q)
      );
    },
  };
}

export const manifestUseCaseService = createManifestUseCaseService();
