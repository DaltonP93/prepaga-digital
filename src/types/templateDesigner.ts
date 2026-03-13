// ============================================================
// Template Designer 2.0 Premium — Type Definitions
// ============================================================

// --------------- Block Types ---------------

export type BlockType =
  | 'text'
  | 'heading'
  | 'image'
  | 'attachment_card'
  | 'pdf_embed'
  | 'docx_embed'
  | 'signature_block'
  | 'table'
  | 'page_break'
  | 'placeholder_chip';

export type SignerRole = 'titular' | 'adherente' | 'contratada';

export type FieldType =
  | 'signature'
  | 'initials'
  | 'date'
  | 'text'
  | 'checkbox'
  | 'name'
  | 'dni'
  | 'email';

export type AssetType = 'image' | 'pdf' | 'docx' | 'logo' | 'attachment';

export type DesignerVersion = '1.0' | '2.0';
export type RenderEngine = 'legacy' | 'blocks_v2';

// --------------- Block Content Schemas ---------------

export interface TextBlockContent {
  kind: 'rich_text';
  html: string;
  plain_text: string;
  semantic_role: 'paragraph' | 'clause' | 'legal_note';
  placeholder_refs: string[];
}

export interface HeadingBlockContent {
  kind: 'heading';
  level: 1 | 2 | 3;
  text: string;
  placeholder_refs: string[];
}

export interface ImageBlockContent {
  kind: 'image';
  asset_id: string;
  src: string;
  alt: string;
  caption: string;
  fit: 'contain' | 'cover' | 'fill';
  is_background: boolean;
}

export interface AttachmentCardContent {
  kind: 'attachment_card';
  asset_id: string;
  title: string;
  description: string;
  display_mode: 'card' | 'link' | 'preview';
  show_file_icon: boolean;
  show_meta: boolean;
  include_in_final_pdf: boolean;
  requires_acknowledgement: boolean;
  file_ref: {
    mime_type: string;
    page_count: number;
  };
}

export interface PdfEmbedPagePreview {
  page_number: number;
  preview_image_url: string;
  width: number;
  height: number;
}

export interface PdfEmbedContent {
  kind: 'pdf_embed';
  asset_id: string;
  source_type: 'pdf';
  display_mode: 'embedded_pages' | 'card' | 'cover';
  page_selection: {
    mode: 'all' | 'range' | 'specific';
    pages: number[];
  };
  render_mode: 'preview_image';
  final_output_mode: 'merge_original_pdf_pages';
  page_previews: PdfEmbedPagePreview[];
  allow_overlay_fields: boolean;
  replaceable: boolean;
}

export interface DocxEmbedContent {
  kind: 'docx_embed';
  asset_id: string;
  source_type: 'docx';
  converted_pdf_asset_id: string;
  display_mode: 'embedded_pages';
  page_selection: {
    mode: 'all' | 'range' | 'specific';
    pages?: number[];
  };
  render_mode: 'preview_image';
  final_output_mode: 'merge_converted_pdf_pages';
  allow_overlay_fields: boolean;
}

export interface SignatureBlockContent {
  kind: 'signature_block';
  signer_role: SignerRole;
  signature_mode: 'electronic' | 'digital';
  show_name: boolean;
  show_dni: boolean;
  show_timestamp: boolean;
  show_ip: boolean;
  show_method: boolean;
  label: string;
  preset: 'legal_v1' | 'legal_v2' | 'compact';
}

export interface TableColumn {
  key: string;
  label: string;
}

export interface TableBlockContent {
  kind: 'table';
  source: 'beneficiaries' | 'custom';
  columns: TableColumn[];
  header: boolean;
  striped: boolean;
  empty_state: string;
}

export interface PageBreakContent {
  kind: 'page_break';
}

export interface PlaceholderChipContent {
  kind: 'placeholder_chip';
  placeholder_key: string;
  label: string;
  example_value: string;
}

export type BlockContent =
  | TextBlockContent
  | HeadingBlockContent
  | ImageBlockContent
  | AttachmentCardContent
  | PdfEmbedContent
  | DocxEmbedContent
  | SignatureBlockContent
  | TableBlockContent
  | PageBreakContent
  | PlaceholderChipContent;

// --------------- Block Style Schemas ---------------

export interface TextBlockStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  color: string;
  padding: number;
  marginTop: number;
  marginBottom: number;
}

export interface HeadingBlockStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  textAlign: 'left' | 'center' | 'right';
  color: string;
  marginBottom: number;
}

export interface ImageBlockStyle {
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  shadow: 'none' | 'sm' | 'md' | 'lg';
  opacity: number;
}

export interface SignatureBlockStyle {
  align: 'left' | 'center' | 'right';
  size: 'small' | 'normal' | 'large';
  borderTop: boolean;
  paddingTop: number;
  fontSize: number;
}

export interface TableBlockStyle {
  fontSize: number;
  headerBackground: string;
  borderColor: string;
  cellPadding: number;
}

export interface GenericBlockStyle {
  background?: string;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  shadow?: string;
  padding?: number;
  pageGap?: number;
}

// --------------- Visibility Rules ---------------

export interface VisibilityRules {
  roles: SignerRole[];
  conditions: VisibilityCondition[];
}

export interface VisibilityCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty';
  value?: string;
}

// --------------- Template Field Meta ---------------

export interface NormalizedCoordinates {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FieldAppearance {
  placeholderText?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  color?: string;
  labelPosition?: 'left' | 'right' | 'top';
}

export interface TemplateFieldMeta {
  relativeTo: 'block' | 'page';
  blockId?: string;
  sourcePageNumber?: number;
  normalized: NormalizedCoordinates;
  appearance: FieldAppearance;
}

// --------------- Database Row Types ---------------

export interface TemplateAsset {
  id: string;
  template_id: string;
  asset_type: AssetType;
  file_name: string;
  file_url: string;
  mime_type: string | null;
  file_size: number | null;
  page_count: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TemplateAssetPage {
  id: string;
  asset_id: string;
  page_number: number;
  preview_image_url: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

export interface TemplateBlock {
  id: string;
  template_id: string;
  block_type: BlockType;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  z_index: number;
  rotation: number;
  is_locked: boolean;
  is_visible: boolean;
  content: BlockContent;
  style: Record<string, unknown>;
  visibility_rules: VisibilityRules;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateField {
  id: string;
  template_id: string;
  block_id: string | null;
  signer_role: SignerRole;
  field_type: FieldType;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  required: boolean;
  label: string | null;
  meta: TemplateFieldMeta;
  created_at: string;
}

// --------------- Insert Types ---------------

export type TemplateAssetInsert = Omit<TemplateAsset, 'id' | 'created_at'>;
export type TemplateBlockInsert = Omit<TemplateBlock, 'id' | 'created_at' | 'updated_at'>;
export type TemplateFieldInsert = Omit<TemplateField, 'id' | 'created_at'>;

// --------------- Update Types ---------------

export type TemplateAssetUpdate = Partial<TemplateAssetInsert> & { id: string };
export type TemplateBlockUpdate = Partial<TemplateBlockInsert> & { id: string };
export type TemplateFieldUpdate = Partial<TemplateFieldInsert> & { id: string };
