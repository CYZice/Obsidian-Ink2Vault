import React from "react";
import "./FixedSideContainer.scss";
type FixedSideContainerProps = {
    children: React.ReactNode;
    side: "top" | "left" | "right";
    className?: string;
    sidepanelOpen?: boolean;
};
export declare const FixedSideContainer: ({ children, side, className, sidepanelOpen, }: FixedSideContainerProps) => import("react/jsx-runtime").JSX.Element;
export {};
