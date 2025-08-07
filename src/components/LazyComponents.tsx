
import { lazy, Suspense } from 'react';
import { Skeleton, TableSkeleton, CardSkeleton, FormSkeleton, DashboardSkeleton } from './ui/skeleton-loader';

// Lazy loaded components para reducir el bundle inicial
export const LazyPdfViewer = lazy(() => import('./PDFPreview').then(module => ({ default: module.PDFPreview })));
export const LazyContractEditor = lazy(() => import('./TipTapEditor').then(module => ({ default: module.default || module })));
export const LazyAnalyticsDashboard = lazy(() => import('./AdvancedAnalytics').then(module => ({ default: module.default || module })));
export const LazyReportsManager = lazy(() => import('./ReportsManager').then(module => ({ default: module.default || module })));
export const LazyDocumentForm = lazy(() => import('./DocumentForm').then(module => ({ default: module.default || module })));
export const LazySignatureCanvas = lazy(() => import('./SignatureCanvas').then(module => ({ default: module.SignatureCanvas })));
export const LazyDynamicQuestionnaire = lazy(() => import('./DynamicQuestionnaire').then(module => ({ default: module.default || module })));
export const LazyFileUpload = lazy(() => import('./FileUpload').then(module => ({ default: module.FileUpload })));
export const LazyImageManager = lazy(() => import('./ImageManager').then(module => ({ default: module.default || module })));

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

export const FileUploadWrapper = ({ fallback = <Skeleton className="h-32 w-full" /> }: { fallback?: React.ReactNode }) => (
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
