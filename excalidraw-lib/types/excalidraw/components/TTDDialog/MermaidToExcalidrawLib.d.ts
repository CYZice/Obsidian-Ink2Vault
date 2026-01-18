import type { MermaidConfig } from "@zsviczian/mermaid-to-excalidraw";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { MermaidToExcalidrawLibProps } from "./common";
export declare const loadMermaidToExcalidrawLib: () => Promise<MermaidToExcalidrawLibProps>;
export declare const loadMermaidLib: () => Promise<MermaidToExcalidrawLibProps>;
export declare const mermaidToExcalidraw: (mermaidDefinition: string, opts: MermaidConfig, forceSVG?: boolean) => Promise<{
    elements?: ExcalidrawElement[];
    files?: any;
    error?: string;
} | undefined>;
