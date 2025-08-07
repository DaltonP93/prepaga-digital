
import { lazy, Suspense } from 'react';
import { Skeleton, TableSkeleton, CardSkeleton, FormSkeleton, DashboardSkeleton } from './ui/skeleton-loader';

// Lazy loaded components para reducir el bundle inicial
export const LazyPdfViewer = lazy(() => import('./PDFPreview').then(module => ({ default: module.PDFPreview })));

// Simple fallback components for missing modules
const FallbackEditor = () => <div className="p-4 border rounded">Editor no disponible</div>;
const FallbackAnalytics = () => <div className="p-4 border rounded">Analytics no disponible</div>;
const FallbackReports = () => <div className="p-4 border rounded">Reports no disponible</div>;
const FallbackDocumentForm = () => <div className="p-4 border rounded">Document Form no disponible</div>;
const FallbackSignature = () => <div className="p-4 border rounded">Signature Canvas no disponible</div>;
const FallbackQuestionnaire = () => <div className="p-4 border rounded">Questionnaire no disponible</div>;
const FallbackFileUpload = () => <div className="p-4 border rounded">File Upload no disponible</div>;
const FallbackImageManager = () => <div className="p-4 border rounded">Image Manager no disponible</div>;

export const LazyContractEditor = lazy(() => Promise.resolve({ default: FallbackEditor }));
export const LazyAnalyticsDashboard = lazy(() => Promise.resolve({ default: FallbackAnalytics }));
export const LazyReportsManager = lazy(() => Promise.resolve({ default: FallbackReports }));
export const LazyDocumentForm = lazy(() => Promise.resolve({ default: FallbackDocumentForm }));
export const LazySignatureCanvas = lazy(() => Promise.resolve({ default: FallbackSignature }));
export const LazyDynamicQuestionnaire = lazy(() => Promise.resolve({ default: FallbackQuestionnaire }));
export const LazyFileUpload = lazy(() => Promise.resolve({ default: FallbackFileUpload }));
export const LazyImageManager = lazy(() => Promise.resolve({ default: FallbackImageManager }));

// Wrappers con Suspense para facilitar el uso
export const PdfViewerWrapper = ({ fallback = <CardSkeleton /> }: { fallback?: React.ReactNode }) => (
  <Suspense fallback={fallback}>
    <LazyPdfViewer />
  </Suspense>
);

export const ContractEditorWrapper = ({ fallback = <FormSkeleton /> }: { fallback?: React.ReactNode }) => (
  <Suspense fallback={fallback}>
    <LazyContractEditor />
  </Suspense>
);

export const AnalyticsDashboardWrapper = ({ fallback = <DashboardSkeleton /> }: { fallback?: React.ReactNode }) => (
  <Suspense fallback={fallback}>
    <LazyAnalyticsDashboard />
  </Suspense>
);

export const ReportsManagerWrapper = ({ fallback = <CardSkeleton /> }: { fallback?: React.ReactNode }) => (
  <Suspense fallback={fallback}>
    <LazyReportsManager />
  </Suspense>
);

export const DocumentFormWrapper = ({ fallback = <FormSkeleton /> }: { fallback?: React.ReactNode }) => (
  <Suspense fallback={fallback}>
    <LazyDocumentForm />
  </Suspense>
);

export const SignatureCanvasWrapper = ({ fallback = <Skeleton className="h-64 w-full" /> }: { fallback?: React.ReactNode }) => (
  <Suspense fallback={fallback}>
    <LazySignatureCanvas />
  </Suspense>
);

export const DynamicQuestionnaireWrapper = ({ fallback = <FormSkeleton /> }: { fallback?: React.ReactNode }) => (
  <Suspense fallback={fallback}>
    <LazyDynamicQuestionnaire />
  </Suspense>
);

export const FileUploadWrapper = ({ fallback = <Skeleton className="h-32 w-full" />, bucket = "documents" }: { fallback?: React.ReactNode; bucket?: string }) => (
  <Suspense fallback={fallback}>
    <LazyFileUpload />
  </Suspense>
);

export const ImageManagerWrapper = ({ fallback = <CardSkeleton /> }: { fallback?: React.ReactNode }) => (
  <Suspense fallback={fallback}>
    <LazyImageManager />
  </Suspense>
);

// Hook para cargar componentes de forma dinámica
export const useLazyComponent = (componentName: string) => {
  switch (componentName) {
    case 'PdfViewer':
      return { Component: LazyPdfViewer, fallback: <CardSkeleton /> };
    case 'ContractEditor':
      return { Component: LazyContractEditor, fallback: <FormSkeleton /> };
    case 'AnalyticsDashboard':
      return { Component: LazyAnalyticsDashboard, fallback: <DashboardSkeleton /> };
    case 'ReportsManager':
      return { Component: LazyReportsManager, fallback: <CardSkeleton /> };
    case 'DocumentForm':
      return { Component: LazyDocumentForm, fallback: <FormSkeleton /> };
    case 'SignatureCanvas':
      return { Component: LazySignatureCanvas, fallback: <Skeleton className="h-64 w-full" /> };
    case 'DynamicQuestionnaire':
      return { Component: LazyDynamicQuestionnaire, fallback: <FormSkeleton /> };
    case 'FileUpload':
      return { Component: LazyFileUpload, fallback: <Skeleton className="h-32 w-full" /> };
    case 'ImageManager':
      return { Component: LazyImageManager, fallback: <CardSkeleton /> };
    default:
      return null;
  }
};
