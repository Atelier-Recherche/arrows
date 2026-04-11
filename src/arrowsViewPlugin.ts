import { EditorState, StateEffect } from "@codemirror/state";
import { EditorView, ViewUpdate, Decoration, DecorationSet, ViewPlugin, WidgetType } from "@codemirror/view";
import { MatchDecoratorAll } from "./matchDecoratorAll";
import { ArrowsManager } from "./arrowsManager";
import { ArrowIdentifierData, ArrowIdentifierPosData, ArrowIdentifierCollection, arrowSourceToArrowIdentifierData, arrowIdentifierCollectionIsResolved, rangeWithinExcludedContext, colorToEffectiveColor } from './utils';
import * as constants from "./consts";
import { getArrowConfigFromView } from "./arrowsConfig";

const arrowSourceRegex = /{([^{}]+)}/g;

const arrowIdentifierHighlighter = new MatchDecoratorAll({
    regexp: arrowSourceRegex,
    decoration: (match) => {
        const arrowSource = match[1];
        const arrowData = arrowSourceToArrowIdentifierData(arrowSource);

        const startOrEnd = "";
        const className = constants.ARROW_IDENTIFIER_CLASS + " " + startOrEnd;

        return Decoration.mark({
            tagName: "span",
            class: className,
            arrowIdentifierData: arrowData
        });
    }
});

export const refreshAllArrows = StateEffect.define();

export class ArrowsViewPlugin {
    container: HTMLElement;
    arrowsManager: ArrowsManager;
    arrowIdentifierRanges: DecorationSet;
    arrowIdentifierCollections: ArrowIdentifierCollection[];
    decorations: DecorationSet;

    constructor(view: EditorView) {
        // Create a container to hold the arrows in
        this.createContainer(view);
        this.arrowsManager = new ArrowsManager(view, this.container);
        this.initialiseArrows(view);
    }

    createContainer(view: EditorView) {
        const container = document.createElement("div");
        container.addClass(constants.ARROW_CONTAINER_CLASS);
        view.scrollDOM.prepend(container);
        this.container = container;
    }

    initialiseArrows(view: EditorView) {
        this.arrowIdentifierRanges = arrowIdentifierHighlighter.createDeco(view);
        this.decorations = Decoration.none;

        // Wait until syntaxTree is ready and widgets have been rendered in the DOM to draw arrows
        queueMicrotask(() => {
            const posData = this.arrowIdentifierRangesToArrowIdentifierPosData(this.arrowIdentifierRanges, view.state);
            this.arrowIdentifierCollections = this.collectArrowIdentifierPosData(posData);
            const decos = this.arrowIdentifierCollectionsToDecos(this.arrowIdentifierCollections, view);
            this.decorations = decos;

            this.arrowsManager.drawArrows(this.arrowIdentifierCollections);
        });
    }

    update(update: ViewUpdate) {
        let shouldRefreshAllArrows = false;
        for (const transaction of update.transactions) {
            for (const effect of transaction.effects) {
                if (effect.is(refreshAllArrows)) {
                    shouldRefreshAllArrows = true;
                    break;
                }
            }
        }
        if (shouldRefreshAllArrows) {
            this.arrowsManager.removeAllArrows();
            this.initialiseArrows(update.view);
            return;
        }

        // Update arrows
        this.arrowIdentifierRanges = arrowIdentifierHighlighter.updateDeco(update, this.arrowIdentifierRanges);
        const posData = this.arrowIdentifierRangesToArrowIdentifierPosData(this.arrowIdentifierRanges, update.state);
        this.arrowIdentifierCollections = this.collectArrowIdentifierPosData(posData);
        const decos = this.arrowIdentifierCollectionsToDecos(this.arrowIdentifierCollections, update.view);
        this.decorations = decos;

        // Wait until widgets have been rendered in the DOM to draw arrows
        queueMicrotask(() => {
            this.arrowsManager.drawArrows(this.arrowIdentifierCollections);
        });
    }

    destroy() {
        this.arrowsManager.removeAllArrows();
        this.container.remove();
    }

    arrowIdentifierRangesToArrowIdentifierPosData(arrowIdentifierRanges: DecorationSet, state: EditorState): ArrowIdentifierPosData[] {
        const rangeCursor = arrowIdentifierRanges.iter();
        const arrowIdentifierPosData: ArrowIdentifierPosData[] = [];

        while (rangeCursor.value != null) {
            const from = rangeCursor.from;
            const to = rangeCursor.to;

            if (rangeWithinExcludedContext(from, to, state)) {
                rangeCursor.next();
                continue;
            }

            const arrowData = rangeCursor.value.spec.arrowIdentifierData;
            if (!arrowData) {
                rangeCursor.next();
                continue;
            }

            arrowIdentifierPosData.push({from: from, to: to, arrowData: arrowData});
            rangeCursor.next();
        }

        return arrowIdentifierPosData;
    }

