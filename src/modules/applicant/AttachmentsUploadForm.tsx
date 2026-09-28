import React, { useRef, useState } from 'react';
import { CircleCheck, FileText, FolderUp, IdCard, Paperclip, Trash2 } from 'lucide-react';
import type { UploadedFile, ApplicantFormData, ValidationErrors } from '../../types/applicant.types';
import { FormSection } from './flow/FlowUi';

interface AttachmentsUploadFormProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  error?: string;
  /** The position's Plantilla Item No., when applying through a job post. */
  plantillaItemNo?: string;
  applicationType?: 'job' | 'promotion';
  formData?: ApplicantFormData;
  onChange?: (field: keyof ApplicantFormData, value: string | boolean) => void;
  errors?: ValidationErrors;
  /**
   * Which card to render. The wizard places the short Government ID card
   * beside Educational background and the wide Documents card last, so it
   * renders this component twice with different parts.
   */
  part?: 'all' | 'govId' | 'documents';
  /** Makes element ids unique per plantilla form (one form per tab). */
  idPrefix?: string;
}

/** IDs that carry an expiration date. */
const EXPIRING_IDS = ['Passport', "Driver's License", 'PRC ID', 'Postal ID'];

export type DocumentType =
  | 'application_letter'
  | 'pds_with_photo'
  | 'curriculum_vitae'
  | 'eligibility_proof'
  | 'training_certificate'
  | 'transcript_of_records'
  | 'previous_employer_certificate'
  | 'drug_test'
  | 'government_id'
  | 'other';

interface CategorizedFile extends UploadedFile {
  documentType: DocumentType;
}

export const REQUIRED_DOCUMENTS = [
  {
    type: 'application_letter' as DocumentType,
    label: 'Application Letter',
    description: 'Indicating the position applied for, item number and name of office',
    required: true,
  },
  {
    type: 'pds_with_photo' as DocumentType,
    label: 'Personal Data Sheet (PDS)',
    description: 'CS Form No. 212, Revised 2023 with Work Experience Sheet and recent passport-sized photo; digitally signed',
    required: true,
  },
  {
    type: 'curriculum_vitae' as DocumentType,
    label: 'Curriculum Vitae',
    description: 'Updated CV summarizing your educational background, work experience, and relevant achievements',
    required: true,
  },
  {
    type: 'eligibility_proof' as DocumentType,
    label: 'Proof of Eligibility Rating/License',
    description: 'Hard copy or electronic copy',
    required: true,
  },
  {
    type: 'training_certificate' as DocumentType,
    label: 'Certificate of Relevant Training/Seminars',
    description: 'Hard copy or electronic copy',
    required: true,
  },
  {
    type: 'transcript_of_records' as DocumentType,
    label: 'Transcript of Records',
    description: 'Hard copy or electronic copy',
    required: true,
  },
  {
    type: 'government_id' as DocumentType,
    label: 'Government-Issued ID',
    description: 'Passport, Driver\'s License, National ID, UMID, PhilHealth ID, PRC ID, Postal ID',
    required: true,
  },
  {
    type: 'previous_employer_certificate' as DocumentType,
    label: 'Certificate from Previous Employer',
    description: 'Indicating that the applicant\'s previous work is relevant to the position',
    required: false,
  },
  {
    type: 'drug_test' as DocumentType,
    label: 'Drug Test Result',
    description: 'Conducted by a government or DOH-accredited drug testing laboratory',
    required: true,
  },
  {
    type: 'other' as DocumentType,
    label: 'Other Supporting Documents',
    description: 'Any additional documents you wish to submit',
    required: false,
  },
];

