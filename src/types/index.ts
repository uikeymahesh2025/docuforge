export type ToolCategory =
  | 'organize'
  | 'edit'
  | 'convert-to'
  | 'convert-from'
  | 'optimize'
  | 'page-tools'
  | 'security'
  | 'other';

export interface ToolItem {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  path: string;
  icon: string; // Lucide icon name
  badge?: string;
}

export type EditorTool =
  | 'select'
  | 'hand'
  | 'text'
  | 'draw'
  | 'highlight'
  | 'underline'
  | 'strike'
  | 'rect'
  | 'circle'
  | 'arrow'
  | 'line'
  | 'image'
  | 'signature'
  | 'eraser';

export interface AnnotationPoint {
  x: number;
  y: number;
}

export interface BaseAnnotation {
  id: string;
  pageNumber: number; // 1-indexed
  type: EditorTool;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  color: string;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  backgroundColor?: string;
}

export interface DrawAnnotation extends BaseAnnotation {
  type: 'draw' | 'highlight' | 'underline' | 'strike';
  points: AnnotationPoint[];
  strokeWidth: number;
}

export interface ShapeAnnotation extends BaseAnnotation {
  type: 'rect' | 'circle' | 'arrow' | 'line';
  strokeWidth: number;
  strokeColor: string;
  fillColor: string;
}

export interface ImageAnnotation extends BaseAnnotation {
  type: 'image' | 'signature';
  dataUrl: string;
  rotation: number;
}

export type AnyAnnotation =
  | TextAnnotation
  | DrawAnnotation
  | ShapeAnnotation
  | ImageAnnotation;

export interface PageInfo {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
  thumbnailUrl?: string;
}

export interface SearchMatch {
  pageIndex: number;
  matchIndex: number;
  text: string;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface WatermarkSettings {
  type: 'text' | 'image';
  text: string;
  fontSize: number;
  fontColor: string;
  opacity: number;
  rotation: number;
  tiled: boolean;
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  imageDataUrl?: string;
  imageScale: number;
  pageSelection: 'all' | 'custom';
  customPages: string;
}

export interface PageNumberSettings {
  format: 'number' | 'page-of-total' | 'roman';
  position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  startNumber: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  margin: number;
  pageRange: 'all' | 'custom';
  customRange: string;
}

export interface HeaderFooterSettings {
  headerLeft: string;
  headerCenter: string;
  headerRight: string;
  footerLeft: string;
  footerCenter: string;
  footerRight: string;
  fontSize: number;
  color: string;
  margin: number;
  pageRange: 'all' | 'custom';
  customRange: string;
}

export interface BatesSettings {
  prefix: string;
  suffix: string;
  startNumber: number;
  digits: number;
  position: 'top-right' | 'bottom-right' | 'bottom-center' | 'top-left';
  fontSize: number;
  color: string;
}
