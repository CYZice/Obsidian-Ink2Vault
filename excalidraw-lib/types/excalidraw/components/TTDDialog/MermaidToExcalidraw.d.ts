import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";
import "./MermaidToExcalidraw.scss";
import type { MermaidToExcalidrawLibProps } from "./common";
declare const MermaidToExcalidraw: ({ mermaidToExcalidrawLib, selectedElements, }: {
    mermaidToExcalidrawLib: MermaidToExcalidrawLibProps;
    selectedElements: readonly NonDeletedExcalidrawElement[];
}) => import("react/jsx-runtime").JSX.Element;
export default MermaidToExcalidraw;