    collectArrowIdentifierPosData(arrowIdentifierPosData: ArrowIdentifierPosData[]): ArrowIdentifierCollection[] {
        const result: {[identifier: string]: ArrowIdentifierCollection} = {};

        for (const arrowIdentifierPos of arrowIdentifierPosData) {
            const arrowData = arrowIdentifierPos.arrowData;
            const identifier = arrowData.identifier;
            const isStart = arrowData.isStart;
            const isBoxClosing = arrowData.isBoxClosing;

            // Group by identifier
            if (!(identifier in result)) {
                result[identifier] = {identifier: identifier, ends: [], boxClosings: []};
            }

            if (isBoxClosing) {
                // This is a box closing tag like {/arrow-id}
                result[identifier].boxClosings.push(arrowIdentifierPos);
            }
            else if (isStart) {
                // If this is marked as a start, check if we already have a start for this identifier
                // If yes, and this one has isBox, treat it as an end instead
                if (result[identifier].start && arrowData.isBox) {
                    result[identifier].ends.push(arrowIdentifierPos);
                } else {
                    result[identifier].start = arrowIdentifierPos;
                }
            }
            else {
                result[identifier].ends.push(arrowIdentifierPos);
            }
        }

        return Object.values(result);
    }

    arrowIdentifierCollectionsToDecos(arrowIdentifierCollections: ArrowIdentifierCollection[], view: EditorView): DecorationSet {
        const decos = [];

        for (const arrowIdentifierCollection of arrowIdentifierCollections) {
            const isResolved = arrowIdentifierCollectionIsResolved(arrowIdentifierCollection);
            // Include all boxClosings in allArrowIdentifiers so they get decorations (to hide them)
            const allArrowIdentifiers = [
                arrowIdentifierCollection.start, 
                ...arrowIdentifierCollection.ends,
                ...arrowIdentifierCollection.boxClosings
            ];
            let color = "";
            let boxColor = "";

            if (isResolved) {
                const start = arrowIdentifierCollection.start;
                if (!start) continue;

                const startColor = start.arrowData.color;
                if (startColor) color = startColor;
                
                const startBoxColor = start.arrowData.boxColor;
                if (startBoxColor) boxColor = startBoxColor;
                
                // Handle box decorations - associate box closings with box identifiers in order
                if (arrowIdentifierCollection.boxClosings.length > 0) {
                    let closingIndex = 0;
                    
                    // First, handle start if it's a box
                    if (start.arrowData.isBox && closingIndex < arrowIdentifierCollection.boxClosings.length) {
                        const boxClosing = arrowIdentifierCollection.boxClosings[closingIndex];
                        const effectiveBoxColor = boxColor ? colorToEffectiveColor(boxColor, getArrowConfigFromView(view)) : colorToEffectiveColor(color, getArrowConfigFromView(view));
                        
                        // Create a box decoration from the end of start tag to the beginning of closing tag
                        const boxDeco = Decoration.mark({
                            tagName: "span",
                            class: constants.ARROW_BOX_CLASS,
                            attributes: {
                                style: `border-color: ${effectiveBoxColor};`
                            }
                        }).range(start.to, boxClosing.from);
                        
                        decos.push(boxDeco);
                        closingIndex++;
                    }
                    
                    // Then, handle ends that are boxes
                    for (const end of arrowIdentifierCollection.ends) {
                        if (end.arrowData.isBox && closingIndex < arrowIdentifierCollection.boxClosings.length) {
                            const boxClosing = arrowIdentifierCollection.boxClosings[closingIndex];
                            // Use the end's boxColor if available, otherwise use the start's boxColor, then arrow color as fallback
                            const endBoxColor = end.arrowData.boxColor;
                            const effectiveBoxColor = endBoxColor 
                                ? colorToEffectiveColor(endBoxColor, getArrowConfigFromView(view))
                                : (boxColor ? colorToEffectiveColor(boxColor, getArrowConfigFromView(view)) 
                                    : (color ? colorToEffectiveColor(color, getArrowConfigFromView(view)) : "var(--text-normal)"));
                            
                            // Create a box decoration from the end of end tag to the beginning of closing tag
                            const boxDeco = Decoration.mark({
                                tagName: "span",
                                class: constants.ARROW_BOX_CLASS,
                                attributes: {
                                    style: `border-color: ${effectiveBoxColor};`
                                }
                            }).range(end.to, boxClosing.from);
                            
                            decos.push(boxDeco);
                            closingIndex++;
                        }
                    }
                }
            }

            color = colorToEffectiveColor(color, getArrowConfigFromView(view));

            for (const [index, arrowIdentifier] of allArrowIdentifiers.entries()) {
                if (!arrowIdentifier) continue;
                
                // "Unravel" the prettified circle when the cursor lies on the arrow identifier
                const sel = view.state.selection.main;
                const shouldUnravel = (sel.from >= arrowIdentifier.from) && (sel.to <= arrowIdentifier.to);
                
                // Skip box closing tags - they should not have circle decorations
                if (arrowIdentifier.arrowData.isBoxClosing) {
                    // Show the box closing tag when cursor is on it, hide it otherwise
                    if (shouldUnravel) {
                        const deco = Decoration.mark({
                            tagName: "span",
                            class: constants.ARROW_IDENTIFIER_CLASS,
                            arrowIdentifierPosData: arrowIdentifier
                        }).range(arrowIdentifier.from, arrowIdentifier.to);
                        decos.push(deco);
                    } else {
                        // Hide the box closing tag completely when not editing
                        const deco = Decoration.replace({
                            widget: new EmptyWidget(),
                            inclusive: false,
                            block: false
                        }).range(arrowIdentifier.from, arrowIdentifier.to);
                        decos.push(deco);
                    }
                    continue;
                }

                let deco;
                if (isResolved && !shouldUnravel) {
                    const nextArrowIdentifier = allArrowIdentifiers[(index+1) % allArrowIdentifiers.length];
                    const scrollTo = nextArrowIdentifier?.from;

                    // If this identifier has isBox, use an invisible circle that can still be a target for arrows
                    if (arrowIdentifier.arrowData.isBox) {
                        deco = Decoration.replace({
                            widget: new InvisibleCircle(arrowIdentifier.arrowData),
                            inclusive: false,
                            block: false,
                            arrowIdentifierPosData: arrowIdentifier,
                            scrollTo: scrollTo
                        }).range(arrowIdentifier.from, arrowIdentifier.to);
                    }
                    else {
                        deco = Decoration.replace({
                            widget: new PrettifiedCircle(color, arrowIdentifier.arrowData),
                            inclusive: false,
                            block: false,
                            arrowIdentifierPosData: arrowIdentifier,
                            scrollTo: scrollTo
                        }).range(arrowIdentifier.from, arrowIdentifier.to);
                    }
                }
                else {
                    deco = Decoration.mark({
                        tagName: "span",
                        class: constants.ARROW_IDENTIFIER_CLASS,
                        arrowIdentifierPosData: arrowIdentifier
                    }).range(arrowIdentifier.from, arrowIdentifier.to);
                }

                decos.push(deco);
            }
        }

        return Decoration.set(decos, true);
    }
}


