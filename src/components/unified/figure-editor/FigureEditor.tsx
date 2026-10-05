/* eslint-disable @next/next/no-img-element -- Original in-memory crops are displayed without optimization. */
/* Ported from Mathgen src/components/math/FigureEditor.tsx; see README.md. */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  ModalShell,
  Btn,
  ColorInput,
  formatToggleClass,
  hexColor,
  isBoldWeight,
  noFill,
} from "./editorUi";
import styles from "./StudioFigureEditor.module.css";
import type { StudioFigureEditorProps } from "./types";
import { initialFigureSource, createFigureSaveResult } from "./figureDocument";
import { describeFigureForEdit } from "./figureEditElements";
import { applyFigureEdits } from "./figureEditApply";
import { buildFigureEditSnapshot } from "./figureEditSnapshot";
import {
  addFigureObject,
  cleanFigureForSave,
  editFigureObject,
  figureNumbers,
  figureObjects,
  numberFigureObjects,
  prepareFigureSvg,
  editFigureObjects,
  setFigureGroup,
  withoutFigureNumbers,
} from "./figureSvgEditing";
import {
  figureAngleKinds,
  groupFigureObjects,
  nextGroupName,
  renumberAutoGroups,
} from "./figureObjectGroups";
import {
  copyFigureSelection,
  pasteFigureSelection,
  removeFigureSelection,
  transformFigureSelection,
  FIGURE_CLIPBOARD_TYPE,
} from "./figureClipboard";
import { modKey } from "./platform";
import { carryTypeset, typesetFigureSvg } from "./figureTypeset";
import { fitFrameToContent, renderFittedFigure } from "./figureFrame";
import { previewFigureObjects } from "./figureDragPreview";
import {
  figureHandles,
  hitFigureObject,
  moveFigureHandle,
  snapFigurePoint,
} from "./figureHandles";
import { FigureLabelInput } from "./FigureLabelInput";
import { addMidLabel, midLabelTarget } from "./figureMidLabel";
import { isTextInputEvent } from "./keyboard";
import {
  layoutFigureNumbers,
  retargetFigureNumbers,
  type FigureNumber,
} from "./figureObjectNumbers";
import { FigureSelectionOverlay } from "./FigureSelectionOverlay";
import { FigureGroupOverlay } from "./FigureGroupOverlay";
import {
  figureGroupBounds,
  type FigureGroupBounds,
} from "./figureGroupSelection";
import { FigureNumberLayer } from "./FigureNumberLayer";
import { FigureObjectList } from "./FigureObjectList";
import { FigureGroupRow } from "./FigureGroupRow";
import { FigureCommonFormat } from "./FigureCommonFormat";
import { objectName } from "./figureObjectNames";
import { FigurePolygonDraft } from "./FigurePolygonDraft";
import type { Point } from "./figureFaceGeometry";
import {
  DEFAULT_FACE_FILL,
  isFaceObject,
  nearestSnap,
  polygonToolCloses,
} from "./figureFaceSources";
import {
  addFigureTriangle,
  addPolygonFace,
  bucketFill,
  clearInnerFill,
  innerFillState,
  isTiedFace,
  movableIds,
  moveShapeHandle,
  polygonSnapCandidates,
  setInnerFill,
  shapeHandles,
  syncFigureFaces,
} from "./figureFaceEditing";
import { FIGURE_SYMBOL_GROUPS } from "./figureSymbols";
import { TEXT_BG_ATTR } from "./figureTextBackground";
import { FunctionGraphInput } from "./FunctionGraphInput";
import type { FunctionGraphConfig } from "./functionGraph";
import {
  blocksSizeChange,
  isMoveHandle,
  isShapeAttr,
  isSizeLocked,
  sizeLockState,
  sizeLockValue,
} from "./figureSizeLock";
import {
  measureTextBoxes,
  rotateFigureSelection,
  rotationBlock,
  type RotateTurn,
} from "./figureRotate";
import {
  alignBlock,
  alignFigureSelection,
  spreadBlock,
  spreadFigureSelection,
  type AlignKind,
  type SpreadAxis,
} from "./figureAlign";
import {
  mirrorBlock,
  mirrorFigureSelection,
  type MirrorAxis,
} from "./figureMirror";
import {
  figureGroupNames,
  measureOrderBoxes,
  ORDER_BLOCKED,
  ORDER_DONE,
  ORDER_NONE,
  orderBlock,
  orderFigureSelection,
  type OrderMove,
} from "./figureOrder";
import {
  FigureAlignRow,
  FigureFitRow,
  FigureOrderRow,
  FigureRotateRow,
} from "./FigureRotateRow";
import {
  arrangeSummary,
  commonSummary,
  detailSummary,
  FIGURE_PANEL_FOLDS_OPEN,
  FigurePanelFold,
  shapeSummary,
  type FigurePanelFoldName,
} from "./FigurePanelFold";
import {
  figureShortcutKeys,
  figureShortcutSheet,
  figureToolKey,
  matchFigureShortcut,
} from "./figureShortcuts";
import {
  FIGURE_TOOL_GROUPS,
  FIGURE_TOOLBAR,
  figureTool,
  figureToolGroup,
  type FigureTool,
  type FigureToolChoice,
  type FigureToolGroupName,
} from "./figureTools";
import {
  FigureToolMenu,
  TOOL_BUTTON,
  TOOL_PRESSED as PRESSED,
  toolMenuOwnsKey,
} from "./FigureToolMenu";

type Tool = FigureTool;
/** 다각형 도구가 선의 끝점·꼭짓점·교점에 달라붙는 거리(화면 px) */
const SNAP_PX = 8;
/** 노란 점이 직사각형·이등변·직각에 붙는 거리(화면 px) */
const ADJUST_SNAP_PX = 6;
const releasePointer = (element: HTMLElement | null, pointerId: number) => {
  if (element?.hasPointerCapture?.(pointerId))
    element.releasePointerCapture(pointerId);
};
/** 화면용 — 라벨의 임자 꼭짓점 표지를 걷는다(원문은 그대로 둔다). */
const withoutLabelOwner = (source: string) =>
  source.replace(/ data-p[xy]="[^"]*"/g, "");
const FIELD_NAMES: Record<string, string> = {
  x: "가로 위치",
  y: "세로 위치",
  x1: "시작 X",
  y1: "시작 Y",
  x2: "끝 X",
  y2: "끝 Y",
  cx: "중심 X",
  cy: "중심 Y",
  r: "반지름",
  rx: "가로 반지름",
  ry: "세로 반지름",
  width: "너비",
  height: "높이",
};