const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/jpg'
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const AttachmentsUploadForm: React.FC<AttachmentsUploadFormProps> = ({
  files,
  onFilesChange,
  error,
  plantillaItemNo,
  applicationType = 'job',
  formData,
  onChange,
  errors = {},
  part = 'all',
  idPrefix = 'af',
}) => {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const categorizedFiles = files as CategorizedFile[];
  const isPromotion = applicationType === 'promotion';

  // Local state for upload progress and status per document type (simulated interactive feedback)
  const [localProgress, setLocalProgress] = useState<Record<string, number>>({});
  const [localStatus, setLocalStatus] = useState<Record<string, 'uploading' | 'success' | 'error'>>({});
  const [localError, setLocalError] = useState<Record<string, string>>({});

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, documentType: DocumentType) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Reset statuses
      setLocalError(prev => ({ ...prev, [documentType]: '' }));
      setLocalStatus(prev => ({ ...prev, [documentType]: 'uploading' }));
      setLocalProgress(prev => ({ ...prev, [documentType]: 0 }));

      // 1. Validation (format and size)
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        const fileExt = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        if (!ACCEPTED_EXTENSIONS.includes(fileExt)) {
          setLocalStatus(prev => ({ ...prev, [documentType]: 'error' }));
          setLocalError(prev => ({ ...prev, [documentType]: 'Unsupported file format. Please upload PDF, DOC, DOCX, JPG, or PNG.' }));
          e.target.value = '';
          return;
        }
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setLocalStatus(prev => ({ ...prev, [documentType]: 'error' }));
        setLocalError(prev => ({ ...prev, [documentType]: 'File exceeds 10MB size limit.' }));
        e.target.value = '';
        return;
      }

      // 2. Simulate Upload Progress
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        setLocalProgress(prev => ({ ...prev, [documentType]: currentProgress }));
        
        if (currentProgress >= 100) {
          clearInterval(interval);
          setLocalStatus(prev => ({ ...prev, [documentType]: 'success' }));
          
          const newFile: CategorizedFile = {
            file,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            documentType,
          };
          
          // Replace existing file of same type or add new
          const filteredFiles = categorizedFiles.filter(f => f.documentType !== documentType);
          onFilesChange([...filteredFiles, newFile]);
        }
      }, 60);
    }
  };

  const removeFile = (id: string, documentType: DocumentType) => {
    onFilesChange(categorizedFiles.filter((f) => f.id !== id));
    setLocalStatus(prev => {
      const next = { ...prev };
      delete next[documentType];
      return next;
    });
    setLocalProgress(prev => {
      const next = { ...prev };
      delete next[documentType];
      return next;
    });
    setLocalError(prev => {
      const next = { ...prev };
      delete next[documentType];
      return next;
    });
  };

  const getFileForDocType = (docType: DocumentType) => {
    return categorizedFiles.find(f => f.documentType === docType);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handlePromotionFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const incoming = Array.from(e.target.files).map((file) => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      documentType: file.name,
    })) as CategorizedFile[];

    onFilesChange([...categorizedFiles, ...incoming]);
    e.target.value = '';
  };

  const fileIcon = <FileText size={18} strokeWidth={1.75} aria-hidden="true" />;

  if (isPromotion) {
    // Promotional applications have no Government ID step — only the batch upload.
    if (part === 'govId') return null;
    return (
      <FormSection
        icon={<FolderUp size={20} strokeWidth={1.75} />}
        title="Supporting documents"
        description="Internal promotional application"
        headingId={`${idPrefix}-docs`}
        wide
      >
        {plantillaItemNo && <p className="af-body-m" style={{ marginBottom: 12 }}>Plantilla Item No. {plantillaItemNo}</p>}
        <p className="af-notice" style={{ marginBottom: 16 }}>
          Upload certificates, performance records, updated PDS, training proofs, and any other supporting files in one
          batch. If possible, name files clearly, for example: <strong>Training-Certificate-Leadership.pdf</strong>.
        </p>

        <label htmlFor={`${idPrefix}-promotion-files`} className="af-dropzone">
          <input
            type="file"
            id={`${idPrefix}-promotion-files`}
            ref={(el) => {
              inputRefs.current.promotion = el;
            }}
            className="af-sr-only"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            multiple
            onChange={handlePromotionFilesUpload}
          />
          <FolderUp size={24} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--color-primary)' }} />
          <span className="af-headline">Select one or more supporting documents</span>
          <span className="af-body-s">Accepted formats: PDF, DOC, DOCX, JPG, PNG. Maximum 10MB per file.</span>
        </label>

        {categorizedFiles.length > 0 && (
          <ul className="af-docs">
            {categorizedFiles.map((uploadedFile) => (
              <li key={uploadedFile.id} className="af-doc" data-state="done">
                <div className="af-file">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    {fileIcon}
                    <span style={{ minWidth: 0 }}>
                      <span className="af-file-name">{uploadedFile.file.name}</span>
                      <span className="af-body-s">{formatFileSize(uploadedFile.file.size)}</span>
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => removeFile(uploadedFile.id, uploadedFile.documentType)}
                    aria-label={`Remove ${uploadedFile.file.name}`}
                  >
                    <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="af-error" role="alert" style={{ marginTop: 12 }}>{error}</p>}
      </FormSection>
    );
  }

  const needsExpiration = EXPIRING_IDS.includes(formData?.gov_id_type ?? '');

  const govIdCard = formData && onChange ? (
    <FormSection
      icon={<IdCard size={20} strokeWidth={1.75} />}
      title="Government ID verification"
      description="Select your government-issued ID type and enter the expiration date (if applicable)."
      headingId={`${idPrefix}-govid`}
    >
      <div className="af-fields">
        <div className="af-field">
          <label htmlFor={`${idPrefix}-gov-id-type`} className="af-label">
            Government Issued ID Type <span className="af-required" aria-hidden="true">*</span>
          </label>
          <select
            id={`${idPrefix}-gov-id-type`}
            value={formData.gov_id_type || ''}
            onChange={(e) => onChange('gov_id_type', e.target.value)}
            className="af-control"
            required
            aria-invalid={errors.gov_id_type ? true : undefined}
            aria-describedby={errors.gov_id_type ? `${idPrefix}-gov-id-type-msg` : undefined}
          >
            <option value="">Select ID Type...</option>
            <option value="Passport">Passport</option>
            <option value="Driver's License">Driver's License</option>
            <option value="National ID">National ID</option>
            <option value="UMID">UMID</option>
            <option value="PhilHealth ID">PhilHealth ID</option>
            <option value="PRC ID">PRC ID</option>
            <option value="Postal ID">Postal ID</option>
          </select>
          {errors.gov_id_type && (
            <span id={`${idPrefix}-gov-id-type-msg`} className="af-error" role="alert">{errors.gov_id_type}</span>
          )}
        </div>

        <div className="af-field">
          <label htmlFor={`${idPrefix}-gov-id-expiration`} className="af-label">
            Expiration Date {needsExpiration && <span className="af-required" aria-hidden="true">*</span>}
          </label>
          <input
            type="date"
            id={`${idPrefix}-gov-id-expiration`}
            value={formData.gov_id_expiration || ''}
            onChange={(e) => onChange('gov_id_expiration', e.target.value)}
            disabled={!needsExpiration}
            required={needsExpiration}
            className="af-control"
            aria-invalid={errors.gov_id_expiration ? true : undefined}
            aria-describedby={`${idPrefix}-gov-id-expiration-msg`}
          />
          {errors.gov_id_expiration ? (
            <span id={`${idPrefix}-gov-id-expiration-msg`} className="af-error" role="alert">{errors.gov_id_expiration}</span>
          ) : !needsExpiration && formData.gov_id_type ? (
            <span id={`${idPrefix}-gov-id-expiration-msg`} className="af-helper">
              Expiration date not applicable for {formData.gov_id_type}.
            </span>
          ) : null}
        </div>
      </div>
    </FormSection>
  ) : null;

  if (part === 'govId') return govIdCard;

  const requiredCount = REQUIRED_DOCUMENTS.filter((d) => d.required).length;
  const requiredDone = REQUIRED_DOCUMENTS.filter((d) => d.required && getFileForDocType(d.type)).length;

  const documentsCard = (
    <FormSection
      icon={<FileText size={20} strokeWidth={1.75} />}
      title="Documents"
      description={
        plantillaItemNo
          ? `Plantilla Item No. ${plantillaItemNo}. Your Reference No. for tracking is issued once you submit.`
          : 'General application. Your Reference No. for tracking is issued once you submit.'
      }
      headingId={`${idPrefix}-docs`}
      wide
    >
      <p className="af-body-m">
        <strong>Required documents checklist:</strong> upload the documents below. Accepted formats: PDF, JPG, JPEG, PNG,
        DOC, DOCX. Maximum file size: 10MB per file.
      </p>
      <p className="af-notice" style={{ marginTop: 12 }}>
        <strong>File naming format:</strong> name your files like this for easier tracking:{' '}
        <code>[DocumentType]-[LastName]-[FirstName].pdf</code>, for example <em>ApplicationLetter-DelaCruz-Juan.pdf</em>{' '}
        or <em>CurriculumVitae-Santos-Maria.pdf</em>.
      </p>

      <ul className="af-docs">
        {REQUIRED_DOCUMENTS.map((doc, index) => {
          const uploadedFile = getFileForDocType(doc.type);
          const inputId = `${idPrefix}-file-${doc.type}`;
          const status = localStatus[doc.type];
          const progress = localProgress[doc.type] || 0;
          const docError = localError[doc.type];
          const state = docError ? 'error' : uploadedFile ? 'done' : 'empty';

          return (
            <li key={doc.type} className="af-doc" data-state={state}>
              <div className="af-doc-head">
                <span className="af-doc-num" aria-hidden="true">{index + 1}</span>
                <div style={{ minWidth: 0 }}>
                  <p className="af-doc-title">
                    {doc.label}
                    <span className={`badge ${doc.required ? 'badge-tint' : 'badge-neutral'}`}>
                      {doc.required ? 'Required' : 'Optional'}
                    </span>
                  </p>
                  <p className="af-body-s" style={{ marginTop: 4 }}>{doc.description}</p>
                </div>
              </div>

              {!uploadedFile && status !== 'uploading' ? (
                <div>
                  <input
                    type="file"
                    id={inputId}
                    ref={(el) => {
                      inputRefs.current[doc.type] = el;
                    }}
                    className="af-sr-only"
                    tabIndex={-1}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(e, doc.type)}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => inputRefs.current[doc.type]?.click()}
                    aria-label={`Choose file for ${doc.label}`}
                    data-doc-type={doc.type}
                  >
                    <Paperclip size={16} strokeWidth={1.75} aria-hidden="true" />
                    Choose File
                  </button>
                </div>
              ) : status === 'uploading' ? (
                /* Progress indicator */
                <div aria-live="polite">
                  <div className="af-body-s" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Uploading…</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="af-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${doc.label} upload`}>
                    <span style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : uploadedFile ? (
                <div className="af-file">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <CircleCheck size={18} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--success-500)', flexShrink: 0 }} />
                    <span style={{ minWidth: 0 }}>
                      <span className="af-file-name">{uploadedFile.file.name}</span>
                      <span className="af-body-s">{formatFileSize(uploadedFile.file.size)} · Attached</span>
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => removeFile(uploadedFile.id, doc.type)}
                    aria-label={`Remove ${uploadedFile.file.name}`}
                  >
                    <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                    Remove
                  </button>
                </div>
              ) : null}

              {docError && <p className="af-error" role="alert">{docError}</p>}
            </li>
          );
        })}
      </ul>

      {error && <p className="af-error" role="alert" style={{ marginTop: 16 }}>{error}</p>}

      <p className="af-body-m" style={{ marginTop: 16 }} aria-live="polite">
        <strong>{categorizedFiles.length}</strong> of <strong>{REQUIRED_DOCUMENTS.length}</strong> documents uploaded (
        {requiredDone} of {requiredCount} required)
      </p>
    </FormSection>
  );

  if (part === 'documents') return documentsCard;

  return (
    <>
      {govIdCard}
      {documentsCard}
    </>
  );
};
