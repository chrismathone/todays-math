# Studio FigureEditor integration

This is a port of `F:/Mathgen/src/components/math/FigureEditor.tsx` at Mathgen commit `e8d12aabcb8bbff9f44b4e619ef90af971d7fb9d`. It reuses that editor's actual implementation and its SVG editing, clipboard, handles, object numbering, function graph, expression parser, and keyboard helpers. The original source comments are retained; no licensing headers were removed. The inspected source files did not contain license notices, and no repository license file was found by the license-file search.

```tsx
import StudioFigureEditor from "@/components/unified/figure-editor";

<StudioFigureEditor
  image={figure.image}
  originalImage={figure.originalImage}
  initialSvg={figure.svg}
  index={index}
  onSave={({ dataUrl, svg, originalImage }) => {
    // Persist all three fields together in the parent StudioFigure.
    updateFigure({ image: dataUrl, svg, originalImage });
  }}
  onClose={closeEditor}
  onRedraw={redrawWithSubscriptionBridge}
/>;
```

The named export `StudioFigureEditor` is also available. `types.ts` and the directory entry export these exact contracts:

```ts
interface StudioFigureSaveResult {
  svg: string;
  dataUrl: string;
  originalImage?: string;
}
interface StudioFigureRedrawRequest {
  originalImage: string;
  svg: string;
  instructions: string;
  signal?: AbortSignal;
}
interface StudioFigureRedrawResult {
  svg: string;
  warnings?: string[];
}
interface StudioFigureEditorProps {
  image: string;
  originalImage?: string;
  initialSvg?: string;
  index: number;
  onSave: (result: StudioFigureSaveResult) => void;
  onClose: () => void;
  onRedraw?: (
    request: StudioFigureRedrawRequest,
  ) => Promise<StudioFigureRedrawResult>;
}
```

`svg` contains editable geometry, text, and function metadata. `dataUrl` contains sanitized, typeset SVG with fitted output bounds. `originalImage` retains the original raster crop. Reopening must supply `initialSvg={figure.svg}`; decoding the displayed SVG alone cannot restore text from rendered glyph paths. Initial raw SVG and percent/base64 SVG data URLs are accepted as a fallback. Invalid SVG opens a blank canvas with an error while retaining the original reference. Apply calls `onSave` and then `onClose`; cancellation never applies edits.

Manual features include select/move, pan/zoom, line, arrow, quadratic curve, circle, ellipse, rectangle, text/math, function graphs with separate axes, shape handles, numeric editing, color/fill/dashes, undo/redo, multiple selection, clipboard copy/cut/paste, duplication, delete, original side panel and adjustable translucent overlay, and SVG download. The modal traps Tab, restores focus, and uses a portal. The entry is safe for Next server rendering, then mounts the DOM-based editor on the client.

Redraw is entirely optional. When omitted, the AI request controls are hidden. The callback receives sanitized current source and the unchanged original crop, and must return SVG; it does not save the result automatically. The result is sanitized before display and participates in undo. Close and unmount abort the supplied signal; late results are ignored. The parent owns the subscription bridge and should honor that signal. The port includes no network/AI service calls or credentials.

Only existing `react`, `react-dom`, and `mathjax-full` packages are required. Mathgen's MathLive widget and keyboard were replaced by a native TeX input and insertion palette, preserving `$...$` metadata. MathJax is loaded lazily for labels and renders paths locally; unsupported CJK stays editable text. `mathjaxBrowserVersion.ts` supplies MathJax's source build variable `PACKAGE_VERSION` from the installed package metadata before source evaluation, avoiding its Node `eval('require')` version fallback. It preserves an existing value. The local `mathjaxLabel.ts` is adapted from this app's existing renderer, with its comments retained.

No global CSS or package changes are needed. The modal adapter uses existing `ink`, `surface`, `side`, `control`, `divider`, and `muted` Tailwind tokens. Mathgen's missing typography utilities were changed to standard `text-xs`, `text-sm`, and `text-lg`; selection handles retain the original orange affordances. Narrow editor windows can scroll the three panels horizontally. The canvas sizing rule is scoped to `#figure-editor-canvas`.

Browser-only sanitizer exports are `prepareFigureSvg(source?: string): string` and `cleanFigureForSave(svg: string): string` from `figureSvgEditing.ts`. They remove scripts, foreign namespaces/elements, event attributes, external resource references, unsupported CSS and document declarations, repair invalid viewports, and preserve transforms/local marker definitions/editable metadata. They use DOMParser and must not be called in server-only code. `figureDocument.ts` exports `svgFromImage`, `svgDataUrl`, `initialFigureSource`, and `createFigureSaveResult` for the source/preview boundary.

Verification: focused `studioFigureEditorDocument.test.ts` and `StudioFigureEditor.test.tsx` cover save/reopen geometry and metadata, drag drawing, undo/redo, clipboard marker remapping, SVG sanitization, Unicode data URLs, functions, original overlay, optional redraw, and cancellation. Scoped ESLint and strict TypeScript checks pass. An isolated Vite bundle of the local MathJax renderer was evaluated in a fresh VM without Node globals and produced fraction glyph paths, confirming the browser version shim. No whole-app build, development server, user browser, external AI request, push, or additional worker was used. Root owns StudioView integration and final integrated browser verification.