export function FigureEditor({
  image,
  originalImage,
  initialSvg,
  index,
  label: figureLabel,
  onSave,
  onClose,
  onRedraw,
  onEdit,
}: StudioFigureEditorProps) {
  // 작업실 도형 번호(«도형 9-1») — 머리·대화상자 이름·SVG 파일 이름이 같이 쓴다(트랙 1 이 넘김, 2026-09-19).
  const figureName = figureLabel ?? `도형 ${index + 1}`;
  const [initial] = useState(() => initialFigureSource(image, initialSvg));
  const [svg, setSvg] = useState(initial.svg);
  const [typeset, setTypeset] = useState(() => ({
    source: svg,
    rendered: svg,
    ready: !/<text[\s>]/i.test(svg),
    failed: false,
  }));
  const typesetStarted = useRef(false);
  const [typesetAttempt, setTypesetAttempt] = useState(0);
  // 끄는 동안 캔버스는 끌기 전 그림에 멈춰 두고(React 가 손대지 않는다) 바뀐 요소만 `previewFigureObjects` 로 고친다.
  const [frozenCanvas, setFrozenCanvas] = useState<string | null>(null);
  const displaySvg = useMemo(() => {
    if (frozenCanvas !== null) return frozenCanvas;
    if (typeset.source === svg) return typeset.rendered;
    try {
      // 엔진 라벨의 임자 꼭짓점(data-px·data-py)은 조판에 안 쓰인다 — 회전이 이것만 바꾼 라벨도 앞 조판본을 옮겨 쓴다.
      return carryTypeset(
        withoutLabelOwner(typeset.source),
        typeset.rendered,
        withoutLabelOwner(svg),
      );
    } catch {
      return svg;
    }
  }, [frozenCanvas, typeset, svg]);
  // React 19 는 `dangerouslySetInnerHTML` 을 **객체로** 견준다 — 렌더마다 새 객체면 선택·글자 입력 한 번에도
  // 그림 전체를 innerHTML 로 다시 넣는다. 문자열이 같으면 같은 객체를 준다.
  const canvasHtml = useMemo(() => ({ __html: displaySvg }), [displaySvg]);
  const [tool, setTool] = useState<Tool>("select");
  const [addingFunction, setAddingFunction] = useState(false);
  // 선·도형 무리의 겉에 선 도구 — 마지막에 쓴 것(원장님 2026-09-21 «안 A»). 편집기를 연 동안 기억한다.
  const [toolFaces, setToolFaces] = useState(
    () =>
      Object.fromEntries(
        FIGURE_TOOL_GROUPS.map((group) => [group.name, group.tools[0]]),
      ) as Record<FigureToolGroupName, FigureTool>,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selected = selectedIds.length === 1 ? selectedIds[0] : null;
  const setSelected = useCallback(
    (id: string | null, additive = false) =>
      setSelectedIds((previous) =>
        !id
          ? previous.length
            ? []
            : previous
          : additive
            ? previous.includes(id)
              ? previous.filter((value) => value !== id)
              : [...previous, id]
            : previous.length === 1 && previous[0] === id
              ? previous
              : [id],
      ),
    [],
  );
  const pick = useCallback(
    (id: string, additive: boolean) => {
      setSelected(id, additive);
      setTool("select");
    },
    [setSelected],
  );
  // 도구 고르기 — 도구 줄 단추·▾ 메뉴·한 글자 단축키가 모두 이 하나다. 선·도형 무리의 도구면 그 무리의 겉에 선다.
  const chooseTool = (id: FigureToolChoice) => {
    if (id === "function") {
      setSelected(null);
      setTool("select");
      setAddingFunction(true);
      return;
    }
    setAddingFunction(false);
    setTool(id);
    setDraft(null);
    if (id !== "select" && id !== "pan") setSelected(null);
    const group = figureToolGroup(id);
    if (group) setToolFaces((faces) => ({ ...faces, [group]: id }));
  };
  const [clipboardNotice, setClipboardNotice] = useState("");
  const pasteCount = useRef({ source: "", count: 0 });
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [label, setLabel] = useState("A");
  // 치수선 가운데 글자 — 고른 선·곡선 한가운데에 «뒤 선 끊기» 글자(원장님 2026-09-22 «곡선에서 바로 글자»).
  const [midLabel, setMidLabel] = useState("");
  // 채우기 통·다각형 도구가 칠할 색 — 편집기를 연 동안 기억한다.
  const [faceColor, setFaceColor] = useState(DEFAULT_FACE_FILL);
  // 다각형 도구가 그리는 중인 점들 · 마우스 자리(달라붙었나) · 화면 px/도형 단위
  const [draft, setDraft] = useState<{
    points: Point[];
    hover: Point | null;
    snapped: boolean;
    scale: number;
  } | null>(null);
  // 글자 칸 특수문자 자판에서 마지막으로 연 무리 — 편집기를 연 동안 기억한다(글자를 바꿔 골라도).
  const [symbolGroup, setSymbolGroup] = useState(FIGURE_SYMBOL_GROUPS[0].name);
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [redrawing, setRedrawing] = useState(false);
  // «요청대로 고치기»가 도는 중인가(단추 글자) · 마지막으로 고친 결과 한 줄
  const [editing, setEditing] = useState(false);
  const [editReport, setEditReport] = useState<{
    summary: string;
    rejected: string[];
    warnings: string[];
  } | null>(null);
  const redrawController = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      redrawController.current?.abort();
    },
    [],
  );
  const close = () => {
    redrawController.current?.abort();
    onClose();
  };
  const [error, setError] = useState(initial.error);
  const [sourceOverlay, setSourceOverlay] = useState(false);
  const [sourceOverlayScale, setSourceOverlayScale] = useState(1);
  const [showNumbers, setShowNumbers] = useState(true);
  // 오른쪽 칸 무리(배치·모양·틀 · 세부)의 펼침 — 편집기를 연 동안 기억한다(원장님 2026-09-21 «안 D»).
  const [folds, setFolds] = useState(FIGURE_PANEL_FOLDS_OPEN);
  const toggleFold = (name: FigurePanelFoldName) =>
    setFolds((open) => ({ ...open, [name]: !open[name] }));
  const [showSourcePanel, setShowSourcePanel] = useState(
    () =>
      !!(
        originalImage ??
        (!/^data:image\/svg|^\s*<svg/i.test(image) ? image : undefined)
      ),
  );
  const [objectNumbers, setObjectNumbers] = useState<FigureNumber[]>([]);
  const [history, setHistory] = useState<{ past: string[]; future: string[] }>({
    past: [],
    future: [],
  });
  const canvas = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const spaceDown = useRef(false);
  const pan = useRef<{
    pointerId: number;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const liveSvg = useRef(svg);
  useLayoutEffect(() => {
    liveSvg.current = svg;
  }, [svg]);
  const [available, setAvailable] = useState({ width: 560, height: 520 });
  const [selection, setSelection] = useState<{
    matrix: DOMMatrix;
    bounds: DOMRect;
    scale: number;
  } | null>(null);
  const [groupBounds, setGroupBounds] = useState<FigureGroupBounds | null>(
    null,
  );
  const drag = useRef<{
    pointerId: number;
    original: string;
    start: DOMPoint;
    transform: string;
    id?: string;
    inverse: DOMMatrix;
    multiple?: {
      id: string;
      start: DOMPoint;
      inverse: DOMMatrix;
      transform: string;
    }[];
    handle?: string;
    bounds?: DOMRect;
    moved?: boolean;
    pointer?: { clientX: number; clientY: number };
    snapAnchor?: { x: number; y: number };
    /** 끌기 전 캔버스 — 놓거나 취소하면 이것으로 되돌린 뒤 React 에 넘긴다. */
    canvas?: string;
    /** 이번 걸음에 화면에서 고친 요소 — 번호 지시선을 이것만 옮긴다. */
    ids?: string[];
    /** 조절점을 끄는 요소의 화면 px / 요소 단위 — 노란 점이 붙는 거리를 화면 px 로 잰다. */
    scale?: number;
  } | null>(null);
  const original =
    originalImage ??
    (!/^data:image\/svg|^\s*<svg/i.test(image) ? image : undefined);
  const objects = useMemo(() => figureObjects(svg), [svg]);
  // 요소 번호 — 그리는 차례가 아니라 요소에 붙은 고정 번호(원장님 2026-09-21 «순서를 바꿔도 요소 번호가 안바뀌게
  // 고정시켜»). 번호표·요소 목록·오른쪽 칸 제목·AI 자료 목록·AI 그림 번호표가 모두 이 한 함수를 읽는다.
  const numbers = useMemo(() => figureNumbers(svg), [svg]);
  // 요소 목록·묶음 차례는 번호 차례 — 맨 앞으로·맨 뒤로를 해도 목록이 제자리다(`objects` 는 그리는 차례).
  const listed = useMemo(
    () => [...objects].sort((a, b) => numbers.get(a.id)! - numbers.get(b.id)!),
    [objects, numbers],
  );
  const current = objects.find((o) => o.id === selected);
  // 선을 따라가는 면(채우기 통·안쪽 채우기)은 조절점이 없다 — 모양은 선이 정한다.
  const currentTied = !!current && isTiedFace(current);
  const currentFace = !!current && isFaceObject(current);
  const handles = useMemo(
    () =>
      current && !current.attrs["data-function"] && !isTiedFace(current)
        ? (shapeHandles(current) ?? figureHandles(current))
        : [],
    [current],
  );
  const currentAdjustable = handles.some((h) => h.adjust);
  const currentLocked = !!current && isSizeLocked(current);
  // 기울임·굵게 단추의 켜짐 — 그 글자 요소의 실제 속성(조판이 읽는 것과 같은 속성).
  const currentItalic = current?.attrs["font-style"] === "italic";
  const currentBold = isBoldWeight(current?.attrs["font-weight"]);
  const lockState = sizeLockState(objects);
  let currentFunction: FunctionGraphConfig | undefined;
  try {
    currentFunction = current?.attrs["data-function"]
      ? JSON.parse(current.attrs["data-function"])
      : undefined;
  } catch {
    /* Imported metadata may be invalid. */
  }
  const curvePoints =
    current?.type === "path" &&
    /^M[^A-Za-z]*Q[^A-Za-z]*$/i.test(current.attrs.d ?? "")
      ? current.attrs.d.match(/-?(?:\d*\.)?\d+/g)?.map(Number)
      : undefined;
  const viewBox = svg
    .match(/viewBox=["']([^"']+)/)?.[1]
    .trim()
    .split(/[\s,]+/)
    .map(Number) ?? [0, 0, 480, 360];
  const viewBoxKey = viewBox.join(" ");
  const groups = useMemo(
    () => groupFigureObjects(listed, viewBoxKey.split(" ").map(Number)),
    [listed, viewBoxKey],
  );
  // 각 표시의 종류(직각·예각·둔각) — 요소 목록 단추와 오른쪽 칸 제목이 같은 이름(`objectName`)을 쓴다.
  const angles = useMemo(
    () => figureAngleKinds(objects, viewBoxKey.split(" ").map(Number)),
    [objects, viewBoxKey],
  );
  // 요소 id → 묶음 이름(사용자가 묶은 것만) — 그림 위 번호표를 묶음마다 하나로 합치는 데 쓴다(원장님 2026-09-21).
  // AI 에게 보내는 그림은 이것을 주지 않고 번호를 매겨 요소마다 번호가 그대로 간다.
  const groupNames = useMemo(() => figureGroupNames(objects), [objects]);
  // «묶음 만들기» 직후 오른쪽 칸의 묶음 이름 칸에 초점을 줄 묶음 key — 초점을 주면 지운다.
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null);
  const clearRenaming = useCallback(() => setRenamingGroup(null), []);
  // 고른 요소가 한 묶음의 요소 전부와 정확히 같을 때만 — 오른쪽 칸에 묶음 이름·해제가 선다.
  const selectedGroup = selectedIds.length
    ? groups.find(
        (g) =>
          g.ids.length === selectedIds.length &&
          g.ids.every((id) => selectedIds.includes(id)),
      )
    : undefined;
  // 묶음 편집은 원문(`data-group`)을 고친다 — 되돌리기·저장을 같이 탄다. 목록이 memo 라 콜백은 안 바뀌게 liveSvg 로.
  const editGroups = useCallback((edit: (source: string) => string) => {
    const current = liveSvg.current;
    const next = numberFigureObjects(edit(current));
    if (next === current) return;
    setHistory((h) => ({ past: [...h.past.slice(-59), current], future: [] }));
    liveSvg.current = next;
    setSvg(next);
  }, []);
  // 옮기기(끌어 놓기) · 이름 바꾸기 · 해제("") · 자동 묶음(null) 이 모두 이 하나다.
  // 묶음이 바뀌면 자동 이름(A·B·…)을 목록 차례에 맞춰 다시 매긴다 — 같은 한 걸음에(원장님 2026-09-21).
  // 손수 지은 이름은 안 건드린다. 옮기기·이름 바꾸기·해제·자동 묶기가 모두 이 하나를 탄다.
  const regroup = (source: string, ids: string[], name: string | null) =>
    renumberAutoGroups(setFigureGroup(source, ids, name));
  const assignGroup = useCallback(
    (ids: string[], name: string | null) =>
      editGroups((source) => regroup(source, ids, name)),
    [editGroups],
  );
  // 새 묶음 — 이름은 A · B · C … 차례(원장님 2026-09-21). 단추로 만들면 이름 칸에 바로 초점을 주고,
  // 단축키(Ctrl+G)로 만들면 주지 않는다 — 초점이 글자 칸으로 가면 이어지는 단축키가 안 먹는다.
  const makeGroup = (focusName = true) => {
    if (selectedIds.length < 2) return;
    const next = regroup(
      liveSvg.current,
      selectedIds,
      nextGroupName(groups.map((g) => g.name)),
    );
    // 초점을 줄 이름은 **다시 매긴 뒤**의 것이다 — 목록에서 위에 서면 방금 만든 묶음이 A 가 된다.
    const named = figureObjects(next).find((o) => o.id === selectedIds[0])
      ?.attrs["data-group"];
    editGroups(() => next);
    if (focusName && named) setRenamingGroup(`custom:${named}`);
  };
  // 묶음 해제(Ctrl+Shift+G) — 오른쪽 칸 «묶음 해제» 단추와 같은 한 길(`data-group=""` — 묶음 밖).
  // 묶음에 든 것만 푼다 — 묶음 밖 요소까지 `data-group=""` 로 적으면 «아무 일도 안 한다»가 되돌리기 한 걸음이 된다.
  const breakGroup = () => {
    const inGroup = selectedIds.filter((id) => groupNames.has(id));
    if (inGroup.length < 2) return;
    assignGroup(inGroup, "");
  };
  /** 묶음 이름 → 그 묶음에 든 요소들. `groupNames`(요소 → 이름)의 반대쪽이다. */
  const groupMembers = useMemo(() => {
    const byName = new Map<string, string[]>();
    for (const [id, name] of groupNames)
      byName.set(name, [...(byName.get(name) ?? []), id]);
    return byName;
  }, [groupNames]);
  /**
   * 캔버스에서 이 요소를 누르면 **실제로 골라질 것들** — 묶음에 들었으면 묶음 전부다.
   *
   * 원장님 2026-09-21 «그룹을 만들었는데 별개로 움직이네. 내가 생각한 그룹이면 같이 움직일 줄
   * 알았는데». 묶음 전체 선택은 번호표(네모 A)와 오른쪽 칸의 묶음 줄에만 있었고 **캔버스 클릭은
   * 요소 하나**였다 — 묶어도 끌면 따로 갔다.
   *
   * ppt 와 같이 나눈다: **캔버스는 묶음 단위**, 속 요소 하나는 **오른쪽 요소 목록**에서 고른다
   * (`FigureObjectList` 의 요소 줄이 전부터 그 일을 한다 — 잃는 길이 없다).
   */
  const pickedWith = useCallback(
    (id: string | null | undefined): string[] => {
      if (!id) return [];
      const name = groupNames.get(id);
      const ids = name ? groupMembers.get(name) : null;
      return ids && ids.length > 1 ? ids : [id];
    },
    [groupNames, groupMembers],
  );
  const pickGroup = useCallback((ids: readonly string[], additive: boolean) => {
    setSelectedIds((previous) =>
      !additive
        ? [...ids]
        : ids.every((id) => previous.includes(id))
          ? previous.filter((id) => !ids.includes(id))
          : [...previous, ...ids.filter((id) => !previous.includes(id))],
    );
    setTool("select");
  }, []);
  const ratio = viewBox[2] / viewBox[3] || 4 / 3;
  const fittedWidth = Math.max(
    120,
    Math.min(available.width, available.height * ratio),
  );
  const commit = (source: string) => {
    // 선이 바뀌었으면 그 선을 따라가는 면도 같은 한 걸음에(되돌리기 한 번에 같이 돌아간다).
    // 새 요소(그리기·붙여넣기·AI 가 더한 것)는 이 걸음에 번호를 적는다 — 마지막 번호 다음(`numberFigureObjects`).
    const next = numberFigureObjects(syncFigureFaces(source).svg);
    if (next === svg) return;
    setHistory((h) => ({ past: [...h.past.slice(-59), svg], future: [] }));
    setSvg(next);
  };
  const undo = () => {
    const previous = history.past.at(-1);
    if (!previous) return;
    setHistory({
      past: history.past.slice(0, -1),
      future: [svg, ...history.future],
    });
    setSvg(previous);
    setSelected(null);
  };
  const redo = () => {
    const next = history.future[0];
    if (!next) return;
    setHistory({
      past: [...history.past, svg],
      future: history.future.slice(1),
    });
    setSvg(next);
    setSelected(null);
  };
  const addMiddleLabel = () => {
    const result = selected && addMidLabel(svg, selected, midLabel);
    if (!result) return;
    commit(result.svg);
    setSelected(result.id);
    setMidLabel("");
  };
  const change = (attrs: Record<string, string>, text?: string) => {
    if (!selected) return;
    // 크기 고정 — 막힌 칸에 값이 들어와도(자동 입력 등) 크기·모양은 그대로 둔다.
    if (current && blocksSizeChange(current, attrs)) return;
    commit(editFigureObject(svg, selected, attrs, text));
  };
  // 전체 요소 크기 고정 — 지금 있는 요소 전부에 한 번에(되돌리기 한 번). 일부만 고정이면 누를 때 전부 고정한다.
  const toggleLockAll = () =>
    commit(
      editFigureObjects(
        svg,
        objects.map((o) => o.id),
        sizeLockValue(lockState !== true),
      ),
    );
  // 90°·180° 회전 — 고른 것 전체가 한 덩어리로(되돌리기 한 번). 글자 상자는 화면의 조판본에서 잰다(가운데·틀 넓히기).
  // 선택은 그대로 둔다.
  const rotateBlocked = useMemo(
    () => rotationBlock(objects, selectedIds),
    [objects, selectedIds],
  );
  const selectedTextBoxes = () => {
    const root = canvas.current?.querySelector("svg");
    const texts = objects
      .filter((o) => o.type === "text" && selectedIds.includes(o.id))
      .map((o) => o.id);
    return root ? measureTextBoxes(root, texts) : undefined;
  };
  const rotate = (turn: RotateTurn) => {
    commit(
      rotateFigureSelection(svg, selectedIds, turn, {
        textBoxes: selectedTextBoxes(),
      }),
    );
  };
  // 대칭 — 고른 것 전체를 제 가운데를 지나는 세로 축(좌우)·가로 축(상하)에 비춘다(되돌리기 한 번).
  // 끌 이유는 축과 무관하다(세로·가로가 같다). AI «요청대로 고치기»의 `mirror` 와 같은 함수.
  const mirrorBlocked = useMemo(
    () => mirrorBlock(objects, selectedIds, "vertical"),
    [objects, selectedIds],
  );
  const mirror = (axis: MirrorAxis) => {
    commit(
      mirrorFigureSelection(svg, selectedIds, axis, {
        textBoxes: selectedTextBoxes(),
      }),
    );
  };
  // 정렬 — 고른 것들의 바깥 상자에 서로 맞춘다(되돌리기 한 걸음). 회전·대칭과 같은 한 엔진(figureBake).
  // 크기 고정은 막지 않는다 — 고정은 «이동만 가능»이고 정렬은 옮기기뿐이다.
  const alignBlocked = useMemo(
    () => alignBlock(objects, selectedIds, groupNames),
    [objects, selectedIds, groupNames],
  );
  const spreadBlocked = useMemo(
    () => spreadBlock(objects, selectedIds, groupNames),
    [objects, selectedIds, groupNames],
  );
  // 묶음은 한 덩어리로 움직인다(ppt 와 같다) — 상자 하나가 사각 + 이름 글자 둘인 관계도에서
  // 요소마다 따로 맞추면 글자가 상자 밖으로 빠져나간다.
  const alignOptions = () => ({
    textBoxes: selectedTextBoxes(),
    groups: groupNames,
  });
  const align = (kind: AlignKind) => {
    commit(alignFigureSelection(svg, selectedIds, kind, alignOptions()));
  };
  const spread = (axis: SpreadAxis) => {
    commit(spreadFigureSelection(svg, selectedIds, axis, alignOptions()));
  };
  // 순서 — 맨 앞으로·앞으로·뒤로·맨 뒤로(원장님 2026-09-21 «ppt 처럼», 되돌리기 한 걸음). 묶음은 한 덩어리.
  // «한 칸»은 겹치는 것 사이의 한 칸이라 캔버스에서 요소마다 상자를 잰다(figureOrder.ts). 번호가 곧 그리는
  // 차례라 옮기면 번호가 바뀐다 — 몇 번이 몇 번이 됐는지 알린다.
  const orderBlocked = useMemo(
    () => ({
      front: orderBlock(objects, selectedIds, "front"),
      back: orderBlock(objects, selectedIds, "back"),
    }),
    [objects, selectedIds],
  );
  const reorder = (move: OrderMove) => {
    if (!selectedIds.length) return;
    const blocked = orderBlock(objects, selectedIds, move);
    if (blocked) {
      setClipboardNotice(blocked === ORDER_BLOCKED.none ? "" : blocked);
      return;
    }
    const root = canvas.current?.querySelector("svg");
    const next = orderFigureSelection(svg, selectedIds, move, {
      groups: groupNames,
      boxes: root ? measureOrderBoxes(root) : undefined,
    });
    if (next === svg) {
      setClipboardNotice(ORDER_NONE[move] ?? "");
      return;
    }
    commit(next);
    // 맨 뒤로 보내면 «뒤로»·«맨 뒤로»가 바로 꺼진다 — 누른 단추에 있던 초점이 <body> 로 떨어져 이어 누른
    // Ctrl+Z 가 «편집기 밖»으로 걸러졌다(브라우저 실측 2026-09-21). 캔버스로 돌려 둔다(단축키 길과 같다).
    surface.current?.focus({ preventScroll: true });
    setClipboardNotice(
      selectedIds.length > 1
        ? `${selectedIds.length}개 요소를 ${ORDER_DONE[move]}.`
        : `${ORDER_DONE[move]}.`,
    );
  };
  // «다 보이게» — 지금 내용에 틀을 딱 맞춘다(원장님 2026-09-20). 저장할 때와 **같은 함수**를 타고,
  // 틀(viewBox·width·height)만 바꾸니 글자 크기·선 굵기·크기 고정과 무관하다. 잘린 것을 들이고
  // 남는 여백은 줄인다. 이미 맞으면 아무 일도 안 한다 — 되돌리기 자리도 안 만든다.
  const fitFrame = async () => {
    setBusy(true);
    setError("");
    try {
      const next = await fitFrameToContent(svg);
      if (next) commit(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = () => {
    if (selectedIds.length) {
      commit(removeFigureSelection(svg, selectedIds));
      setSelected(null);
    }
  };
  // 묶음 안쪽 채우기 — 여럿을 고르면 오른쪽 공통 서식 칸에 «안쪽 채우기» 줄.
  const innerFill = useMemo(
    () =>
      selectedIds.length > 1 ? innerFillState(svg, selectedIds) : undefined,
    [svg, selectedIds],
  );
  // 다각형 도구가 달라붙을 점 — 선의 끝점·꼭짓점·교점(그림이 바뀔 때만 다시 잰다).
  const snapPoints = useMemo(
    () => (tool === "polygon" ? polygonSnapCandidates(svg) : []),
    [tool, svg],
  );
  /** 그리던 다각형을 닫는다 — 겹친 점(두 번 누르기)은 하나로, 세 점이 안 되면 그대로 둔다. */
  const finishPolygon = (points: Point[]) => {
    const unique = points.filter(
      (p, i) =>
        i === 0 ||
        Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) > 1e-6,
    );
    if (
      unique.length > 3 &&
      Math.hypot(
        unique[0].x - unique.at(-1)!.x,
        unique[0].y - unique.at(-1)!.y,
      ) < 1e-6
    )
      unique.pop();
    if (unique.length < 3) return;
    const result = addPolygonFace(svg, unique, faceColor);
    commit(result.svg);
    setDraft(null);
  };
  const paste = (source: string, duplicate = false) => {
    try {
      const count =
        source === pasteCount.current.source ? pasteCount.current.count + 1 : 1;
      const result = pasteFigureSelection(
        svg,
        source,
        duplicate ? 12 : 12 * count,
      );
      if (!result) return;
      pasteCount.current = { source, count };
      commit(result.svg);
      setSelectedIds(result.ids);
      setTool("select");
      setClipboardNotice(
        `${result.ids.length}개 요소를 ${duplicate ? "복제" : "붙여넣기"}했습니다.`,
      );
    } catch {
      setClipboardNotice("붙여넣을 도형을 읽을 수 없습니다.");
    }
  };
  const nudge = (dx: number, dy: number) => {
    const root = canvas.current?.querySelector("svg"),
      matrix = root?.getScreenCTM();
    if (!root || !matrix) return;
    const origin = new DOMPoint(0, 0).matrixTransform(matrix),
      delta = new DOMPoint(dx, dy).matrixTransform(matrix);
    const updates = movableIds(svg, selectedIds).flatMap((id) => {
      const node = root.querySelector<SVGGraphicsElement>(
        `[data-object-id="${id}"]`,
      );
      const parent = (
        node?.parentElement as unknown as SVGGraphicsElement
      )?.getScreenCTM();
      if (!node || !parent) return [];
      const a = origin.matrixTransform(parent.inverse()),
        b = delta.matrixTransform(parent.inverse());
      return [
        {
          id,
          transform: `translate(${b.x - a.x} ${b.y - a.y}) ${node.getAttribute("transform") ?? ""}`,
        },
      ];
    });
    if (updates.length) commit(transformFigureSelection(svg, updates));
  };
  useLayoutEffect(() => {
    const root = canvas.current?.querySelector("svg");
    if (!root || !showNumbers) {
      setObjectNumbers((previous) => (previous.length ? [] : previous));
      return;
    }
    // 끄는 동안은 끄는 요소의 지시선만 옮기고, 놓으면(frozenCanvas 가 풀리면) 번호를 다시 배치한다 — 걸음마다
    // 요소 전부를 다시 재면(getBoundingClientRect·getTotalLength·getScreenCTM) 느린 PC 에서 한 걸음이 한참 걸린다.
    const ids = frozenCanvas !== null ? drag.current?.ids : undefined;
    if (ids)
      setObjectNumbers((previous) =>
        retargetFigureNumbers(root, previous, ids),
      );
    else setObjectNumbers(layoutFigureNumbers(root, numbers, groupNames));
  }, [
    svg,
    displaySvg,
    zoom,
    available,
    showNumbers,
    frozenCanvas,
    groupNames,
    numbers,
  ]);
  useLayoutEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const observer = new ResizeObserver(() =>
      setAvailable({
        width: node.clientWidth - 48,
        height: node.clientHeight - 48,
      }),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom((z) =>
          Math.max(0.3, Math.min(3, z * Math.exp(-e.deltaY * 0.002))),
        );
      }
    };
    const release = () => {
      spaceDown.current = false;
    };
    node.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keyup", release);
    window.addEventListener("blur", release);
    return () => {
      node.removeEventListener("wheel", wheel);
      window.removeEventListener("keyup", release);
      window.removeEventListener("blur", release);
    };
  }, []);
  useEffect(() => {
    const inEditor = (event: Event) =>
      !isTextInputEvent(event) &&
      !!surface.current
        ?.closest('[role="dialog"]')
        ?.contains(document.activeElement);
    const key = (e: KeyboardEvent) => {
      if (e.defaultPrevented || !inEditor(e) || busy || drag.current) return;
      // 열린 ▾ 메뉴(와 ▾ 의 ↑↓)는 메뉴가 받는다 — 여기서 Esc·방향키를 먼저 먹으면 선택이 풀리고 요소가 움직인다.
      if (toolMenuOwnsKey(e)) return;
      // 단축키는 표 하나(figureShortcuts.ts)에서만 읽는다 — «단축키» 도움말 목록도 같은 표를 그린다
      // (원장님 2026-09-21 «단축키도 업데이트하고»; 목록을 손으로 적어 Ctrl+G 가 빠졌었다).
      // C/X/V 는 표에 있지만 여기서 안 읽는다 — 브라우저 clipboard 이벤트로 받아 OS 클립보드와 맞춘다.
      const shortcut = matchFigureShortcut(e);
      if (!shortcut) return;
      const drawing = tool === "polygon" ? draft : null;
      switch (shortcut.id) {
        case "undo":
          e.preventDefault();
          undo();
          return;
        case "redo":
          e.preventDefault();
          redo();
          return;
        case "selectAll":
          e.preventDefault();
          setSelectedIds(objects.map((o) => o.id));
          setTool("select");
          return;
        case "duplicate": {
          e.preventDefault();
          const source = copyFigureSelection(svg, selectedIds);
          if (source) paste(source, true);
          return;
        }
        case "group":
        case "ungroup":
          // 묶기(Ctrl+G)·묶음 해제(Ctrl+Shift+G) — 원장님 2026-09-21 «ppt 명령어».
          // 크롬의 «찾기 다음»이 Ctrl+G 라 반드시 막는다. 고른 것이 둘 미만이면 아무 일도 안 한다.
          e.preventDefault();
          if (shortcut.id === "ungroup") breakGroup();
          else makeGroup(false);
          // 묶으면 요소 목록이 다시 그려져 **눌렀던 요소 단추가 사라진다** — 초점이 <body> 로 떨어져
          // 바로 이어 누른 Ctrl+Shift+G 가 «편집기 안»이 아니라고 걸러졌다(브라우저 실측 2026-09-21).
          // jsdom 은 클릭으로 초점이 옮겨지지 않아 이 자리가 안 보인다. 캔버스로 초점을 돌려 둔다.
          surface.current?.focus();
          return;
        case "front":
        case "forward":
        case "backward":
        case "back":
          // 순서 — ppt 와 같다(원장님 2026-09-21). 맥 크롬의 Cmd+[ 는 «뒤로 가기»라 반드시 막는다.
          e.preventDefault();
          reorder(shortcut.id);
          // 차례가 바뀌면 요소 목록 단추가 다시 놓인다 — 옮겨진 단추에 있던 초점이 <body> 로 떨어지면
          // 이어 누른 단축키가 «편집기 안»이 아니라고 걸러진다(Ctrl+G 와 같은 자리). 캔버스로 돌려 둔다.
          surface.current?.focus();
          return;
        case "finish":
          // 그리던 다각형을 닫는다 — 그리는 중이 아니면 Enter 를 가로채지 않는다(초점 단추가 눌려야 한다)
          if (!drawing) return;
          e.preventDefault();
          finishPolygon(drawing.points);
          return;
        case "cancel":
          // 그리던 다각형은 버리고(편집기를 닫거나 도구를 풀지 않게), 아니면 선택 해제·도구 풀기
          if (drawing) {
            e.preventDefault();
            e.stopPropagation();
            setDraft(null);
            return;
          }
          if (selectedIds.length || tool !== "select") {
            e.preventDefault();
            e.stopPropagation();
            setSelected(null);
            setTool("select");
          }
          return;
        case "pan":
          // 캔버스에 초점이 있을 때만 — 단추에 초점이 있으면 Space 는 그 단추를 누른다
          if (surface.current?.contains(document.activeElement)) {
            e.preventDefault();
            spaceDown.current = true;
          }
          return;
        case "delete":
          e.preventDefault();
          remove();
          return;
        case "nudge": {
          if (!selectedIds.length) return;
          const directions: Record<string, [number, number]> = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
          };
          e.preventDefault();
          const [x, y] = directions[e.key],
            step = e.shiftKey ? 10 : 1;
          nudge(x * step, y * step);
          return;
        }
        default:
          // 도구 한 글자(원장님 2026-09-21 «두다») — 도구 단추를 누른 것과 같다. 초점은 그대로 둔다.
          if (shortcut.tool) {
            e.preventDefault();
            chooseTool(shortcut.tool);
          }
      }
    };
    const copy = (event: ClipboardEvent) => {
      if (!inEditor(event) || busy || drag.current || !event.clipboardData)
        return;
      const source = copyFigureSelection(svg, selectedIds);
      if (!source) return;
      event.preventDefault();
      event.clipboardData.setData(FIGURE_CLIPBOARD_TYPE, source);
      event.clipboardData.setData("text/plain", source);
      setClipboardNotice(
        `${selectedIds.length}개 요소를 ${event.type === "cut" ? "잘라냈" : "복사했"}습니다.`,
      );
      if (event.type === "cut") remove();
    };
    const onPaste = (event: ClipboardEvent) => {
      if (!inEditor(event) || busy || drag.current || !event.clipboardData)
        return;
      const source =
        event.clipboardData.getData(FIGURE_CLIPBOARD_TYPE) ||
        event.clipboardData.getData("image/svg+xml") ||
        event.clipboardData.getData("text/plain");
      event.preventDefault();
      if (/^\s*<svg\b/i.test(source)) paste(source);
      else setClipboardNotice("도형 요소를 복사한 뒤 붙여넣어 주세요.");
    };
    window.addEventListener("keydown", key, true);
    document.addEventListener("copy", copy);
    document.addEventListener("cut", copy);
    document.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", key, true);
      document.removeEventListener("copy", copy);
      document.removeEventListener("cut", copy);
      document.removeEventListener("paste", onPaste);
    };
  });
  useLayoutEffect(() => {
    const root = canvas.current?.querySelector("svg");
    const node = root?.querySelector<SVGGraphicsElement>(
      `[data-object-id="${selected}"]`,
    );
    const rootMatrix = root?.getScreenCTM?.(),
      matrix = node?.getScreenCTM?.();
    if (!rootMatrix || !matrix || !node) {
      setSelection(null);
      return;
    }
    setSelection({
      matrix: rootMatrix.inverse().multiply(matrix),
      bounds: node.getBBox(),
      scale: Math.hypot(rootMatrix.a, rootMatrix.b),
    });
  }, [svg, displaySvg, selected, zoom, available]);
  useLayoutEffect(() => {
    const root = canvas.current?.querySelector("svg");
    setGroupBounds(
      root && selectedIds.length > 1
        ? figureGroupBounds(root, selectedIds)
        : null,
    );
  }, [svg, displaySvg, selectedIds, zoom, available]);
  useEffect(() => {
    if (frozenCanvas !== null) return; // 끄는 동안은 조판하지 않는다 — 놓은 뒤 한 번.
    let active = true;
    const timer = setTimeout(
      () => {
        void typesetFigureSvg(svg, true)
          .then((result) => {
            if (active) {
              typesetStarted.current = true;
              setTypeset({
                source: svg,
                rendered: result,
                ready: true,
                failed: false,
              });
            }
          })
          .catch((e) => {
            if (active) {
              setError((e as Error).message);
              setTypeset((previous) => ({ ...previous, failed: true }));
            }
          });
      },
      typesetStarted.current ? 350 : 0,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [svg, frozenCanvas, typesetAttempt]);
  const point = (e: { clientX: number; clientY: number }, inverse: DOMMatrix) =>
    new DOMPoint(e.clientX, e.clientY).matrixTransform(inverse);
  const selectionDrag = (
    root: SVGSVGElement,
    ids: readonly string[],
    e: React.PointerEvent,
  ) =>
    movableIds(svg, ids).flatMap((id) => {
      const node = root.querySelector<SVGGraphicsElement>(
        `[data-object-id="${id}"]`,
      );
      const parent = (
        node?.parentElement as unknown as SVGGraphicsElement
      )?.getScreenCTM();
      if (!node || !parent) return [];
      const inverse = parent.inverse();
      return [
        {
          id,
          inverse,
          start: point(e, inverse),
          transform: node.getAttribute("transform") ?? "",
        },
      ];
    });
  const down = (e: React.PointerEvent, hitTarget?: SVGGraphicsElement) => {
    if (
      busy ||
      e.button !== 0 ||
      e.isPrimary === false ||
      drag.current ||
      pan.current
    )
      return;
    surface.current?.focus({ preventScroll: true });
    const root = canvas.current?.querySelector("svg");
    if (!root) return;
    const target =
      hitTarget ??
      (e.target as Element).closest<SVGGraphicsElement>("[data-object-id]") ??
      hitFigureObject(root, e.clientX, e.clientY);
    const matrix =
      (tool === "select" && target
        ? (
            target.parentElement as unknown as SVGGraphicsElement
          ).getScreenCTM?.()
        : root.getScreenCTM()) ?? root.getScreenCTM();
    if (!matrix) return;
    const inverse = matrix.inverse();
    const start = point(e, inverse);
    if (tool === "select") {
      const id = target?.getAttribute("data-object-id");
      // 묶음에 든 것을 캔버스에서 누르면 **묶음 전부**가 골라진다(ppt 와 같다).
      const together = pickedWith(id);
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        if (together.length) pickGroup(together, true);
        else setSelected(null, true);
        e.preventDefault();
        return;
      }
      // 이미 골라 둔 것 안을 누르면 그 선택을 그대로 둔다 — 오른쪽 요소 목록에서 묶음 속
      // 하나만 골라 두었을 수 있고, 그 뜻을 캔버스 클릭이 덮으면 안 된다.
      if (!id) setSelected(null);
      else if (!selectedIds.includes(id)) pickGroup(together, false);
      if (!target) return;
      // 선을 따라가는 면은 골라지기만 한다 — 옮기면 선에서 떨어진다(선을 옮기면 따라온다).
      if (
        isTiedFace({
          attrs: { "data-face": target.getAttribute("data-face") ?? "" },
        })
      ) {
        e.preventDefault();
        return;
      }
      drag.current = {
        pointerId: e.pointerId,
        original: svg,
        start,
        inverse,
        id: target.getAttribute("data-object-id")!,
        transform: target.getAttribute("transform") ?? "",
      };
      // 같이 끌 것 — 골라 둔 것 안을 눌렀으면 그 선택, 아니면 **누른 것의 묶음**.
      // 묶음은 방금 골라져 `selectedIds` 가 아직 낡았으므로 여기서 직접 센다 — 그래야 누르고
      // 끄는 **한 동작**에 묶음이 통째로 간다(원장님 2026-09-21 «같이 움직일 줄 알았는데»).
      const dragIds = id && selectedIds.includes(id) ? selectedIds : together;
      if (dragIds.length > 1) {
        drag.current.multiple = selectionDrag(root, dragIds, e);
      }
    } else if (tool === "text") {
      const result = addFigureObject(svg, "text", start, start, label);
      commit(result.svg);
      setSelected(result.id);
      setTool("select");
      return;
    } else if (tool === "fill") {
      // 채우기 통 — 누른 칸에 면(선 뒤에), 칠한 면이면 색만. 칸이 없으면 안내만 하고 아무것도 안 만든다.
      const result = bucketFill(svg, { x: start.x, y: start.y }, faceColor);
      setClipboardNotice(result.notice ?? "");
      if (!result.notice) commit(result.svg);
      e.preventDefault();
      return;
    } else if (tool === "polygon") {
      // 다각형(면) — 점을 차례로. 선의 끝점·꼭짓점·교점에 달라붙고, 첫 점을 다시 누르면 닫는다.
      const scale = Math.hypot(matrix.a, matrix.b) || 1;
      const raw = { x: start.x, y: start.y };
      const at = nearestSnap(raw, snapPoints, SNAP_PX / scale) ?? raw;
      if (draft && polygonToolCloses(draft.points, at, SNAP_PX / scale))
        finishPolygon(draft.points);
      else
        setDraft({
          points: [...(draft?.points ?? []), { x: at.x, y: at.y }],
          hover: null,
          snapped: false,
          scale,
        });
      e.preventDefault();
      return;
    } else {
      drag.current = {
        pointerId: e.pointerId,
        original: svg,
        start,
        inverse,
        transform: "",
        snapAnchor:
          tool === "line" || tool === "arrow"
            ? { x: e.clientX, y: e.clientY }
            : undefined,
      };
    }
    e.preventDefault();
    surface.current?.setPointerCapture(e.pointerId);
  };
  const groupDown = (e: React.PointerEvent, border: boolean) => {
    if (
      busy ||
      e.button !== 0 ||
      e.isPrimary === false ||
      drag.current ||
      pan.current ||
      tool !== "select"
    )
      return;
    const root = canvas.current?.querySelector("svg");
    const matrix = root?.getScreenCTM();
    if (!root || !matrix) return;
    if (!border) {
      // Preserve ordinary picking through the empty-space drag surface, including
      // filled shapes and rendered math nested inside an SVG group.
      const hit =
        document
          .elementsFromPoint?.(e.clientX, e.clientY)
          .map((node) => node.closest<SVGGraphicsElement>("[data-object-id]"))
          .find((node) => node && root.contains(node)) ??
        hitFigureObject(root, e.clientX, e.clientY);
      if (
        hit &&
        (!selectedIds.includes(hit.getAttribute("data-object-id")!) ||
          e.shiftKey ||
          e.ctrlKey ||
          e.metaKey)
      ) {
        down(e, hit);
        return;
      }
    }
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      pickGroup(selectedIds, true);
      e.preventDefault();
      return;
    }
    const multiple = selectionDrag(root, selectedIds, e);
    if (!multiple.length) return;
    const inverse = matrix.inverse();
    drag.current = {
      pointerId: e.pointerId,
      original: svg,
      start: point(e, inverse),
      inverse,
      transform: "",
      multiple,
    };
    surface.current?.focus({ preventScroll: true });
    surface.current?.setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDown = (e: React.PointerEvent, handle: string) => {
    if (
      busy ||
      e.button !== 0 ||
      e.isPrimary === false ||
      drag.current ||
      pan.current ||
      !selected ||
      !selection
    )
      return;
    if (currentLocked && !isMoveHandle(handle)) return;
    surface.current?.focus({ preventScroll: true });
    const node = canvas.current?.querySelector<SVGGraphicsElement>(
      `[data-object-id="${selected}"]`,
    );
    const matrix = node?.getScreenCTM();
    if (!matrix) return;
    const inverse = matrix.inverse();
    drag.current = {
      pointerId: e.pointerId,
      original: svg,
      start: point(e, inverse),
      inverse,
      id: selected,
      handle,
      transform: current?.attrs.transform ?? "",
      bounds: selection.bounds,
      scale: Math.hypot(matrix.a, matrix.b) || 1,
      // Snap in screen coordinates so rotated/transformed imported lines obey
      // the same visible directions as newly drawn lines.
      snapAnchor:
        current?.type === "line" && (handle === "start" || handle === "end")
          ? new DOMPoint(
              Number(current.attrs[handle === "start" ? "x2" : "x1"]) || 0,
              Number(current.attrs[handle === "start" ? "y2" : "y1"]) || 0,
            ).matrixTransform(matrix)
          : undefined,
    };
    e.preventDefault();
    e.stopPropagation();
    surface.current?.setPointerCapture(e.pointerId);
  };
  const move = (e: { clientX: number; clientY: number; shiftKey: boolean }) => {
    const d = drag.current;
    if (!d) {
      // 그리던 다각형 — 마지막 점에서 마우스까지 잇고, 달라붙을 점 근처면 그 점을 보여 준다.
      const matrix =
        tool === "polygon" && draft
          ? canvas.current?.querySelector("svg")?.getScreenCTM()
          : null;
      if (draft && matrix) {
        const raw = point(e, matrix.inverse());
        const at = nearestSnap(
          { x: raw.x, y: raw.y },
          snapPoints,
          SNAP_PX / draft.scale,
        );
        setDraft({
          ...draft,
          hover: at ?? { x: raw.x, y: raw.y },
          snapped: !!at,
        });
      }
      return;
    }
    if (d.snapAnchor && !d.id) {
      // Adding the first object can resize the fitted canvas (the object list
      // gains a row). Resolve the live transform so release follows the pointer.
      const matrix = canvas.current?.querySelector("svg")?.getScreenCTM();
      if (matrix) {
        d.inverse = matrix.inverse();
        d.snapAnchor = d.start.matrixTransform(matrix);
      }
    }
    d.pointer = { clientX: e.clientX, clientY: e.clientY };
    const snapped =
      e.shiftKey && d.snapAnchor
        ? snapFigurePoint(d.snapAnchor, { x: e.clientX, y: e.clientY })
        : null;
    const to = snapped
      ? new DOMPoint(snapped.x, snapped.y).matrixTransform(d.inverse)
      : point(e, d.inverse);
    if (Math.hypot(to.x - d.start.x, to.y - d.start.y) < 0.5 && !d.moved)
      return;
    if (!d.moved) {
      d.canvas = displaySvg;
      setFrozenCanvas(displaySvg);
    }
    d.moved = true;
    let next: string;
    let ids = d.multiple ? d.multiple.map((item) => item.id) : [d.id ?? ""];
    if (d.multiple) {
      next = transformFigureSelection(
        d.original,
        d.multiple.map((item) => {
          const p = point(e, item.inverse);
          return {
            id: item.id,
            transform: `translate(${p.x - item.start.x} ${p.y - item.start.y}) ${item.transform}`,
          };
        }),
      );
    } else if (d.id && d.handle?.startsWith("resize-") && d.bounds) {
      const b = d.bounds,
        index = Number(d.handle.slice(-1));
      const opposite = [
        [b.x + b.width, b.y + b.height],
        [b.x, b.y + b.height],
        [b.x, b.y],
        [b.x + b.width, b.y],
      ][index];
      let sx = Math.max(
        0.02,
        (to.x - opposite[0]) / (d.start.x - opposite[0] || 1),
      );
      let sy = Math.max(
        0.02,
        (to.y - opposite[1]) / (d.start.y - opposite[1] || 1),
      );
      if (e.shiftKey) sx = sy = Math.max(sx, sy);
      next = editFigureObject(d.original, d.id, {
        transform: `${d.transform} translate(${opposite[0]} ${opposite[1]}) scale(${sx} ${sy}) translate(${-opposite[0]} ${-opposite[1]})`,
      });
    } else if (d.id && d.handle)
      // 노란 점·평행사변형·삼각형의 모서리는 모양 계산으로, 나머지(사각형 모서리 포함)는 예전 조절점 그대로.
      next =
        moveShapeHandle(
          d.original,
          d.id,
          d.handle,
          to,
          ADJUST_SNAP_PX / (d.scale ?? 1),
        ) ?? moveFigureHandle(d.original, d.id, d.handle, to);
    else if (d.id) {
      let dx = to.x - d.start.x,
        dy = to.y - d.start.y;
      if (e.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      next = editFigureObject(d.original, d.id, {
        transform: `translate(${dx} ${dy}) ${d.transform}`,
      });
    } else {
      const added =
        tool === "triangle"
          ? addFigureTriangle(d.original, d.start, to)
          : addFigureObject(d.original, tool, d.start, to, label);
      next = added.svg;
      ids = [added.id];
      setSelected(added.id);
    }
    // 옮긴 선을 경계로 쓰는 면도 이 걸음에 같이 — 화면도 그 면까지 고친다.
    const synced = syncFigureFaces(next, ids);
    next = synced.svg;
    ids = [...ids, ...synced.changed];
    const root = canvas.current?.querySelector("svg");
    if (root) previewFigureObjects(root, next, ids);
    d.ids = ids;
    liveSvg.current = next;
    setSvg(next);
  };
  // React 가 아는 캔버스(끌기 전 그림)로 되돌려 놓고 푼다 — 끝 그림이 끌기 전과 같으면 React 는 캔버스에 손대지 않는다.
  const releaseCanvas = (d: typeof drag.current) => {
    if (d?.canvas !== undefined && canvas.current)
      canvas.current.innerHTML = d.canvas;
    setFrozenCanvas(null);
  };
  const up = (event: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.pointerId !== event.pointerId) return;
    if (d.moved && d.pointer) move({ ...d.pointer, shiftKey: event.shiftKey });
    drag.current = null;
    releaseCanvas(d);
    releasePointer(surface.current, d.pointerId);
    if (d?.moved && d.original !== liveSvg.current) {
      // 끌어 그린 새 요소도 놓는 걸음에 번호를 적는다(다른 편집은 `commit` 이 적는다)
      const numbered = numberFigureObjects(liveSvg.current);
      if (numbered !== liveSvg.current) {
        liveSvg.current = numbered;
        setSvg(numbered);
      }
      setHistory((h) => ({
        past: [...h.past.slice(-59), d.original],
        future: [],
      }));
      setTool("select");
    }
  };
  const cancel = (event: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.pointerId !== event.pointerId) return;
    drag.current = null;
    liveSvg.current = d.original;
    setSvg(d.original);
    releaseCanvas(d);
    releasePointer(surface.current, d.pointerId);
  };
  const finishPan = (event: React.PointerEvent) => {
    const p = pan.current;
    if (!p || p.pointerId !== event.pointerId) return;
    pan.current = null;
    releasePointer(viewport.current, p.pointerId);
  };
  useEffect(() => {
    const modifier = (event: KeyboardEvent | Event) => {
      if (!drag.current?.pointer) return;
      if (event.type !== "blur" && (event as KeyboardEvent).key !== "Shift")
        return;
      move({ ...drag.current.pointer, shiftKey: event.type === "keydown" });
    };
    window.addEventListener("keydown", modifier);
    window.addEventListener("keyup", modifier);
    window.addEventListener("blur", modifier);
    return () => {
      window.removeEventListener("keydown", modifier);
      window.removeEventListener("keyup", modifier);
      window.removeEventListener("blur", modifier);
    };
  });
  const regenerate = async () => {
    if (!original || busy || !onRedraw) return;
    const controller = new AbortController();
    redrawController.current = controller;
    setBusy(true);
    setRedrawing(true);
    setError("");
    setEditReport(null);
    try {
      const result = await onRedraw({
        originalImage: original,
        // 요소 번호는 편집기 안의 표지 — 새로 그려 달라는 AI 에게는 안 보낸다(베껴 오면 번호가 겹친다)
        svg: withoutFigureNumbers(cleanFigureForSave(svg)),
        instructions,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      const next = prepareFigureSvg(result.svg);
      if (!figureObjects(next).length)
        throw new Error("편집할 도형 요소가 없는 결과입니다.");
      commit(next);
      setSelected(null);
      if (result.warnings?.length)
        setError(`원본과 비교해 주세요: ${result.warnings.join(" / ")}`);
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        setRedrawing(false);
        redrawController.current = null;
      }
    }
  };
  // «요청대로 고치기»(원장님 2026-09-19) — 지금 그림을 새로 그리지 않는다. AI 가 돌려준 수정 명령만 편집기 편집 함수로
  // 적용해 한 걸음으로 넘긴다(되돌리기 한 번). 명령의 좌표·점 이름은 요청을 보낼 때의 그림 기준이라, 기다리는 동안
  // 그림이 바뀌면 적용하지 않는다. 번호는 고정이라(`figureNumbers`) 순서를 바꾸거나 면을 만들어도 안 밀린다.
  const requestEdit = async () => {
    if (!onEdit || busy || !instructions.trim()) return;
    const controller = new AbortController();
    redrawController.current = controller;
    const sent = svg;
    setBusy(true);
    setRedrawing(true);
    setEditing(true);
    setError("");
    setEditReport(null);
    try {
      const root = canvas.current?.querySelector("svg");
      const imageDataUrl = await buildFigureEditSnapshot({
        original,
        figureSvg: await typesetFigureSvg(cleanFigureForSave(sent)),
        width: root?.clientWidth || viewBox[2],
        height: root?.clientHeight || viewBox[3],
        // 그림 위 번호표는 AI 자료 목록(`describeFigureForEdit` 의 n)과 **같은 고정 번호**라야 한다 —
        // 어긋나면 AI 가 딴 요소를 고친다(지시문 figure-edit-prompt.ts «번호가 그림 위 번호표와 같다»).
        numbers: root ? layoutFigureNumbers(root, figureNumbers(sent)) : [],
      });
      if (controller.signal.aborted) return;
      const result = await onEdit({
        imageDataUrl,
        figure: describeFigureForEdit(sent),
        instructions,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (liveSvg.current !== sent)
        throw new Error(
          "요청을 보낸 뒤 그림이 바뀌어 적용하지 않았습니다. 다시 요청해 주세요.",
        );
      // 순서 명령의 «한 칸»은 단추처럼 화면 상자로 겹치는 것만 센다 — 캔버스는 아직 보낸 그림(`sent`)을 보인다
      const shown = canvas.current?.querySelector("svg");
      const edited = applyFigureEdits(sent, result.edits, {
        boxes: shown ? measureOrderBoxes(shown) : undefined,
      });
      commit(edited.svg);
      if (edited.svg !== sent) setSelected(null);
      setEditReport({
        summary: edited.summary,
        rejected: edited.rejected,
        warnings: result.warnings ?? [],
      });
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        setRedrawing(false);
        setEditing(false);
        redrawController.current = null;
      }
    }
  };
  // 저장·내려받기가 내보내는 그림. 오른쪽 칸 «다 보이게»(fitFrameToContent)가 **같은 이 함수**를 탄다 —
  // 규칙이 갈리면 «단추를 눌러 본 모습»과 «저장한 모습»이 달라진다(원장님 2026-09-20).
  const output = () => renderFittedFigure(svg);
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const rendered = await output();
      onSave(createFigureSaveResult(svg, rendered, original));
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <ModalShell
      onClose={busy && !redrawing ? () => {} : close}
      aria-label={`${figureName} 편집기`}
    >
      <style>{`#figure-editor-canvas > svg { width:100% !important; height:100% !important; max-width:none !important; max-height:none !important; margin:0 !important; display:block; }
      #figure-editor-canvas [data-object-id] { cursor:inherit; }`}</style>
      <header className={styles.header}>
        <span className="rounded bg-[var(--figure-accent-soft)] text-[var(--figure-accent-ink)] px-2 py-1 text-xs font-semibold">
          {figureName}
        </span>
        <h2 className="text-lg font-semibold">도형 편집</h2>
        <button
          type="button"
          aria-expanded={showSourcePanel}
          onClick={() => setShowSourcePanel((value) => !value)}
          className="rounded border border-control px-2 py-1 text-xs whitespace-nowrap hover:bg-slate-50"
        >
          {showSourcePanel
            ? "원본 패널 접기"
            : onRedraw || onEdit
              ? "원본·AI 요청"
              : "원본 보기"}
        </button>
        <div className="ml-auto flex gap-2">
          <Btn
            kind="ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const url = URL.createObjectURL(
                  new Blob([await output()], { type: "image/svg+xml" }),
                );
                const link = document.createElement("a");
                link.href = url;
                link.download = `${figureName.replace(/\s+/g, "-")}.svg`;
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            SVG 저장
          </Btn>
          <Btn kind="ghost" onClick={close} disabled={busy && !redrawing}>
            취소
          </Btn>
          <Btn kind="accent" onClick={save} disabled={busy || !objects.length}>
            도형 적용
          </Btn>
        </div>
      </header>
      {error && (
        <p
          role="alert"
          className="border-b border-control px-5 py-2 text-sm text-g-red-text"
        >
          {error}
        </p>
      )}
      <div className={styles.body}>
        {showSourcePanel && (
          <aside className={styles.source}>
            <h3 className="text-sm font-semibold mb-3">분리한 원본</h3>
            {original ? (
              <img
                src={original}
                alt="도형 원본"
                className="w-full h-auto bg-white border border-control"
              />
            ) : (
              <p className="text-sm text-muted">원본 크롭이 없습니다.</p>
            )}
            {(onRedraw || onEdit) && (
              <>
                <label className="block mt-4 text-sm font-semibold">
                  AI 수정 요청
                  <textarea
                    aria-label="도형 AI 수정 요청"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="예: 손글씨를 지우고, 점 A의 라벨을 위로 옮겨 주세요."
                    className="mt-2 w-full min-h-24 p-2 text-sm font-normal rounded border border-control bg-white"
                  />
                </label>
                {onEdit && (
                  <Btn
                    kind="accent"
                    onClick={requestEdit}
                    disabled={busy || !instructions.trim()}
                    className="mt-2 w-full"
                  >
                    {editing ? "처리 중…" : "요청대로 고치기"}
                  </Btn>
                )}
                {/* 주 단추가 있으면 다시 그리기는 작은 글자 단추 — 처음 결과가 크게 틀렸을 때만(원장님 2026-09-19) */}
                {onRedraw &&
                  (onEdit ? (
                    <button
                      type="button"
                      onClick={regenerate}
                      disabled={busy || !original}
                      className="mt-2 w-full rounded border border-control px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                    >
                      {redrawing && !editing
                        ? "처리 중…"
                        : "원본으로 다시 그리기"}
                    </button>
                  ) : (
                    <Btn
                      kind="accent"
                      onClick={regenerate}
                      disabled={busy || !original || !onRedraw}
                      className="mt-2 w-full"
                    >
                      {busy ? "처리 중…" : "원본으로 다시 그리기"}
                    </Btn>
                  ))}
                <p className="text-xs text-muted mt-3">
                  {onEdit
                    ? "요청대로 고치기는 요청한 곳만 바꿉니다. 다시 그리기는 그림 전체를 새로 그립니다. 되돌리기로 이전 그림을 복원할 수 있습니다."
                    : "다시 그리기는 현재 편집본을 바꿉니다. 되돌리기로 이전 결과를 복원할 수 있습니다."}
                </p>
                {editReport && (
                  <div
                    role="status"
                    aria-label="요청대로 고친 결과"
                    className="mt-3 rounded border border-control bg-white p-2 text-xs"
                  >
                    <p className="font-semibold">{editReport.summary}</p>
                    {editReport.rejected.length > 0 && (
                      <p className="mt-1 text-g-red-text">
                        적용 못 함 — {editReport.rejected.join(" · ")}
                      </p>
                    )}
                    {editReport.warnings.length > 0 && (
                      <p className="mt-1 text-muted">
                        {editReport.warnings.join(" / ")}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
            <label className="flex items-center gap-2 mt-4 text-sm">
              <input
                type="checkbox"
                checked={sourceOverlay}
                onChange={(e) => setSourceOverlay(e.target.checked)}
                disabled={!original}
              />
              원본을 흐리게 겹쳐 보기
            </label>
            {sourceOverlay && original && (
              <div className="mt-3 rounded-lg border border-[var(--figure-accent-line)] bg-[var(--figure-accent-soft)] p-3">
                <label className="block text-xs font-medium text-[var(--figure-accent-ink)]">
                  <span className="flex items-center justify-between">
                    <span>원본 크기</span>
                    <output>{Math.round(sourceOverlayScale * 100)}%</output>
                  </span>
                  <input
                    type="range"
                    min={0.3}
                    max={1.8}
                    step={0.05}
                    value={sourceOverlayScale}
                    aria-label="겹쳐 보는 원본 크기"
                    onChange={(e) =>
                      setSourceOverlayScale(Number(e.target.value))
                    }
                    className="mt-2 w-full accent-[var(--figure-primary)]"
                  />
                </label>
                <div className="mt-1 flex justify-between text-[11px] text-[var(--figure-accent-ink)]">
                  <span>작게</span>
                  <button
                    type="button"
                    onClick={() => setSourceOverlayScale(1)}
                    className="rounded px-1.5 py-0.5 hover:bg-[var(--figure-accent-soft)]"
                  >
                    100%로 복원
                  </button>
                  <span>크게</span>
                </div>
              </div>
            )}
          </aside>
        )}
        <div className={styles.workspace}>
          <div
            className={`${styles.toolbar} flex flex-wrap gap-1 p-2 border-b bg-white`}
            role="toolbar"
            aria-label="도형 편집 도구"
          >
            {/* 선·도형은 나눈 단추(겉 = 마지막에 쓴 도구, ▾ = 무리의 도구) — 원장님 2026-09-21 «안 A».
                나머지는 따로 선다. 도구 이름·차례는 figureTools.ts, 글자는 단축키 표(figureShortcuts.ts). */}
            {FIGURE_TOOLBAR.map((entry) => {
              if (entry.kind === "group")
                return (
                  <FigureToolMenu
                    key={entry.name}
                    name={entry.name}
                    tools={
                      FIGURE_TOOL_GROUPS.find((g) => g.name === entry.name)!
                        .tools
                    }
                    face={toolFaces[entry.name]}
                    active={addingFunction ? null : tool}
                    disabled={busy}
                    onChoose={chooseTool}
                  />
                );
              const t = figureTool(entry.id);
              const on =
                t.id === "function"
                  ? addingFunction
                  : !addingFunction && tool === t.id;
              return (
                <button
                  type="button"
                  key={t.id}
                  aria-label={t.label}
                  aria-pressed={on}
                  title={`${t.label} (${figureToolKey(t.id)})`}
                  onClick={() => chooseTool(t.id)}
                  disabled={busy}
                  className={`${TOOL_BUTTON} ${on ? PRESSED : "hover:bg-side"}`}
                >
                  <span aria-hidden="true" className="text-base mr-1">
                    {t.glyph}
                  </span>
                  {t.label}
                </button>
              );
            })}
            <button
              type="button"
              title="Delete / Backspace"
              onClick={remove}
              disabled={!selectedIds.length || busy}
              className="px-2 text-xs disabled:opacity-40"
            >
              삭제
            </button>
            <span className="mx-1 border-l border-control" />
            <button
              type="button"
              title={`${modKey()}+Z`}
              onClick={undo}
              disabled={!history.past.length || busy}
              className="px-2 text-xs disabled:opacity-40"
            >
              ↶ 되돌리기
            </button>
            <button
              type="button"
              title={`${modKey()}+Y / ${modKey()}+Shift+Z`}
              onClick={redo}
              disabled={!history.future.length || busy}
              className="px-2 text-xs disabled:opacity-40"
            >
              ↷ 다시 실행
            </button>
            <span className="mx-1 border-l border-control" />
            {/* 일부만 고정이면 aria-pressed="mixed" — 눌림 모양은 전부 고정일 때만, 몇 개인지는 title 로. */}
            <button
              type="button"
              aria-pressed={lockState}
              title={`고정 ${objects.filter(isSizeLocked).length}개 / 전체 ${objects.length}개`}
              onClick={toggleLockAll}
              disabled={!objects.length || busy}
              className={`px-2 py-1.5 text-xs rounded disabled:opacity-40 ${lockState === true ? PRESSED : "enabled:hover:bg-side"}`}
            >
              전체 요소 크기 고정 (이동만 가능)
            </button>
            <details className="relative ml-auto text-xs">
              <summary className="cursor-pointer rounded px-2 py-1.5 hover:bg-slate-100">
                단축키
              </summary>
              {/* 처리기와 같은 표(figureShortcuts.ts)에서 그린다 — 단축키를 더하면 목록이 저절로 따라온다.
                  무리(편집·선택·이동·그리기·순서·묶음)마다 한 덩이, 한 항목은 줄에서 안 쪼갠다. */}
              <div
                aria-label="단축키 목록"
                className="absolute right-0 top-full z-20 w-[26rem] rounded-lg border border-control bg-white p-3 shadow-lg leading-6"
              >
                {figureShortcutSheet().map((group) => (
                  <div key={group.name} className="mt-1.5 first:mt-0">
                    <div className="text-[11px] font-semibold text-muted">
                      {group.name}
                    </div>
                    <div className="flex flex-wrap gap-x-3">
                      {group.items.map((item) => (
                        <span key={item.id} className="whitespace-nowrap">
                          {figureShortcutKeys(item, modKey())} {item.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="mt-1.5 text-muted">
                  글자·수식 입력 중에는 입력창의 단축키가 동작합니다.
                </p>
              </div>
            </details>
          </div>
          <div className={styles.viewControls}>
            <button
              type="button"
              aria-label="도형 축소"
              onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
            >
              −
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              aria-label="도형 확대"
              onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
            >
              ＋
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPanOffset({ x: 0, y: 0 });
                viewport.current?.scrollTo(0, 0);
              }}
            >
              맞춤
            </button>
            <button
              type="button"
              aria-pressed={showNumbers}
              onClick={() => setShowNumbers((value) => !value)}
              className="ml-2 rounded border border-[var(--figure-accent-line)] px-2 py-1 text-[var(--figure-accent-ink)] whitespace-nowrap"
            >
              {showNumbers ? "번호 숨기기" : "번호 보이기"}
            </button>
            <span className={styles.toolHint}>
              {tool === "select"
                ? "끌어서 이동 · 파란색 점으로 모양 조절 · 선 끝점은 Shift로 수평·수직·45° 고정"
                : tool === "pan"
                  ? "드래그로 화면 이동 · Ctrl+휠로 확대/축소"
                  : tool === "text"
                    ? "우측에서 글자를 정한 뒤 캔버스를 클릭하세요"
                    : tool === "line" || tool === "arrow"
                      ? "드래그해 그리기 · Shift로 수평·수직·45° 고정 · 놓으면 자유 이동"
                      : tool === "fill"
                        ? "선으로 둘러싸인 곳을 누르면 면을 칠합니다 · 칠한 면을 누르면 색을 바꿉니다"
                        : tool === "polygon"
                          ? "점을 차례로 찍기 · 첫 점·두 번 누르기·Enter로 닫기 · Esc로 취소"
                          : "캔버스에서 드래그해 그리세요"}
            </span>
          </div>
          <div
            ref={viewport}
            className={styles.viewport}
            style={{ cursor: tool === "pan" ? "grab" : undefined }}
            onPointerDownCapture={(e) => {
              if (e.isPrimary === false || pan.current || drag.current) return;
              if ((tool === "pan" || spaceDown.current) && e.button === 0) {
                const node = viewport.current!;
                pan.current = {
                  pointerId: e.pointerId,
                  x: e.clientX,
                  y: e.clientY,
                  offsetX: panOffset.x,
                  offsetY: panOffset.y,
                };
                node.setPointerCapture(e.pointerId);
                e.preventDefault();
                e.stopPropagation();
                surface.current?.focus({ preventScroll: true });
              }
            }}
            onPointerMove={(e) => {
              const p = pan.current;
              if (p && p.pointerId === e.pointerId) {
                setPanOffset({
                  x: p.offsetX + e.clientX - p.x,
                  y: p.offsetY + e.clientY - p.y,
                });
              }
            }}
            onPointerUp={finishPan}
            onPointerCancel={finishPan}
            onLostPointerCapture={finishPan}
          >
            <div
              ref={surface}
              tabIndex={0}
              aria-label="도형 편집 캔버스"
              aria-busy={!typeset.ready && !typeset.failed}
              className={styles.surface}
              onPointerMove={(e) => {
                if (drag.current && drag.current.pointerId !== e.pointerId)
                  return;
                move(e);
              }}
              onPointerUp={up}
              // 두 번 누르기는 여기(겉)서 받는다 — 누를 때 겉이 포인터를 잡아(setPointerCapture) 브라우저가
              // click·dblclick 을 겉에 보낸다. 안쪽 그림 칸에 두면 안 불려 글자 칸으로 못 갔다(2026-09-21 실측).
              onDoubleClick={() => {
                if (tool === "polygon" && draft) {
                  finishPolygon(draft.points);
                  return;
                }
                if (current?.type === "text") {
                  const input = document.querySelector<
                    HTMLInputElement | HTMLElement
                  >(
                    '[aria-label="선택한 도형 글자"], [aria-label="선택한 도형 글자 수식"]',
                  );
                  input?.focus();
                  if (input instanceof HTMLInputElement) input.select();
                }
              }}
              onPointerCancel={cancel}
              onLostPointerCapture={cancel}
              style={{
                width: `${fittedWidth * zoom}px`,
                aspectRatio: String(ratio),
                position: "relative",
                transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                touchAction: "none",
                background: "white",
                boxShadow: "0 1px 6px #0001",
              }}
            >
              <div
                id="figure-editor-canvas"
                ref={canvas}
                style={{
                  width: "100%",
                  height: "100%",
                  position: "relative",
                  touchAction: "none",
                  visibility: typeset.ready ? "visible" : "hidden",
                  cursor:
                    tool === "select" || tool === "pan" ? "grab" : "crosshair",
                }}
                onPointerDown={down}
                dangerouslySetInnerHTML={canvasHtml}
              />
              {!typeset.ready && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-muted"
                  role="status"
                >
                  <span>
                    {typeset.failed
                      ? "도형 표시를 준비하지 못했습니다."
                      : "도형 준비 중…"}
                  </span>
                  {typeset.failed && (
                    <button
                      type="button"
                      className="rounded border border-control px-3 py-2"
                      onClick={() => {
                        setTypeset((previous) => ({
                          ...previous,
                          failed: false,
                        }));
                        setError("");
                        setTypesetAttempt((attempt) => attempt + 1);
                      }}
                    >
                      도형 표시 다시 시도
                    </button>
                  )}
                </div>
              )}
              {sourceOverlay && original && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <img
                    src={original}
                    alt="원본 겹쳐 보기"
                    data-source-overlay-scale={sourceOverlayScale}
                    className="h-full w-full object-contain opacity-25 transition-transform duration-150"
                    style={{
                      transform: `scale(${sourceOverlayScale})`,
                      transformOrigin: "center center",
                    }}
                  />
                </div>
              )}
              {typeset.ready &&
                groupBounds &&
                selectedIds.length > 1 &&
                tool === "select" && (
                  <FigureGroupOverlay
                    bounds={groupBounds}
                    viewBox={viewBox}
                    name={
                      selectedGroup
                        ? `${selectedGroup.name} 묶음`
                        : `${selectedIds.length}개 요소`
                    }
                    busy={busy}
                    onPointerDown={groupDown}
                  />
                )}
              {showNumbers && typeset.ready && (
                <FigureNumberLayer
                  numbers={objectNumbers}
                  selectedIds={selectedIds}
                  onPick={pickGroup}
                />
              )}
              {selection && selected && tool === "select" && (
                <FigureSelectionOverlay
                  selection={selection}
                  handles={handles}
                  currentType={current?.type}
                  viewBox={viewBox}
                  busy={busy}
                  // 선을 따라가는 면은 크기 조절점도 없다(모양은 선이 정한다).
                  sizeLocked={currentLocked || currentTied}
                  onHandleDown={handleDown}
                />
              )}
              {tool === "polygon" && draft && (
                <FigurePolygonDraft
                  viewBox={viewBox}
                  points={draft.points}
                  hover={draft.hover}
                  snapped={draft.snapped}
                  scale={draft.scale}
                  fill={faceColor}
                />
              )}
            </div>
          </div>
          <section className={styles.objectList} aria-label="도형 요소 목록">
            <div className="mb-1.5 flex items-center gap-2 text-xs">
              <h3 className="font-semibold">요소 목록</h3>
              <span className="text-muted">
                {objects.length}개 ·{" "}
                {selectedIds.length
                  ? `${selectedIds.length}개 선택`
                  : "Shift+클릭으로 여러 요소 선택"}
              </span>
              <span
                role="status"
                className="ml-auto text-[var(--figure-accent-ink)]"
              >
                {clipboardNotice}
              </span>
              <button
                type="button"
                title="선택한 요소를 새 묶음으로 — 이름을 붙일 수 있습니다 (Ctrl+G)"
                onClick={() => makeGroup()}
                disabled={selectedIds.length < 2 || busy}
                className="rounded border border-[var(--figure-accent-line)] px-2 py-0.5 text-[var(--figure-accent-ink)] disabled:opacity-40"
              >
                묶음 만들기
              </button>
            </div>
            <FigureObjectList
              objects={listed}
              numbers={numbers}
              groups={groups}
              angles={angles}
              selectedIds={selectedIds}
              onPick={pick}
              onPickGroup={pickGroup}
              onAssign={assignGroup}
            />
          </section>
        </div>
        <aside
          className={styles.properties}
          onPointerDownCapture={() => {
            if (document.activeElement === surface.current)
              surface.current?.blur();
          }}
        >
          <fieldset
            disabled={busy}
            className="flex-1 min-h-0 min-w-0 overflow-y-auto p-4"
          >
            <h3 className="text-sm font-semibold mb-1">
              {selectedIds.length > 1
                ? `${selectedIds.length}개 요소 선택`
                : current
                  ? `${numbers.get(current.id)} · ${objectName(current, angles)} 편집`
                  : tool === "text"
                    ? "새 글자"
                    : tool === "fill"
                      ? "채우기"
                      : tool === "polygon"
                        ? "다각형(면)"
                        : "상세 편집"}
            </h3>
            <p className="mb-3 text-xs text-muted">
              {selectedIds.length > 1
                ? "선택한 요소의 서식을 한꺼번에 바꿉니다. 그림에서 함께 끌어 옮길 수도 있습니다."
                : current
                  ? "선택한 요소의 모양과 표시를 바꿉니다."
                  : tool === "text"
                    ? "내용을 정한 다음 그림에서 놓을 위치를 클릭하세요."
                    : tool === "fill"
                      ? "선으로 둘러싸인 곳을 누르면 그 안이 면으로 칠해집니다. 칠한 면을 누르면 이 색으로 바뀝니다."
                      : tool === "polygon"
                        ? "점을 차례로 찍어 면을 만듭니다. 첫 점을 다시 누르거나 두 번 누르기·Enter 로 닫고, Esc 로 취소합니다. 선의 끝점·꼭짓점·교점에 달라붙습니다."
                        : "그림에서 수정할 요소를 선택하세요."}
            </p>
            {selectedGroup && (
              <FigureGroupRow
                group={selectedGroup}
                focus={renamingGroup === selectedGroup.key}
                onFocused={clearRenaming}
                onAssign={assignGroup}
              />
            )}
            {/* 요소의 내용(함수식·글자)과 안내는 무리 밖 — 접어도 늘 보인다(더블클릭하면 글자 칸으로 간다). */}
            {current ? (
              <div className="mb-3 space-y-3 text-xs">
                {currentFunction && (
                  // 함수식·범위를 바꾸면 곡선 모양이 바뀐다 — 크기 고정이면 통째로 막는다.
                  <fieldset
                    disabled={currentLocked}
                    className="min-w-0 disabled:opacity-40"
                  >
                    <FunctionGraphInput
                      key={current.id}
                      initial={currentFunction}
                      editing
                      viewBox={
                        current.attrs["data-function-viewbox"]
                          ?.split(" ")
                          .map(Number) ?? viewBox
                      }
                      onApply={(config, result) =>
                        change({
                          d: result.path,
                          "data-function": JSON.stringify(config),
                        })
                      }
                    />
                  </fieldset>
                )}
                <p className="rounded bg-[var(--figure-accent-soft)] p-2 leading-relaxed text-[var(--figure-accent-ink)]">
                  {current.type === "text"
                    ? "글자를 끌어서 옮기세요. 더블클릭하면 내용을 바꿀 수 있습니다."
                    : currentTied
                      ? "면은 둘러싼 선을 따라갑니다. 선을 옮기면 같이 바뀝니다."
                      : currentLocked
                        ? "크기가 고정되어 있습니다. 선이나 테두리를 끌면 통째로 이동합니다."
                        : currentAdjustable
                          ? "파란색 조절점으로 크기를, 노란 점으로 모양을 바꾸세요. 선이나 테두리를 끌면 통째로 이동합니다."
                          : "파란색 조절점을 끌어 모양을 바꾸세요. 선이나 테두리를 끌면 통째로 이동합니다."}
                </p>
                {current.type === "text" && (
                  <div>
                    <span className="mb-1.5 block font-medium">글자 내용</span>
                    <FigureLabelInput
                      key={current.id}
                      idPrefix="선택한 도형 글자"
                      value={current.attrs["data-mj"] ?? current.text}
                      onChange={(value) => change({}, value)}
                      symbolGroup={symbolGroup}
                      onSymbolGroup={setSymbolGroup}
                    />
                  </div>
                )}
              </div>
            ) : addingFunction ? (
              <FunctionGraphInput
                viewBox={viewBox}
                onApply={(_config, result) => {
                  const pasted = pasteFigureSelection(svg, result.svg, 0);
                  if (pasted) {
                    commit(pasted.svg);
                    setSelected(pasted.ids.at(-1)!);
                    setAddingFunction(false);
                  }
                }}
              />
            ) : tool === "text" ? (
              <FigureLabelInput
                idPrefix="추가할 도형 글자"
                value={label}
                onChange={setLabel}
                symbolGroup={symbolGroup}
                onSymbolGroup={setSymbolGroup}
              />
            ) : tool === "fill" || tool === "polygon" ? (
              <label className="flex items-center justify-between text-xs">
                면 채우기 색
                <input
                  type="color"
                  aria-label="면 채우기 색"
                  value={faceColor}
                  onChange={(e) => setFaceColor(e.target.value)}
                />
              </label>
            ) : selectedIds.length > 1 ? null : (
              <div className="rounded-lg border border-dashed border-control p-4 text-center text-xs leading-relaxed text-muted">
                캔버스의 선, 곡선, 글자를 클릭하면
                <br />
                여기에 편집 항목이 나타납니다.
              </div>
            )}
            {/* 오른쪽 칸 무리 셋 — 원장님 2026-09-21 확정 «안 D — 접는 무리»(시안 wire-t43-figure-panel.html D).
                배치·모양은 펼쳐 두고 틀·세부만 처음부터 접는다. 접은 상태는 편집기를 연 동안 기억한다. */}
            {selectedIds.length > 0 && (
              <FigurePanelFold
                name="배치"
                summary={arrangeSummary(false)}
                open={folds.배치}
                onToggle={() => toggleFold("배치")}
              >
                <FigureRotateRow
                  blocked={rotateBlocked}
                  onRotate={rotate}
                  mirror={{ blocked: mirrorBlocked, onMirror: mirror }}
                />
                <FigureAlignRow
                  blocked={alignBlocked}
                  onAlign={align}
                  spread={{ blocked: spreadBlocked, onSpread: spread }}
                />
                <FigureOrderRow blocked={orderBlocked} onOrder={reorder} />
              </FigurePanelFold>
            )}
            {current ? (
              <FigurePanelFold
                name="모양"
                summary={shapeSummary(current)}
                open={folds.모양}
                onToggle={() => toggleFold("모양")}
              >
                <div className="space-y-3 text-xs">
                  {current.type === "text" && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        aria-pressed={currentItalic}
                        className={formatToggleClass(currentItalic)}
                        onClick={() =>
                          change({
                            "font-style": currentItalic ? "normal" : "italic",
                          })
                        }
                      >
                        기울임
                      </button>
                      <button
                        type="button"
                        aria-pressed={currentBold}
                        className={`${formatToggleClass(currentBold)} font-bold`}
                        onClick={() =>
                          change({
                            "font-weight": currentBold ? "normal" : "bold",
                          })
                        }
                      >
                        굵게
                      </button>
                    </div>
                  )}
                  {/* 면은 선이 없다 — 선 색·선 두께·점선 칸을 두지 않는다. */}
                  {!currentFace && (
                    <label className="flex items-center justify-between">
                      {current.type === "text" ? "글자 색" : "선 색"}
                      <input
                        type="color"
                        aria-label="도형 선 색"
                        value={
                          /^#[\da-f]{6}$/i.test(
                            current.attrs[
                              current.type === "text" ? "fill" : "stroke"
                            ] ?? "",
                          )
                            ? current.attrs[
                                current.type === "text" ? "fill" : "stroke"
                              ]
                            : "#111111"
                        }
                        onChange={(e) =>
                          change({
                            [current.type === "text" ? "fill" : "stroke"]:
                              e.target.value,
                          })
                        }
                      />
                    </label>
                  )}
                  {current.type === "text" && (
                    // 글자 배경색 — 도형의 «채우기 [없애기][색]»과 같은 한 줄(원장님 2026-09-19 · 2026-09-21 «안 D»).
                    <div
                      data-fill-row=""
                      className="flex items-center justify-between"
                    >
                      배경색
                      <span className="flex items-center gap-2.5">
                        <button
                          type="button"
                          aria-label="배경 없애기"
                          disabled={!hexColor(current.attrs[TEXT_BG_ATTR])}
                          onClick={() => change({ [TEXT_BG_ATTR]: "" })}
                          className="underline text-muted disabled:opacity-40"
                        >
                          없애기
                        </button>
                        <ColorInput
                          aria-label="글자 배경색"
                          none={!hexColor(current.attrs[TEXT_BG_ATTR])}
                          value={
                            hexColor(current.attrs[TEXT_BG_ATTR]) ?? "#ffffff"
                          }
                          onChange={(e) =>
                            change({ [TEXT_BG_ATTR]: e.target.value })
                          }
                        />
                      </span>
                    </div>
                  )}
                  {!currentFace && (
                    <label className="block">
                      <span className="flex justify-between">
                        {current.type === "text" ? "글자 크기" : "선 두께"}
                        <output>
                          {parseFloat(
                            current.attrs[
                              current.type === "text"
                                ? "font-size"
                                : "stroke-width"
                            ] ?? (current.type === "text" ? "18" : "1.5"),
                          )}
                        </output>
                      </span>
                      <input
                        type="range"
                        min={current.type === "text" ? 6 : 0.2}
                        max={current.type === "text" ? 100 : 20}
                        step={0.2}
                        aria-label="도형 선 두께 또는 글자 크기"
                        value={parseFloat(
                          current.attrs[
                            current.type === "text"
                              ? "font-size"
                              : "stroke-width"
                          ] ?? (current.type === "text" ? "18" : "1.5"),
                        )}
                        onChange={(e) => {
                          if (+e.target.value > 0)
                            change({
                              [current.type === "text"
                                ? "font-size"
                                : "stroke-width"]: e.target.value,
                            });
                        }}
                        className="mt-2 w-full accent-[var(--figure-primary)]"
                      />
                    </label>
                  )}
                  {current.type !== "text" && (
                    <>
                      {!currentFace && (
                        <label className="flex gap-2">
                          <input
                            type="checkbox"
                            checked={
                              !!current.attrs["stroke-dasharray"] &&
                              current.attrs["stroke-dasharray"] !== "none"
                            }
                            onChange={(e) =>
                              change({
                                "stroke-dasharray": e.target.checked
                                  ? "5 4"
                                  : "",
                              })
                            }
                          />
                          점선
                        </label>
                      )}
                      {midLabelTarget(current) && (
                        <div
                          data-mid-label-row=""
                          className="flex items-center gap-2"
                        >
                          <input
                            type="text"
                            aria-label="가운데 글자 내용"
                            placeholder="예: 9 cm"
                            value={midLabel}
                            onChange={(e) => setMidLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                !e.nativeEvent.isComposing
                              ) {
                                e.preventDefault();
                                addMiddleLabel();
                              }
                            }}
                            className="min-w-0 flex-1 rounded border border-control px-2 py-1"
                            spellCheck={false}
                          />
                          <button
                            type="button"
                            disabled={!midLabel.trim()}
                            onClick={addMiddleLabel}
                            className={`${formatToggleClass(false)} shrink-0 disabled:opacity-40`}
                          >
                            가운데 글자
                          </button>
                        </div>
                      )}
                      <div
                        data-fill-row=""
                        className="flex items-center justify-between"
                      >
                        채우기
                        <span className="flex items-center gap-2.5">
                          {currentFace ? (
                            // 채우기를 없앤 면은 보이지 않는 번호만 남는다 — 면은 지운다.
                            <button
                              type="button"
                              onClick={remove}
                              className="underline text-muted"
                            >
                              면 지우기
                            </button>
                          ) : (
                            <button
                              type="button"
                              aria-label="채우기 없애기"
                              disabled={noFill(current.attrs.fill)}
                              onClick={() => change({ fill: "none" })}
                              className="underline text-muted disabled:opacity-40"
                            >
                              없애기
                            </button>
                          )}
                          <ColorInput
                            aria-label="도형 채우기 색"
                            none={noFill(current.attrs.fill)}
                            value={
                              /^#[\da-f]{6}$/i.test(current.attrs.fill ?? "")
                                ? current.attrs.fill
                                : "#ffffff"
                            }
                            onChange={(e) => change({ fill: e.target.value })}
                          />
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </FigurePanelFold>
            ) : selectedIds.length > 1 ? (
              <FigurePanelFold
                name="모양"
                summary={commonSummary(
                  objects.filter((o) => selectedIds.includes(o.id)),
                )}
                open={folds.모양}
                onToggle={() => toggleFold("모양")}
              >
                <FigureCommonFormat
                  objects={objects.filter((o) => selectedIds.includes(o.id))}
                  onChange={(ids, attrs) =>
                    commit(editFigureObjects(svg, ids, attrs))
                  }
                  innerFill={
                    innerFill && {
                      ...innerFill,
                      onFill: (color) =>
                        commit(setInnerFill(svg, selectedIds, color)),
                      onClear: () => commit(clearInnerFill(svg, selectedIds)),
                    }
                  }
                />
              </FigurePanelFold>
            ) : null}
            <FigurePanelFold
              name="틀 · 세부"
              summary={detailSummary(!!current)}
              open={folds["틀 · 세부"]}
              onToggle={() => toggleFold("틀 · 세부")}
            >
              <div className="space-y-3 text-xs">
                <FigureFitRow onFit={fitFrame} />
                {current && (
                  <>
                    <label className="flex gap-2">
                      <input
                        type="checkbox"
                        checked={currentLocked}
                        onChange={(e) =>
                          change(sizeLockValue(e.target.checked))
                        }
                      />
                      요소 크기 고정 (이동만 가능)
                    </label>
                    <details className="border-t border-control pt-2">
                      <summary className="cursor-pointer text-muted">
                        정밀 수치 조정
                      </summary>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {Object.entries(FIELD_NAMES)
                          .filter(([key]) => key in current.attrs)
                          .map(([key, name]) => (
                            <label key={key}>
                              {name}
                              <input
                                type="number"
                                step={1}
                                value={
                                  Number.parseFloat(current.attrs[key]) || 0
                                }
                                aria-label={name}
                                disabled={
                                  currentLocked && isShapeAttr(current, key)
                                }
                                onChange={(e) => {
                                  if (
                                    e.target.value !== "" &&
                                    Number.isFinite(+e.target.value)
                                  )
                                    change({ [key]: e.target.value });
                                }}
                                className="w-full border border-control rounded px-1 py-1 mt-1 disabled:opacity-40"
                              />
                            </label>
                          ))}
                      </div>
                      <div className="flex gap-1">
                        {[
                          ["←", -1, 0],
                          ["↑", 0, -1],
                          ["↓", 0, 1],
                          ["→", 1, 0],
                        ].map(([name, x, y]) => (
                          <button
                            type="button"
                            key={name}
                            aria-label={`도형 ${name} 미세 이동`}
                            onClick={() =>
                              change({
                                transform: `translate(${x} ${y}) ${current.attrs.transform ?? ""}`,
                              })
                            }
                            className="border border-control rounded px-2 py-1"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                      {curvePoints?.length === 6 && (
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            "시작 X",
                            "시작 Y",
                            "휘어짐 X",
                            "휘어짐 Y",
                            "끝 X",
                            "끝 Y",
                          ].map((name, index) => (
                            <label key={name}>
                              {name}
                              <input
                                type="number"
                                value={curvePoints[index]}
                                disabled={currentLocked}
                                className="w-full border border-control rounded px-1 py-1 disabled:opacity-40"
                                onChange={(e) => {
                                  if (e.target.value === "") return;
                                  const points = [...curvePoints];
                                  points[index] = Number(e.target.value);
                                  change({
                                    d: `M ${points[0]} ${points[1]} Q ${points[2]} ${points[3]} ${points[4]} ${points[5]}`,
                                  });
                                }}
                              />
                            </label>
                          ))}
                        </div>
                      )}
                    </details>
                  </>
                )}
              </div>
            </FigurePanelFold>
          </fieldset>
        </aside>
      </div>
    </ModalShell>,
    document.body,
  );
}
