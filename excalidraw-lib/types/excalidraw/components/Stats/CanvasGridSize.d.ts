import type { Scene } from "@excalidraw/element";
import type { AppState } from "../../types";
interface PositionProps {
    property: "gridSize";
    scene: Scene;
    appState: AppState;
    setAppState: React.Component<any, AppState>["setState"];
}
declare const CanvasGridSize: ({ property, scene, appState, setAppState, }: PositionProps) => import("react/jsx-runtime").JSX.Element;
export default CanvasGridSize;