export const arrowsViewPlugin = ViewPlugin.fromClass(
    ArrowsViewPlugin,
    {
        decorations: v => v.decorations,
        eventHandlers: {
            // When a prettified arrow identifier is clicked, scroll the editor to the next arrow identifier
            mousedown: function (this, event, view) {
                const target = event.target;
                if (!(target instanceof HTMLElement)) return;
                if (!target.hasClass(constants.ARROW_IDENTIFIER_PRETTIFIED_CIRCLE_CLASS)) return;

                // Go through all decorations, searching for the decoration corresponding to
                // this element
                const decos:DecorationSet = this.decorations;
                const rangeCursor = decos.iter();
                const pos = view.posAtDOM(target);

                while (rangeCursor.value != null) {
                    if (rangeCursor.from === pos) break;
                    rangeCursor.next();
                }

                const deco = rangeCursor.value;
                if (deco == null) return;

                // Fetch the scrollTo attribute from the decoration and scroll to that position
                const scrollTo = deco.spec.scrollTo;
                view.dispatch({
                    effects: EditorView.scrollIntoView(scrollTo, {y: "center"})
                });

                event.preventDefault();
            }
        }
    }
);


class PrettifiedCircle extends WidgetType {
    private readonly color: string;
    private readonly arrowIdentifierData: ArrowIdentifierData;

    constructor(color: string, arrowIdentifierData: ArrowIdentifierData) {
        super();

        this.color = color;
        this.arrowIdentifierData = arrowIdentifierData;
    }

    eq(other: PrettifiedCircle) {
        return (other.color === this.color);
    }

    toDOM() {
        const span = document.createElement("span");
        span.style.color = this.color;
        span.className = constants.ARROW_IDENTIFIER_PRETTIFIED_CIRCLE_CLASS;

        span.textContent = "●" // •
        return span;
    }

    ignoreEvent() {
        return false;
    }
}

class EmptyWidget extends WidgetType {
    constructor() {
        super();
    }

    eq(other: EmptyWidget) {
        return true;
    }

    toDOM() {
        const span = document.createElement("span");
        span.style.display = "none";
        return span;
    }

    ignoreEvent() {
        return false;
    }
}

class InvisibleCircle extends WidgetType {
    private readonly arrowIdentifierData: ArrowIdentifierData;

    constructor(arrowIdentifierData: ArrowIdentifierData) {
        super();
        this.arrowIdentifierData = arrowIdentifierData;
    }

    eq(other: InvisibleCircle) {
        return true;
    }

    toDOM() {
        const span = document.createElement("span");
        span.className = constants.ARROW_IDENTIFIER_PRETTIFIED_CIRCLE_CLASS;
        span.style.opacity = "0";
        span.style.width = "0";
        span.style.height = "0";
        span.style.display = "inline-block";
        span.textContent = "";
        return span;
    }

    ignoreEvent() {
        return false;
    }
}
